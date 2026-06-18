// Tipos gerados manualmente compatíveis com o schema 001_initial_schema.sql
// Atualizar quando o schema evoluir.

export type PapelUsuario = 'administrador' | 'financeiro' | 'comercial' | 'visualizador'
export type TipoCategoria = 'entrada' | 'saida' | 'ambos'
export type StatusCliente = 'ativo' | 'inativo' | 'negociacao' | 'inadimplente'
export type StatusEntrada = 'recebido' | 'pendente' | 'atrasado'
export type StatusSaida = 'pago' | 'pendente' | 'atrasado'

// ─── Tabelas ─────────────────────────────────────────────────────────────────

export interface DbEmpresa {
  id: string
  nome: string
  nome_fantasia: string | null
  cnpj: string | null
  telefone: string | null
  email: string | null
  logo_url: string | null
  cor_principal: string | null
  ativo: boolean
  created_at: string
  updated_at: string
}

export interface DbPerfil {
  id: string
  empresa_id: string | null
  nome: string
  email: string | null
  cargo: string | null
  papel: PapelUsuario
  ativo: boolean
  created_at: string
  updated_at: string
}

export interface DbCategoria {
  id: string
  empresa_id: string
  nome: string
  tipo: TipoCategoria
  ativo: boolean
  created_at: string
  updated_at: string
}

export interface DbCentroCusto {
  id: string
  empresa_id: string
  nome: string
  descricao: string | null
  ativo: boolean
  created_at: string
  updated_at: string
}

export interface DbContaBancaria {
  id: string
  empresa_id: string
  nome: string
  banco: string | null
  agencia: string | null
  conta: string | null
  saldo_inicial: number | null
  ativo: boolean
  created_at: string
  updated_at: string
}

export interface DbCliente {
  id: string
  empresa_id: string
  nome: string
  nome_fantasia: string | null
  cpf_cnpj: string | null
  telefone: string | null
  whatsapp: string | null
  email: string | null
  endereco: string | null
  valor_mensal: number | null
  data_inicio: string | null
  status: StatusCliente
  observacoes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface DbServico {
  id: string
  empresa_id: string
  nome: string
  descricao: string | null
  categoria: string | null
  valor_venda: number | null
  custo_estimado: number | null
  recorrente: boolean
  ativo: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface DbEntrada {
  id: string
  empresa_id: string
  cliente_id: string | null
  servico_id: string | null
  categoria_id: string | null
  conta_bancaria_id: string | null
  descricao: string
  valor: number
  data_recebimento: string | null
  data_vencimento: string | null
  forma_pagamento: string | null
  status: StatusEntrada
  recorrente: boolean
  periodicidade: string | null
  observacoes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface DbSaida {
  id: string
  empresa_id: string
  categoria_id: string | null
  centro_custo_id: string | null
  conta_bancaria_id: string | null
  fornecedor: string | null
  descricao: string
  valor: number
  data_pagamento: string | null
  data_vencimento: string | null
  forma_pagamento: string | null
  status: StatusSaida
  recorrente: boolean
  periodicidade: string | null
  observacoes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface DbInvestimento {
  id: string
  empresa_id: string
  nome: string
  categoria: string | null
  valor_investido: number
  receita_gerada: number | null
  data_inicial: string | null
  data_final: string | null
  status: string | null
  observacoes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface DbAnexo {
  id: string
  empresa_id: string
  entidade_tipo: string | null
  entidade_id: string | null
  nome_arquivo: string | null
  caminho_arquivo: string | null
  tipo_arquivo: string | null
  created_by: string | null
  created_at: string
}

// ─── Tipo raiz compatível com createClient<Database> ─────────────────────────

export interface Database {
  public: {
    Tables: {
      empresas: {
        Row: DbEmpresa
        Insert: Omit<DbEmpresa, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string }
        Update: Partial<Omit<DbEmpresa, 'id'>>
      }
      perfis: {
        Row: DbPerfil
        Insert: Omit<DbPerfil, 'created_at' | 'updated_at'> & { created_at?: string; updated_at?: string }
        Update: Partial<Omit<DbPerfil, 'id'>>
      }
      categorias: {
        Row: DbCategoria
        Insert: Omit<DbCategoria, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string }
        Update: Partial<Omit<DbCategoria, 'id'>>
      }
      centros_custo: {
        Row: DbCentroCusto
        Insert: Omit<DbCentroCusto, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string }
        Update: Partial<Omit<DbCentroCusto, 'id'>>
      }
      contas_bancarias: {
        Row: DbContaBancaria
        Insert: Omit<DbContaBancaria, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string }
        Update: Partial<Omit<DbContaBancaria, 'id'>>
      }
      clientes: {
        Row: DbCliente
        Insert: Omit<DbCliente, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string }
        Update: Partial<Omit<DbCliente, 'id'>>
      }
      servicos: {
        Row: DbServico
        Insert: Omit<DbServico, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string }
        Update: Partial<Omit<DbServico, 'id'>>
      }
      entradas: {
        Row: DbEntrada
        Insert: Omit<DbEntrada, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string }
        Update: Partial<Omit<DbEntrada, 'id'>>
      }
      saidas: {
        Row: DbSaida
        Insert: Omit<DbSaida, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string }
        Update: Partial<Omit<DbSaida, 'id'>>
      }
      investimentos: {
        Row: DbInvestimento
        Insert: Omit<DbInvestimento, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string }
        Update: Partial<Omit<DbInvestimento, 'id'>>
      }
      anexos: {
        Row: DbAnexo
        Insert: Omit<DbAnexo, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<Omit<DbAnexo, 'id'>>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
