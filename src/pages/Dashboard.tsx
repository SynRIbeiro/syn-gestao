import { useState, useEffect } from 'react'
import { Row, Col, Typography, Tag, Spin } from 'antd'
import { useNavigate } from 'react-router-dom'
import {
  BankOutlined, ArrowUpOutlined, ArrowDownOutlined, DollarOutlined,
  WalletOutlined, CreditCardOutlined, RiseOutlined, PercentageOutlined,
  CalendarOutlined,
} from '@ant-design/icons'
import KpiCard from '@/components/dashboard/KpiCard'
import FinancialLineChart from '@/components/dashboard/FinancialLineChart'
import ExpensePieChart from '@/components/dashboard/ExpensePieChart'
import RecentTransactions from '@/components/dashboard/RecentTransactions'
import UpcomingBills from '@/components/dashboard/UpcomingBills'
import QuickActions from '@/components/dashboard/QuickActions'
import { dayjs } from '@/utils/dateHelpers'
import { SYN_COLORS } from '@/styles/theme'
import { supabase } from '@/lib/supabase'
import { EMPRESA_ID } from '@/lib/constants'
import type { ChartDataPoint, ExpenseCategory, Transaction } from '@/types'

const { Title, Text } = Typography

const CHART_COLORS = ['#7C3AED', '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#6B7280', '#8B5CF6', '#06B6D4']

const mesMesAtual = dayjs().locale('pt-br').format('MMMM YYYY')
const mesMesAtualCapitalizado = mesMesAtual.charAt(0).toUpperCase() + mesMesAtual.slice(1)

interface DashboardData {
  saldoAtual: number
  totalEntradas: number
  totalSaidas: number
  lucroLiquido: number
  contasReceber: number
  contasPagar: number
  mrr: number
  roi: number
  chartData: ChartDataPoint[]
  expenseCategories: ExpenseCategory[]
  recentTransactions: Transaction[]
  upcomingBills: Transaction[]
}

