export type TransactionType = 'entrada' | 'saida'
export type TransactionStatus = 'pago' | 'pendente' | 'vencido' | 'cancelado'
export type RecurrenceType = 'unico' | 'mensal' | 'trimestral' | 'anual'

export type EntradaStatus = 'recebido' | 'pendente' | 'atrasado'
export type SaidaStatus = 'pago' | 'pendente' | 'atrasado'
export type ClienteStatus = 'ativo' | 'inativo' | 'negociacao' | 'inadimplente'

export interface Transaction {
  id: string
  description: string
  amount: number
  type: TransactionType
  status: TransactionStatus
  category: string
  date: string
  dueDate?: string
  client?: string
  notes?: string
}

export interface Entrada {
  id: string
  descricao: string
  clienteId: string | null
  clienteNome: string
  servicoId: string | null
  servicoNome: string
  categoriaId: string | null
  categoriaNome: string
  contaBancariaId: string | null
  contaBancariaNome: string
  valor: number
  data: string
  formaPagamento: string
  status: EntradaStatus
  observacoes?: string
}

export interface Saida {
  id: string
  descricao: string
  fornecedor: string
  categoriaId: string | null
  categoriaNome: string
  centroCustoId: string | null
  centroCustoNome: string
  contaBancariaId: string | null
  contaBancariaNome: string
  valor: number
  vencimento: string
  formaPagamento: string
  status: SaidaStatus
  observacoes?: string
}

export interface ClienteItem {
  id: string
  nome: string
  cpfCnpj: string
  telefone: string
  whatsapp: string
  email: string
  servicoContratado: string
  valorMensal: number
  dataInicio: string
  status: ClienteStatus
  observacoes?: string
}

export interface ServicoItem {
  id: string
  nome: string
  descricao: string
  categoria: string
  valorVenda: number
  custoEstimado: number
  recorrente: boolean
  status: 'ativo' | 'inativo'
}

export interface Client {
  id: string
  name: string
  email: string
  phone?: string
  document?: string
  status: 'ativo' | 'inativo'
  createdAt: string
  totalRevenue: number
}

export interface Service {
  id: string
  name: string
  description?: string
  price: number
  recurrence: RecurrenceType
  category: string
  active: boolean
}

export interface KpiData {
  label: string
  value: number
  previousValue?: number
  format: 'currency' | 'percent' | 'number'
  trend?: 'up' | 'down' | 'neutral'
}

export interface ChartDataPoint {
  month: string
  entradas: number
  saidas: number
  lucro: number
}

export interface ExpenseCategory {
  name: string
  value: number
  color: string
}

export interface RevenueSource {
  name: string
  value: number
}

export interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'manager' | 'viewer'
  avatar?: string
}

// ─── DRE ─────────────────────────────────────────────────────────────────────
export type DREPeriodoTipo = 'mensal' | 'trimestral' | 'anual'

export interface DRELinha {
  receitaBruta: number
  deducoesImpostos: number
  receitaLiquida: number
  custosServicos: number
  lucroBruto: number
  despesasAdministrativas: number
  despesasMarketing: number
  outrasDespesas: number
  despesasOperacionais: number
  resultadoOperacional: number
  lucroLiquido: number
}

export interface DREPeriodo {
  id: string
  label: string
  tipo: DREPeriodoTipo
  sortKey: number
  dados: DRELinha
}

// ─── ROI ─────────────────────────────────────────────────────────────────────
export type ROIStatus = 'ativo' | 'concluido' | 'cancelado'

export interface ROIInvestimento {
  id: string
  nome: string
  categoria: string
  valorInvestido: number
  receitaGerada: number
  dataInicial: string
  dataFinal: string
  status: ROIStatus
}

// ─── Fluxo de Caixa ──────────────────────────────────────────────────────────
export type FluxoTipo = 'entrada' | 'saida'
export type FluxoStatusType = 'realizado' | 'previsto'

export interface FluxoMovimentacao {
  id: string
  descricao: string
  tipo: FluxoTipo
  valor: number
  data: string
  status: FluxoStatusType
  categoria: string
}

export interface FluxoMensal {
  mes: string
  mesLabel: string
  saldoInicial: number
  entradasRealizadas: number
  saidasRealizadas: number
  saldoFinal: number
  entradasPrevistas: number
  saidasPrevistas: number
  projecaoSaldo: number
}

// ─── Balanço Financeiro ───────────────────────────────────────────────────────
export interface BalancoPeriodo {
  id: string
  label: string
  ano: number
  mes: number
  ativos: {
    dinheiroCaixa: number
    contasBancarias: number
    contasReceber: number
    equipamentos: number
    outrosAtivos: number
    total: number
  }
  passivos: {
    contasPagar: number
    emprestimos: number
    impostosPendentes: number
    obrigacoesTrabalistas: number
    outrosPassivos: number
    total: number
  }
  patrimonioLiquido: number
}
