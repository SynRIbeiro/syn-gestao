-- =============================================================================
-- 001_initial_schema.sql
-- Schema inicial do sistema syn-gestão
-- Execute em um projeto Supabase vazio via SQL Editor ou CLI.
-- Auditado em 2026-06-17.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- SCHEMA PRIVADO
-- Funções auxiliares ficam em "private" para não serem expostas pela API REST.
-- O schema "extensions" (uuid-ossp, pgcrypto etc.) já existe no Supabase.
-- ---------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;

-- ---------------------------------------------------------------------------
-- FUNÇÃO: atualiza updated_at automaticamente
-- SECURITY DEFINER: roda como owner (postgres) para compatibilidade com RLS.
-- REVOKE FROM PUBLIC: trigger functions não precisam de EXECUTE por usuários.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = private, public, pg_catalog
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.set_updated_at() FROM PUBLIC;

-- ---------------------------------------------------------------------------
-- FUNÇÃO: retorna empresa_id e papel do usuário autenticado
--
-- SECURITY DEFINER: o owner é "postgres" (role com BYPASSRLS no Supabase),
-- portanto a consulta em public.perfis ocorre SEM passar pelas políticas RLS
-- dessa tabela — eliminando qualquer risco de recursão infinita.
--
-- STABLE: PostgreSQL pode avaliar a função uma única vez por query e reusar
-- o resultado em vez de chamá-la a cada linha — crucial em políticas RLS.
--
-- Quando o usuário não tem perfil ativo, ambos os campos retornam NULL, o que
-- faz todas as comparações de política falharem (comportamento seguro).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.get_perfil_atual(
  OUT p_empresa_id uuid,
  OUT p_papel       text
)
RETURNS RECORD
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = private, public, pg_catalog
AS $$
BEGIN
  SELECT empresa_id, papel
    INTO p_empresa_id, p_papel
    FROM public.perfis
   WHERE id = auth.uid()
     AND ativo = true
   LIMIT 1;
END;
$$;

-- Apenas o role authenticated pode executar; anônimos não têm acesso.
REVOKE ALL ON FUNCTION private.get_perfil_atual() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.get_perfil_atual() TO authenticated;

-- ---------------------------------------------------------------------------
-- FUNÇÃO: força created_by = auth.uid() em todo INSERT
--
-- Impede que um usuário forje a autoria inserindo o UUID de outra pessoa.
-- Se auth.uid() for NULL (contexto server-side), created_by fica NULL, o
-- que é aceitável porque a coluna é nullable.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.set_created_by()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = private, public, pg_catalog
AS $$
BEGIN
  NEW.created_by = auth.uid();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.set_created_by() FROM PUBLIC;

-- ---------------------------------------------------------------------------
-- FUNÇÃO: impede que usuários não-administradores alterem papel ou empresa_id
-- no próprio perfil.
--
-- Sem esta proteção, o RLS de "perfis_update_proprio" (USING id = auth.uid())
-- permitiria que qualquer usuário fizesse UPDATE no próprio registro e mudasse
-- papel para 'administrador' (escalada de privilégio) ou empresa_id para outra
-- empresa (violação de isolamento).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.prevent_perfil_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = private, public, pg_catalog
AS $$
DECLARE
  caller_papel text;
BEGIN
  -- Obtém o papel atual de quem está fazendo a chamada
  SELECT papel INTO caller_papel
    FROM public.perfis
   WHERE id = auth.uid()
   LIMIT 1;

  -- Não-administradores não podem alterar papel
  IF caller_papel IS DISTINCT FROM 'administrador' THEN
    IF NEW.papel IS DISTINCT FROM OLD.papel THEN
      RAISE EXCEPTION 'Operação não permitida: somente administradores podem alterar o papel de um perfil.';
    END IF;
    -- Não-administradores não podem trocar de empresa
    IF NEW.empresa_id IS DISTINCT FROM OLD.empresa_id THEN
      RAISE EXCEPTION 'Operação não permitida: somente administradores podem alterar a empresa de um perfil.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.prevent_perfil_escalation() FROM PUBLIC;

-- =============================================================================
-- TABELAS
-- =============================================================================

