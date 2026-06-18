import type { Transaction, ChartDataPoint, ExpenseCategory, RevenueSource } from '@/types'

export const mockKpis = {
  saldoAtual: 87_450.32,
  totalEntradas: 42_800.00,
  totalSaidas: 18_340.50,
  lucroLiquido: 24_459.50,
  contasReceber: 31_200.00,
  contasPagar: 9_870.00,
  mrr: 38_500.00,
  roi: 67.2,
}

export const mockChartData: ChartDataPoint[] = [
  { month: 'Jan', entradas: 28_000, saidas: 14_500, lucro: 13_500 },
  { month: 'Fev', entradas: 31_000, saidas: 16_200, lucro: 14_800 },
  { month: 'Mar', entradas: 35_500, saidas: 15_800, lucro: 19_700 },
  { month: 'Abr', entradas: 29_800, saidas: 17_100, lucro: 12_700 },
  { month: 'Mai', entradas: 38_200, saidas: 16_900, lucro: 21_300 },
  { month: 'Jun', entradas: 42_800, saidas: 18_340, lucro: 24_460 },
]

export const mockExpenseCategories: ExpenseCategory[] = [
  { name: 'Folha de pagamento', value: 8_200, color: '#7C3AED' },
  { name: 'Ferramentas e SaaS', value: 3_100, color: '#A78BFA' },
  { name: 'Marketing', value: 2_800, color: '#C4B5FD' },
  { name: 'Infraestrutura', value: 1_940, color: '#DDD6FE' },
  { name: 'Outros', value: 2_300, color: '#EDE9FE' },
]

export const mockRevenueSources: RevenueSource[] = [
  { name: 'Consultoria', value: 18_500 },
  { name: 'Desenvolvimento', value: 12_300 },
  { name: 'Suporte Mensal', value: 7_800 },
  { name: 'Treinamentos', value: 3_200 },
  { name: 'Outros', value: 1_000 },
]

export const mockRecentTransactions: Transaction[] = [
  {
    id: '1',
    description: 'Consultoria mensal — Empresa Alpha',
    amount: 8_500,
    type: 'entrada',
    status: 'pago',
    category: 'Consultoria',
    date: '2026-06-14',
    client: 'Empresa Alpha',
  },
  {
    id: '2',
    description: 'Assinatura Google Workspace',
    amount: 420,
    type: 'saida',
    status: 'pago',
    category: 'Ferramentas e SaaS',
    date: '2026-06-13',
  },
  {
    id: '3',
    description: 'Desenvolvimento de sistema — Beta Ltda',
    amount: 12_300,
    type: 'entrada',
    status: 'pago',
    category: 'Desenvolvimento',
    date: '2026-06-12',
    client: 'Beta Ltda',
  },
  {
    id: '4',
    description: 'Folha de pagamento — Junho',
    amount: 8_200,
    type: 'saida',
    status: 'pago',
    category: 'Folha de pagamento',
    date: '2026-06-10',
  },
  {
    id: '5',
    description: 'Suporte técnico mensal — Gama SA',
    amount: 2_800,
    type: 'entrada',
    status: 'pendente',
    category: 'Suporte Mensal',
    date: '2026-06-09',
    client: 'Gama SA',
  },
  {
    id: '6',
    description: 'Treinamento equipe — Delta Corp',
    amount: 3_200,
    type: 'entrada',
    status: 'pago',
    category: 'Treinamentos',
    date: '2026-06-08',
    client: 'Delta Corp',
  },
  {
    id: '7',
    description: 'Assinatura Figma',
    amount: 290,
    type: 'saida',
    status: 'pago',
    category: 'Ferramentas e SaaS',
    date: '2026-06-07',
  },
]

export const mockUpcomingBills: Transaction[] = [
  {
    id: 'b1',
    description: 'Aluguel escritório',
    amount: 3_800,
    type: 'saida',
    status: 'pendente',
    category: 'Infraestrutura',
    date: '2026-06-20',
    dueDate: '2026-06-20',
  },
  {
    id: 'b2',
    description: 'Internet corporativa',
    amount: 380,
    type: 'saida',
    status: 'pendente',
    category: 'Infraestrutura',
    date: '2026-06-18',
    dueDate: '2026-06-18',
  },
  {
    id: 'b3',
    description: 'Licença Adobe Creative',
    amount: 540,
    type: 'saida',
    status: 'pendente',
    category: 'Ferramentas e SaaS',
    date: '2026-06-17',
    dueDate: '2026-06-17',
  },
  {
    id: 'b4',
    description: 'Conta de energia',
    amount: 760,
    type: 'saida',
    status: 'pendente',
    category: 'Infraestrutura',
    date: '2026-06-22',
    dueDate: '2026-06-22',
  },
]

export interface ComparisonItem {
  label: string
  current: number
  previous: number
  higherIsBetter: boolean
}

export const mockMonthComparison: {
  currentMonth: string
  previousMonth: string
  items: ComparisonItem[]
} = {
  currentMonth: 'Junho 2026',
  previousMonth: 'Maio 2026',
  items: [
    { label: 'Entradas', current: 42_800, previous: 38_200, higherIsBetter: true },
    { label: 'Saídas', current: 18_340, previous: 16_900, higherIsBetter: false },
    { label: 'Lucro Líquido', current: 24_460, previous: 21_300, higherIsBetter: true },
    { label: 'MRR', current: 38_500, previous: 35_000, higherIsBetter: true },
  ],
}