const EMPTY_DATA: DashboardData = {
  saldoAtual: 0, totalEntradas: 0, totalSaidas: 0, lucroLiquido: 0,
  contasReceber: 0, contasPagar: 0, mrr: 0, roi: 0,
  chartData: [], expenseCategories: [], recentTransactions: [], upcomingBills: [],
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [data, setData] = useState<DashboardData>(EMPTY_DATA)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchDashboard() {
      setLoading(true)

      const now = dayjs()
      const startOfMonth = now.startOf('month').format('YYYY-MM-DD')
      const endOfMonth = now.endOf('month').format('YYYY-MM-DD')

      const meses = Array.from({ length: 6 }, (_, i) => {
        const m = now.subtract(5 - i, 'month')
        return {
          inicio: m.startOf('month').format('YYYY-MM-DD'),
          fim: m.endOf('month').format('YYYY-MM-DD'),
          label: m.locale('pt-br').format('MMM/YY').replace(/^\w/, c => c.toUpperCase()),
        }
      })

      const [
        contasBancarRes,
        entradasMesRes,
        saidasMesRes,
        contasReceberRes,
        contasPagarRes,
        clientesAtivoRes,
        investimentosRes,
        entradasRecentesRes,
        saidasProximasRes,
        saidas6MesesRes,
        entradas6MesesRes,
      ] = await Promise.all([
        supabase.from('contas_bancarias').select('saldo_inicial').eq('empresa_id', EMPRESA_ID).eq('ativo', true),
        supabase.from('entradas').select('valor, status').eq('empresa_id', EMPRESA_ID).gte('data_vencimento', startOfMonth).lte('data_vencimento', endOfMonth),
        supabase.from('saidas').select('valor, status').eq('empresa_id', EMPRESA_ID).gte('data_vencimento', startOfMonth).lte('data_vencimento', endOfMonth),
        supabase.from('entradas').select('valor').eq('empresa_id', EMPRESA_ID).in('status', ['pendente', 'atrasado']),
        supabase.from('saidas').select('valor').eq('empresa_id', EMPRESA_ID).in('status', ['pendente', 'atrasado']),
        supabase.from('clientes').select('valor_mensal').eq('empresa_id', EMPRESA_ID).eq('status', 'ativo'),
        supabase.from('investimentos').select('valor_investido, receita_gerada').eq('empresa_id', EMPRESA_ID),
        supabase.from('entradas').select('id, descricao, valor, status, data_vencimento, clientes!cliente_id(nome), categorias!categoria_id(nome)').eq('empresa_id', EMPRESA_ID).order('data_vencimento', { ascending: false }).limit(7),
        supabase.from('saidas').select('id, descricao, valor, status, data_vencimento, categorias!categoria_id(nome)').eq('empresa_id', EMPRESA_ID).in('status', ['pendente', 'atrasado']).order('data_vencimento', { ascending: true }).limit(6),
        supabase.from('saidas').select('valor, data_vencimento, categorias!categoria_id(nome)').eq('empresa_id', EMPRESA_ID).gte('data_vencimento', meses[0].inicio).lte('data_vencimento', meses[5].fim),
        supabase.from('entradas').select('valor, data_vencimento').eq('empresa_id', EMPRESA_ID).gte('data_vencimento', meses[0].inicio).lte('data_vencimento', meses[5].fim),
      ])

      // Saldo atual
      const saldoInicial = (contasBancarRes.data ?? []).reduce((s, c: any) => s + Number(c.saldo_inicial ?? 0), 0)
      const entradasRecebidas = (entradasMesRes.data ?? []).filter((e: any) => e.status === 'recebido').reduce((s, e: any) => s + Number(e.valor), 0)
      const saidasPagas = (saidasMesRes.data ?? []).filter((s: any) => s.status === 'pago').reduce((acc, s: any) => acc + Number(s.valor), 0)
      const saldoAtual = saldoInicial + entradasRecebidas - saidasPagas

      // KPIs mês atual
      const totalEntradas = (entradasMesRes.data ?? []).reduce((s, e: any) => s + Number(e.valor), 0)
      const totalSaidas = (saidasMesRes.data ?? []).reduce((s, e: any) => s + Number(e.valor), 0)
      const lucroLiquido = totalEntradas - totalSaidas

      // Contas a receber/pagar
      const contasReceber = (contasReceberRes.data ?? []).reduce((s, e: any) => s + Number(e.valor), 0)
      const contasPagar = (contasPagarRes.data ?? []).reduce((s, e: any) => s + Number(e.valor), 0)

      // MRR
      const mrr = (clientesAtivoRes.data ?? []).reduce((s, c: any) => s + Number(c.valor_mensal ?? 0), 0)

      // ROI Geral
      const totalInvestido = (investimentosRes.data ?? []).reduce((s, i: any) => s + Number(i.valor_investido ?? 0), 0)
      const totalReceitaGerada = (investimentosRes.data ?? []).reduce((s, i: any) => s + Number(i.receita_gerada ?? 0), 0)
      const roi = totalInvestido > 0 ? ((totalReceitaGerada - totalInvestido) / totalInvestido) * 100 : 0

      // Gráfico últimos 6 meses
      const chartData: ChartDataPoint[] = meses.map(m => {
        const ent = (entradas6MesesRes.data ?? []).filter((e: any) => e.data_vencimento >= m.inicio && e.data_vencimento <= m.fim)
        const sai = (saidas6MesesRes.data ?? []).filter((s: any) => s.data_vencimento >= m.inicio && s.data_vencimento <= m.fim)
        const entVal = ent.reduce((s, e: any) => s + Number(e.valor), 0)
        const saiVal = sai.reduce((s, e: any) => s + Number(e.valor), 0)
        return { month: m.label, entradas: entVal, saidas: saiVal, lucro: entVal - saiVal }
      })

      // Despesas por categoria (últimos 6 meses)
      const catMap = new Map<string, number>()
      ;(saidas6MesesRes.data ?? []).forEach((s: any) => {
        const cat = (s.categorias as any)?.nome ?? 'Sem Categoria'
        catMap.set(cat, (catMap.get(cat) ?? 0) + Number(s.valor))
      })
      const expenseCategories: ExpenseCategory[] = [...catMap.entries()]
        .map(([name, value], i) => ({ name, value, color: CHART_COLORS[i % CHART_COLORS.length] }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6)

      // Movimentações recentes (entradas)
      const recentTransactions: Transaction[] = (entradasRecentesRes.data ?? []).map((e: any) => ({
        id: e.id,
        description: e.descricao,
        client: (e.clientes as any)?.nome,
        category: (e.categorias as any)?.nome ?? '—',
        date: e.data_vencimento ?? '',
        amount: Number(e.valor),
        status: e.status === 'recebido' ? 'pago' : e.status === 'atrasado' ? 'vencido' : 'pendente',
        type: 'entrada' as const,
      }))

      // Próximos vencimentos (saídas pendentes)
      const upcomingBills: Transaction[] = (saidasProximasRes.data ?? []).map((s: any) => ({
        id: s.id,
        description: s.descricao,
        category: (s.categorias as any)?.nome ?? '—',
        date: s.data_vencimento ?? '',
        dueDate: s.data_vencimento ?? '',
        amount: Number(s.valor),
        status: s.status === 'pago' ? 'pago' : s.status === 'atrasado' ? 'vencido' : 'pendente',
        type: 'saida' as const,
      }))

      setData({
        saldoAtual, totalEntradas, totalSaidas, lucroLiquido,
        contasReceber, contasPagar, mrr, roi,
        chartData, expenseCategories, recentTransactions, upcomingBills,
      })
      setLoading(false)
    }
    fetchDashboard()
  }, [])

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <Title level={4} style={{ margin: 0, fontWeight: 700 }}>Dashboard</Title>
          <Text type="secondary" style={{ fontSize: 13 }}>Visão geral do desempenho financeiro</Text>
        </div>
        <Tag icon={<CalendarOutlined />} color="purple" style={{ borderRadius: 8, padding: '4px 10px', fontSize: 13, height: 'auto' }}>
          {mesMesAtualCapitalizado}
        </Tag>
      </div>

      {/* KPIs — linha 1 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <KpiCard label="Saldo Atual" value={data.saldoAtual} icon={<BankOutlined />} iconBg={SYN_COLORS.primaryLight} onClick={() => navigate('/fluxo-caixa')} />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <KpiCard label="Total de Entradas" value={data.totalEntradas} icon={<ArrowUpOutlined />} iconBg={SYN_COLORS.successLight} onClick={() => navigate('/entradas')} />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <KpiCard label="Total de Saídas" value={data.totalSaidas} icon={<ArrowDownOutlined />} iconBg={SYN_COLORS.dangerLight} onClick={() => navigate('/saidas')} />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <KpiCard label="Lucro Líquido" value={data.lucroLiquido} icon={<DollarOutlined />} iconBg={SYN_COLORS.successLight} onClick={() => navigate('/dre')} />
        </Col>
      </Row>

      {/* KPIs — linha 2 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <KpiCard label="Contas a Receber" value={data.contasReceber} icon={<WalletOutlined />} iconBg={SYN_COLORS.infoLight} onClick={() => navigate('/contas-receber')} />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <KpiCard label="Contas a Pagar" value={data.contasPagar} icon={<CreditCardOutlined />} iconBg={SYN_COLORS.warningLight} onClick={() => navigate('/contas-pagar')} />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <KpiCard label="Receita Recorrente (MRR)" value={data.mrr} icon={<RiseOutlined />} iconBg={SYN_COLORS.primaryLight} onClick={() => navigate('/relatorios')} />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <KpiCard label="ROI Geral" value={data.roi} format="percent" icon={<PercentageOutlined />} iconBg={SYN_COLORS.successLight} onClick={() => navigate('/roi')} />
        </Col>
      </Row>

      {/* Atalhos rápidos */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24}><QuickActions /></Col>
      </Row>

      {/* Gráficos principais */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} xl={16}>
          <FinancialLineChart data={data.chartData} />
        </Col>
        <Col xs={24} xl={8}>
          <ExpensePieChart data={data.expenseCategories} />
        </Col>
      </Row>

      {/* Últimas movimentações + Próximos vencimentos */}
      <Row gutter={[16, 16]}>
        <Col xs={24} xl={16}>
          <RecentTransactions data={data.recentTransactions} />
        </Col>
        <Col xs={24} xl={8}>
          <UpcomingBills data={data.upcomingBills} />
        </Col>
      </Row>
    </div>
  )
}