-- ---------------------------------------------------------------------------
-- TABELA: empresas
-- ---------------------------------------------------------------------------
CREATE TABLE public.empresas (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  nome           text        NOT NULL,
  nome_fantasia  text,
  cnpj           text,
  telefone       text,
  email          text,
  logo_url       text,
  cor_principal  text,
  ativo          boolean     NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_empresas_updated_at
  BEFORE UPDATE ON public.empresas
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

-- ---------------------------------------------------------------------------
-- TABELA: perfis
-- Espelha auth.users(id) — criado manualmente ou via trigger de auth.
-- empresa_id nullable: permite criar o perfil antes de vincular a empresa.
-- ---------------------------------------------------------------------------
CREATE TABLE public.perfis (
  id          uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id  uuid        REFERENCES public.empresas(id) ON DELETE SET NULL,
  nome        text        NOT NULL,
  email       text,
  cargo       text,
  papel       text        NOT NULL DEFAULT 'visualizador'
                          CHECK (papel IN ('administrador', 'financeiro', 'comercial', 'visualizador')),
  ativo       boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Índice composto usado pela função private.get_perfil_atual()
CREATE INDEX idx_perfis_id_ativo    ON public.perfis(id, ativo);
CREATE INDEX idx_perfis_empresa_id  ON public.perfis(empresa_id);

CREATE TRIGGER trg_perfis_updated_at
  BEFORE UPDATE ON public.perfis
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

-- Impede escalada de privilégio (papel) e troca de empresa por não-admins.
-- Deve ser BEFORE UPDATE para poder inspecionar OLD e NEW.
CREATE TRIGGER trg_perfis_prevent_escalation
  BEFORE UPDATE ON public.perfis
  FOR EACH ROW EXECUTE FUNCTION private.prevent_perfil_escalation();

-- ---------------------------------------------------------------------------
-- TABELA: categorias
-- ---------------------------------------------------------------------------
CREATE TABLE public.categorias (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id  uuid        NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome        text        NOT NULL,
  tipo        text        NOT NULL DEFAULT 'ambos'
                          CHECK (tipo IN ('entrada', 'saida', 'ambos')),
  ativo       boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_categorias_empresa_id ON public.categorias(empresa_id);

CREATE TRIGGER trg_categorias_updated_at
  BEFORE UPDATE ON public.categorias
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

-- ---------------------------------------------------------------------------
-- TABELA: centros_custo
-- ---------------------------------------------------------------------------
CREATE TABLE public.centros_custo (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id  uuid        NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome        text        NOT NULL,
  descricao   text,
  ativo       boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_centros_custo_empresa_id ON public.centros_custo(empresa_id);

CREATE TRIGGER trg_centros_custo_updated_at
  BEFORE UPDATE ON public.centros_custo
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

-- ---------------------------------------------------------------------------
-- TABELA: contas_bancarias
-- ---------------------------------------------------------------------------
CREATE TABLE public.contas_bancarias (
  id             uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id     uuid           NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome           text           NOT NULL,
  banco          text,
  agencia        text,
  conta          text,
  saldo_inicial  numeric(14,2)  NOT NULL DEFAULT 0
                                CHECK (saldo_inicial >= 0),
  ativo          boolean        NOT NULL DEFAULT true,
  created_at     timestamptz    NOT NULL DEFAULT now(),
  updated_at     timestamptz    NOT NULL DEFAULT now()
);

CREATE INDEX idx_contas_bancarias_empresa_id ON public.contas_bancarias(empresa_id);

CREATE TRIGGER trg_contas_bancarias_updated_at
  BEFORE UPDATE ON public.contas_bancarias
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

-- ---------------------------------------------------------------------------
-- TABELA: clientes
-- ---------------------------------------------------------------------------
CREATE TABLE public.clientes (
  id             uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id     uuid           NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome           text           NOT NULL,
  nome_fantasia  text,
  cpf_cnpj       text,
  telefone       text,
  whatsapp       text,
  email          text,
  endereco       text,
  valor_mensal   numeric(14,2)  CHECK (valor_mensal IS NULL OR valor_mensal >= 0),
  data_inicio    date,
  status         text           NOT NULL DEFAULT 'ativo'
                                CHECK (status IN ('ativo', 'inativo', 'negociacao', 'inadimplente')),
  observacoes    text,
  created_by     uuid           REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     timestamptz    NOT NULL DEFAULT now(),
  updated_at     timestamptz    NOT NULL DEFAULT now()
);

CREATE INDEX idx_clientes_empresa_id ON public.clientes(empresa_id);
CREATE INDEX idx_clientes_status     ON public.clientes(status);

CREATE TRIGGER trg_clientes_updated_at
  BEFORE UPDATE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

-- Garante que created_by sempre reflete o usuário autenticado real.
CREATE TRIGGER trg_clientes_set_created_by
  BEFORE INSERT ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION private.set_created_by();

-- ---------------------------------------------------------------------------
-- TABELA: servicos
-- ---------------------------------------------------------------------------
CREATE TABLE public.servicos (
  id              uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id      uuid           NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome            text           NOT NULL,
  descricao       text,
  categoria       text,
  valor_venda     numeric(14,2)  CHECK (valor_venda IS NULL OR valor_venda >= 0),
  custo_estimado  numeric(14,2)  CHECK (custo_estimado IS NULL OR custo_estimado >= 0),
  recorrente      boolean        NOT NULL DEFAULT false,
  ativo           boolean        NOT NULL DEFAULT true,
  created_by      uuid           REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz    NOT NULL DEFAULT now(),
  updated_at      timestamptz    NOT NULL DEFAULT now()
);

CREATE INDEX idx_servicos_empresa_id ON public.servicos(empresa_id);

CREATE TRIGGER trg_servicos_updated_at
  BEFORE UPDATE ON public.servicos
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

CREATE TRIGGER trg_servicos_set_created_by
  BEFORE INSERT ON public.servicos
  FOR EACH ROW EXECUTE FUNCTION private.set_created_by();

-- ---------------------------------------------------------------------------
-- TABELA: entradas
-- ---------------------------------------------------------------------------
CREATE TABLE public.entradas (
  id                  uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id          uuid           NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  cliente_id          uuid           REFERENCES public.clientes(id) ON DELETE SET NULL,
  servico_id          uuid           REFERENCES public.servicos(id) ON DELETE SET NULL,
  categoria_id        uuid           REFERENCES public.categorias(id) ON DELETE SET NULL,
  conta_bancaria_id   uuid           REFERENCES public.contas_bancarias(id) ON DELETE SET NULL,
  descricao           text           NOT NULL,
  valor               numeric(14,2)  NOT NULL CHECK (valor > 0),
  data_recebimento    date,
  data_vencimento     date,
  forma_pagamento     text,
  status              text           NOT NULL DEFAULT 'pendente'
                                     CHECK (status IN ('recebido', 'pendente', 'atrasado')),
  recorrente          boolean        NOT NULL DEFAULT false,
  periodicidade       text,
  observacoes         text,
  created_by          uuid           REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          timestamptz    NOT NULL DEFAULT now(),
  updated_at          timestamptz    NOT NULL DEFAULT now()
);

CREATE INDEX idx_entradas_empresa_id       ON public.entradas(empresa_id);
CREATE INDEX idx_entradas_status           ON public.entradas(status);
CREATE INDEX idx_entradas_data_vencimento  ON public.entradas(data_vencimento);
CREATE INDEX idx_entradas_cliente_id       ON public.entradas(cliente_id);
CREATE INDEX idx_entradas_servico_id       ON public.entradas(servico_id);
CREATE INDEX idx_entradas_categoria_id     ON public.entradas(categoria_id);
CREATE INDEX idx_entradas_conta_bancaria_id ON public.entradas(conta_bancaria_id);

CREATE TRIGGER trg_entradas_updated_at
  BEFORE UPDATE ON public.entradas
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

CREATE TRIGGER trg_entradas_set_created_by
  BEFORE INSERT ON public.entradas
  FOR EACH ROW EXECUTE FUNCTION private.set_created_by();

-- ---------------------------------------------------------------------------
-- TABELA: saidas
-- ---------------------------------------------------------------------------
CREATE TABLE public.saidas (
  id                 uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id         uuid           NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  categoria_id       uuid           REFERENCES public.categorias(id) ON DELETE SET NULL,
  centro_custo_id    uuid           REFERENCES public.centros_custo(id) ON DELETE SET NULL,
  conta_bancaria_id  uuid           REFERENCES public.contas_bancarias(id) ON DELETE SET NULL,
  fornecedor         text,
  descricao          text           NOT NULL,
  valor              numeric(14,2)  NOT NULL CHECK (valor > 0),
  data_pagamento     date,
  data_vencimento    date,
  forma_pagamento    text,
  status             text           NOT NULL DEFAULT 'pendente'
                                    CHECK (status IN ('pago', 'pendente', 'atrasado')),
  recorrente         boolean        NOT NULL DEFAULT false,
  periodicidade      text,
  observacoes        text,
  created_by         uuid           REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at         timestamptz    NOT NULL DEFAULT now(),
  updated_at         timestamptz    NOT NULL DEFAULT now()
);

CREATE INDEX idx_saidas_empresa_id        ON public.saidas(empresa_id);
CREATE INDEX idx_saidas_status            ON public.saidas(status);
CREATE INDEX idx_saidas_data_vencimento   ON public.saidas(data_vencimento);
CREATE INDEX idx_saidas_centro_custo_id   ON public.saidas(centro_custo_id);
CREATE INDEX idx_saidas_categoria_id      ON public.saidas(categoria_id);
CREATE INDEX idx_saidas_conta_bancaria_id ON public.saidas(conta_bancaria_id);

CREATE TRIGGER trg_saidas_updated_at
  BEFORE UPDATE ON public.saidas
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

CREATE TRIGGER trg_saidas_set_created_by
  BEFORE INSERT ON public.saidas
  FOR EACH ROW EXECUTE FUNCTION private.set_created_by();

-- ---------------------------------------------------------------------------
-- TABELA: investimentos
-- ---------------------------------------------------------------------------
CREATE TABLE public.investimentos (
  id               uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id       uuid           NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome             text           NOT NULL,
  categoria        text,
  valor_investido  numeric(14,2)  NOT NULL CHECK (valor_investido >= 0),
  receita_gerada   numeric(14,2)  CHECK (receita_gerada IS NULL OR receita_gerada >= 0),
  data_inicial     date,
  data_final       date,
  status           text,
  observacoes      text,
  created_by       uuid           REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       timestamptz    NOT NULL DEFAULT now(),
  updated_at       timestamptz    NOT NULL DEFAULT now()
);

CREATE INDEX idx_investimentos_empresa_id ON public.investimentos(empresa_id);

CREATE TRIGGER trg_investimentos_updated_at
  BEFORE UPDATE ON public.investimentos
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

CREATE TRIGGER trg_investimentos_set_created_by
  BEFORE INSERT ON public.investimentos
  FOR EACH ROW EXECUTE FUNCTION private.set_created_by();

-- ---------------------------------------------------------------------------
-- TABELA: anexos (sem updated_at — arquivos são imutáveis após upload)
-- ---------------------------------------------------------------------------
CREATE TABLE public.anexos (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id      uuid        NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  entidade_tipo   text,
  entidade_id     uuid,
  nome_arquivo    text,
  caminho_arquivo text,
  tipo_arquivo    text,
  created_by      uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_anexos_empresa_id  ON public.anexos(empresa_id);
CREATE INDEX idx_anexos_entidade_id ON public.anexos(entidade_id);

CREATE TRIGGER trg_anexos_set_created_by
  BEFORE INSERT ON public.anexos
  FOR EACH ROW EXECUTE FUNCTION private.set_created_by();

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================
-- Estratégia:
--
--   1. SECURITY DEFINER bypass: private.get_perfil_atual() roda como "postgres"
--      (BYPASSRLS), consultando public.perfis sem acionar as políticas dessa
--      tabela — eliminando recursão.
--
--   2. STABLE caching: a função é avaliada uma vez por query, não por linha.
--
--   3. Políticas da tabela "perfis" usam auth.uid() diretamente para SELECT/
--      UPDATE do próprio registro, sem chamar get_perfil_atual() — zero risco
--      de recursão. Administradores usam get_perfil_atual() para ver a empresa.
--
--   4. FOR ALL sem WITH CHECK explícito: o PostgreSQL usa a expressão USING como
--      WITH CHECK por padrão. Para operações críticas (empresas) o WITH CHECK é
--      declarado explicitamente para deixar a intenção clara no código.
--
--   5. Isolamento de empresa: empresa_id é validado em USING e WITH CHECK,
--      impedindo que um usuário insira ou mova dados para outra empresa.
--
--   6. Nenhuma política usa USING (true) ou TO anon/PUBLIC.
--
--   7. Escalada de privilégio em perfis bloqueada pelo trigger
--      trg_perfis_prevent_escalation (camada de defesa adicional).
--
-- Papéis e permissões:
--   administrador → CRUD completo em tudo da própria empresa
--   financeiro    → CRUD em dados financeiros (entradas, saídas, contas, etc.)
--                   SELECT em clientes, serviços, empresa, perfis
--   comercial     → CRUD em clientes, serviços, anexos
--                   SELECT em dados financeiros
--   visualizador  → SELECT em tudo (sem INSERT/UPDATE/DELETE)
-- =============================================================================

ALTER TABLE public.empresas         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfis           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.centros_custo    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contas_bancarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servicos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entradas         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saidas           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investimentos    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anexos           ENABLE ROW LEVEL SECURITY;

-- ─── EMPRESAS ────────────────────────────────────────────────────────────────

CREATE POLICY "empresas_select" ON public.empresas
  FOR SELECT TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND id = (SELECT p_empresa_id FROM private.get_perfil_atual())
  );

-- WITH CHECK explícito: garante que o admin não possa mover o registro para
-- outro id durante um UPDATE (id é PK, mas a intenção fica documentada).
CREATE POLICY "empresas_update_admin" ON public.empresas
  FOR UPDATE TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND id = (SELECT p_empresa_id FROM private.get_perfil_atual())
    AND (SELECT p_papel FROM private.get_perfil_atual()) = 'administrador'
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND id = (SELECT p_empresa_id FROM private.get_perfil_atual())
    AND (SELECT p_papel FROM private.get_perfil_atual()) = 'administrador'
  );

-- ─── PERFIS ──────────────────────────────────────────────────────────────────
-- SELECT do próprio perfil: usa auth.uid() direto — sem chamar get_perfil_atual().
-- Essa é a única forma de o usuário descobrir sua empresa e papel sem recursão.

CREATE POLICY "perfis_select_proprio" ON public.perfis
  FOR SELECT TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND id = auth.uid()
  );

-- Administradores veem todos os perfis da própria empresa.
-- get_perfil_atual() é segura aqui porque "perfis_select_proprio" já garante
-- que o admin consegue ler o seu próprio perfil antes de qualquer outra leitura.
CREATE POLICY "perfis_select_admin" ON public.perfis
  FOR SELECT TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND empresa_id = (SELECT p_empresa_id FROM private.get_perfil_atual())
    AND (SELECT p_papel FROM private.get_perfil_atual()) = 'administrador'
  );

-- Usuário pode atualizar dados do próprio perfil (nome, email, cargo).
-- papel e empresa_id são protegidos pelo trigger trg_perfis_prevent_escalation.
CREATE POLICY "perfis_update_proprio" ON public.perfis
  FOR UPDATE TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND id = auth.uid()
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND id = auth.uid()
  );

-- Administradores gerenciam todos os perfis da empresa (INSERT, UPDATE, DELETE).
CREATE POLICY "perfis_manage_admin" ON public.perfis
  FOR ALL TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND empresa_id = (SELECT p_empresa_id FROM private.get_perfil_atual())
    AND (SELECT p_papel FROM private.get_perfil_atual()) = 'administrador'
  );

-- ─── CATEGORIAS ──────────────────────────────────────────────────────────────

CREATE POLICY "categorias_select" ON public.categorias
  FOR SELECT TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND empresa_id = (SELECT p_empresa_id FROM private.get_perfil_atual())
  );

-- FOR ALL sem WITH CHECK explícito: PostgreSQL usa USING como WITH CHECK,
-- garantindo que empresa_id na linha nova também pertença à empresa do usuário.
CREATE POLICY "categorias_manage" ON public.categorias
  FOR ALL TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND empresa_id = (SELECT p_empresa_id FROM private.get_perfil_atual())
    AND (SELECT p_papel FROM private.get_perfil_atual()) IN ('administrador', 'financeiro')
  );

-- ─── CENTROS DE CUSTO ────────────────────────────────────────────────────────

CREATE POLICY "centros_custo_select" ON public.centros_custo
  FOR SELECT TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND empresa_id = (SELECT p_empresa_id FROM private.get_perfil_atual())
  );

CREATE POLICY "centros_custo_manage" ON public.centros_custo
  FOR ALL TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND empresa_id = (SELECT p_empresa_id FROM private.get_perfil_atual())
    AND (SELECT p_papel FROM private.get_perfil_atual()) IN ('administrador', 'financeiro')
  );

-- ─── CONTAS BANCÁRIAS ────────────────────────────────────────────────────────

CREATE POLICY "contas_bancarias_select" ON public.contas_bancarias
  FOR SELECT TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND empresa_id = (SELECT p_empresa_id FROM private.get_perfil_atual())
  );

CREATE POLICY "contas_bancarias_manage" ON public.contas_bancarias
  FOR ALL TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND empresa_id = (SELECT p_empresa_id FROM private.get_perfil_atual())
    AND (SELECT p_papel FROM private.get_perfil_atual()) IN ('administrador', 'financeiro')
  );

-- ─── CLIENTES ────────────────────────────────────────────────────────────────

CREATE POLICY "clientes_select" ON public.clientes
  FOR SELECT TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND empresa_id = (SELECT p_empresa_id FROM private.get_perfil_atual())
  );

CREATE POLICY "clientes_manage" ON public.clientes
  FOR ALL TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND empresa_id = (SELECT p_empresa_id FROM private.get_perfil_atual())
    AND (SELECT p_papel FROM private.get_perfil_atual()) IN ('administrador', 'comercial')
  );

-- ─── SERVIÇOS ────────────────────────────────────────────────────────────────

CREATE POLICY "servicos_select" ON public.servicos
  FOR SELECT TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND empresa_id = (SELECT p_empresa_id FROM private.get_perfil_atual())
  );

CREATE POLICY "servicos_manage" ON public.servicos
  FOR ALL TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND empresa_id = (SELECT p_empresa_id FROM private.get_perfil_atual())
    AND (SELECT p_papel FROM private.get_perfil_atual()) IN ('administrador', 'comercial')
  );

-- ─── ENTRADAS ────────────────────────────────────────────────────────────────

CREATE POLICY "entradas_select" ON public.entradas
  FOR SELECT TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND empresa_id = (SELECT p_empresa_id FROM private.get_perfil_atual())
  );

CREATE POLICY "entradas_manage" ON public.entradas
  FOR ALL TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND empresa_id = (SELECT p_empresa_id FROM private.get_perfil_atual())
    AND (SELECT p_papel FROM private.get_perfil_atual()) IN ('administrador', 'financeiro')
  );

-- ─── SAÍDAS ──────────────────────────────────────────────────────────────────

CREATE POLICY "saidas_select" ON public.saidas
  FOR SELECT TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND empresa_id = (SELECT p_empresa_id FROM private.get_perfil_atual())
  );

CREATE POLICY "saidas_manage" ON public.saidas
  FOR ALL TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND empresa_id = (SELECT p_empresa_id FROM private.get_perfil_atual())
    AND (SELECT p_papel FROM private.get_perfil_atual()) IN ('administrador', 'financeiro')
  );

-- ─── INVESTIMENTOS ───────────────────────────────────────────────────────────

CREATE POLICY "investimentos_select" ON public.investimentos
  FOR SELECT TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND empresa_id = (SELECT p_empresa_id FROM private.get_perfil_atual())
  );

CREATE POLICY "investimentos_manage" ON public.investimentos
  FOR ALL TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND empresa_id = (SELECT p_empresa_id FROM private.get_perfil_atual())
    AND (SELECT p_papel FROM private.get_perfil_atual()) IN ('administrador', 'financeiro')
  );

-- ─── ANEXOS ──────────────────────────────────────────────────────────────────

CREATE POLICY "anexos_select" ON public.anexos
  FOR SELECT TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND empresa_id = (SELECT p_empresa_id FROM private.get_perfil_atual())
  );

CREATE POLICY "anexos_manage" ON public.anexos
  FOR ALL TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND empresa_id = (SELECT p_empresa_id FROM private.get_perfil_atual())
    AND (SELECT p_papel FROM private.get_perfil_atual()) IN ('administrador', 'financeiro', 'comercial')
  );
