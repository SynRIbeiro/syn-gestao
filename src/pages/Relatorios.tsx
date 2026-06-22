import { useState, useMemo, useEffect } from 'react'
import {
  Row, Col, Card, Typography, Select, DatePicker, Button, Modal,
  Table, Tag, Space, Tabs, Divider, Progress, Spin,
} from 'antd'
import {
  FilePdfOutlined, FileExcelOutlined, ArrowUpOutlined, ArrowDownOutlined,
  ExclamationCircleOutlined, CheckCircleOutlined, ClockCircleOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip as ReTooltip,
  LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar,
} from 'recharts'
import { formatBRL, formatCompactBRL } from '@/utils/formatters'
import { formatDateBR, dayjs } from '@/utils/dateHelpers'
import { SYN_COLORS } from '@/styles/theme'
import type { EntradaStatus, SaidaStatus } from '@/types'
import { supabase } from '@/lib/supabase'
import { EMPRESA_ID } from '@/lib/constants'

const { Title, Text } = Typography
const { RangePicker } = DatePicker

const DESP_CORES = ['#7C3AED', '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#6B7280']

interface EntradaRow {
  id: string; data: string; dataRecebimento: string; descricao: string; cliente: string
  servico: string; categoria: string; valor: number; status: EntradaStatus; formaPagamento: string
}

interface SaidaRow {
  id: string; vencimento: string; descricao: string; fornecedor: string
  categoria: string; valor: number; status: SaidaStatus
}

interface ServicoRow { id: string; nome: string; categoria: string; valorVenda: number; custoEstimado: number }

interface ClienteRentabilidade { cliente: string; receita: number; custo: number; lucro: number; margemPct: number }
interface ServicoRentabilidade { nome: string; categoria: string; receita: number; custo: number; lucro: number; margemPct: number }
interface ChartPoint { month: string; entradas: number; saidas: number; lucro: number }

export default function Relatorios() {
  const [filterRange, setFilterRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null)
  const [filterCliente, setFilterCliente] = useState('')
  const [filterServico, setFilterServico] = useState('')
  const [filterCategoria, setFilterCategoria] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [exportTipo, setExportTipo] = useState<'PDF' | 'Excel'>('PDF')
  const [loading, setLoading] = useState(true)

  const [entradas, setEntradas] = useState<EntradaRow[]>([])
  const [saidas, setSaidas] = useState<SaidaRow[]>([])
  const [servicos, setServicos] = useState<ServicoRow[]>([])

  useEffect(() => {
    async function fetchAll() {
      setLoading(true)
      const [entradasRes, saidasRes, servicosRes] = await Promise.all([
        supabase.from('entradas').select('id, descricao, valor, status, data_vencimento, data_recebimento, forma_pagamento, clientes!cliente_id(nome), servicos!servico_id(nome), categorias!categoria_id(nome)').eq('empresa_id', EMPRESA_ID).order('data_vencimento', { ascending: false }),
        supabase.from('saidas').select('id, descricao, valor, status, data_vencimento, fornecedor, categorias!categoria_id(nome)').eq('empresa_id', EMPRESA_ID).order('data_vencimento', { ascending: false }),
        supabase.from('servicos').select('id, nome, categoria, valor_venda, custo_estimado').eq('empresa_id', EMPRESA_ID).eq('ativo', true),
      ])

      setEntradas(((entradasRes.data ?? []) as any[]).map(e => ({
        id: e.id,
        data: e.data_vencimento ?? '',
        dataRecebimento: e.data_recebimento ?? '',
        descricao: e.descricao,
        cliente: (e.clientes as any)?.nome ?? '',
        servico: (e.servicos as any)?.nome ?? '',
        categoria: (e.categorias as any)?.nome ?? '',
        valor: Number(e.valor),
        status: e.status as EntradaStatus,
        formaPagamento: e.forma_pagamento ?? '',
      })))

      setSaidas(((saidasRes.data ?? []) as any[]).map(s => ({
        id: s.id,
        vencimento: s.data_vencimento ?? '',
        descricao: s.descricao,
        fornecedor: s.fornecedor ?? '',
        categoria: (s.categorias as any)?.nome ?? '',
        valor: Number(s.valor),
        status: s.status as SaidaStatus,
      })))

      setServicos(((servicosRes.data ?? []) as any[]).map(s => ({
        id: s.id,
        nome: s.nome,
        categoria: s.categoria ?? '',
        valorVenda: Number(s.valor_venda ?? 0),
        custoEstimado: Number(s.custo_estimado ?? 0),
      })))

      setLoading(false)
    }
    fetchAll()
  }, [])

  const clientes = useMemo(() => [...new Set(entradas.map(e => e.cliente).filter(Boolean))].sort(), [entradas])
  const servicosList = useMemo(() => [...new Set(entradas.map(e => e.servico).filter(Boolean))].sort(), [entradas])
  const categorias = useMemo(() => [...new Set([...entradas.map(e => e.categoria), ...saidas.map(s => s.categoria)].filter(Boolean))].sort(), [entradas, saidas])

  const filteredEntradas = useMemo((): EntradaRow[] => {
    return entradas.filter(e => {
      if (filterCliente && e.cliente !== filterCliente) return false
      if (filterServico && e.servico !== filterServico) return false
      if (filterCategoria && e.categoria !== filterCategoria) return false
      if (filterStatus) {
        const statusMap: Record<string, EntradaStatus[]> = { recebido: ['recebido'], pago: ['recebido'], pendente: ['pendente'], atrasado: ['atrasado'] }
        if (!statusMap[filterStatus]?.includes(e.status)) return false
      }
      if (filterRange) {
        const d = dayjs(e.data)
        if (d.isBefore(filterRange[0], 'day') || d.isAfter(filterRange[1], 'day')) return false
      }
      return true
    })
  }, [entradas, filterCliente, filterServico, filterCategoria, filterStatus, filterRange])

  const filteredSaidas = useMemo((): SaidaRow[] => {
    return saidas.filter(s => {
      if (filterCategoria && s.categoria !== filterCategoria) return false
      if (filterStatus) {
        const statusMap: Record<string, SaidaStatus[]> = { pago: ['pago'], recebido: ['pago'], pendente: ['pendente'], atrasado: ['atrasado'] }
        if (!statusMap[filterStatus]?.includes(s.status)) return false
      }
      if (filterRange) {
        const d = dayjs(s.vencimento)
        if (d.isBefore(filterRange[0], 'day') || d.isAfter(filterRange[1], 'day')) return false
      }
      return true
    })
  }, [saidas, filterCategoria, filterStatus, filterRange])

  const totalEntradas = useMemo(() => filteredEntradas.reduce((s, e) => s + e.valor, 0), [filteredEntradas])
  const totalSaidas = useMemo(() => filteredSaidas.reduce((s, e) => s + e.valor, 0), [filteredSaidas])
  const lucro = totalEntradas - totalSaidas

  const despesasPorCategoria = useMemo(() => {
    const map = new Map<string, number>()
    filteredSaidas.forEach(s => map.set(s.categoria || 'Sem Categoria', (map.get(s.categoria || 'Sem Categoria') ?? 0) + s.valor))
    return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
  }, [filteredSaidas])

  const receitaPorCliente = useMemo(() => {
    const map = new Map<string, number>()
    filteredEntradas.forEach(e => { if (e.cliente) map.set(e.cliente, (map.get(e.cliente) ?? 0) + e.valor) })
    return [...map.entries()].map(([name, value]) => ({ name: name.length > 22 ? name.slice(0, 22) + '…' : name, value })).sort((a, b) => b.value - a.value).slice(0, 8)
  }, [filteredEntradas])

  const lucroPorServico = useMemo((): ServicoRentabilidade[] => {
    return servicos.map(sv => {
      const receita = sv.valorVenda
      const custo = sv.custoEstimado
      const l = receita - custo
      return { nome: sv.nome.length > 28 ? sv.nome.slice(0, 28) + '…' : sv.nome, categoria: sv.categoria, receita, custo, lucro: l, margemPct: receita > 0 ? (l / receita) * 100 : 0 }
    }).sort((a, b) => b.lucro - a.lucro)
  }, [servicos])

  const rentabilidadePorCliente = useMemo((): ClienteRentabilidade[] => {
    const map = new Map<string, number>()
    filteredEntradas.forEach(e => { if (e.cliente) map.set(e.cliente, (map.get(e.cliente) ?? 0) + e.valor) })
    return [...map.entries()].map(([cliente, receita]) => {
      const custo = receita * 0.3
      const l = receita - custo
      return { cliente, receita, custo, lucro: l, margemPct: receita > 0 ? (l / receita) * 100 : 0 }
    }).sort((a, b) => b.receita - a.receita)
  }, [filteredEntradas])

  const chartData = useMemo((): ChartPoint[] => {
    const now = dayjs()
    return Array.from({ length: 6 }, (_, i) => {
      const m = now.subtract(5 - i, 'month')
      const inicio = m.startOf('month').format('YYYY-MM-DD')
      const fim = m.endOf('month').format('YYYY-MM-DD')
      const label = m.locale('pt-br').format('MMM/YY').replace(/^\w/, c => c.toUpperCase())
      const entVal = entradas
        .filter(e => e.status === 'recebido' && (e.dataRecebimento || e.data) >= inicio && (e.dataRecebimento || e.data) <= fim)
        .reduce((s, e) => s + e.valor, 0)
      const saiVal = saidas.filter(s => s.status === 'pago' && s.vencimento >= inicio && s.vencimento <= fim).reduce((s, e) => s + e.valor, 0)
      return { month: label, entradas: entVal, saidas: saiVal, lucro: entVal - saiVal }
    })
  }, [entradas, saidas])

  const statusEntradaConfig: Record<EntradaStatus, { color: string; label: string; icon: React.ReactNode }> = {
    recebido: { color: 'success', label: 'Recebido', icon: <CheckCircleOutlined /> },
    pendente: { color: 'warning', label: 'Pendente', icon: <ClockCircleOutlined /> },
    atrasado: { color: 'error', label: 'Atrasado', icon: <ExclamationCircleOutlined /> },
  }
  const statusSaidaConfig: Record<SaidaStatus, { color: string; label: string }> = {
    pago: { color: 'success', label: 'Pago' },
    pendente: { color: 'warning', label: 'Pendente' },
    atrasado: { color: 'error', label: 'Atrasado' },
  }

  const colsEntrada: ColumnsType<EntradaRow> = [
    { title: 'Data', dataIndex: 'data', key: 'data', width: 100, render: (v: string) => formatDateBR(v) },
    { title: 'Descrição', dataIndex: 'descricao', key: 'descricao', render: (v: string) => <Text style={{ fontSize: 13 }}>{v}</Text> },
    { title: 'Cliente', dataIndex: 'cliente', key: 'cliente' },
    { title: 'Categoria', dataIndex: 'categoria', key: 'categoria', render: (v: string) => <Tag color="blue" style={{ borderRadius: 6 }}>{v || '—'}</Tag> },
    { title: 'Valor', dataIndex: 'valor', key: 'valor', align: 'right', render: (v: number) => <Text style={{ fontWeight: 600, color: SYN_COLORS.success }}>{formatBRL(v)}</Text> },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (v: EntradaStatus) => <Tag color={statusEntradaConfig[v].color} style={{ borderRadius: 6 }}>{statusEntradaConfig[v].label}</Tag> },
  ]

  const colsSaida: ColumnsType<SaidaRow> = [
    { title: 'Vencimento', dataIndex: 'vencimento', key: 'vencimento', width: 100, render: (v: string) => formatDateBR(v) },
    { title: 'Descrição', dataIndex: 'descricao', key: 'descricao', render: (v: string) => <Text style={{ fontSize: 13 }}>{v}</Text> },
    { title: 'Fornecedor', dataIndex: 'fornecedor', key: 'fornecedor' },
    { title: 'Categoria', dataIndex: 'categoria', key: 'categoria', render: (v: string) => <Tag color="default" style={{ borderRadius: 6 }}>{v || '—'}</Tag> },
    { title: 'Valor', dataIndex: 'valor', key: 'valor', align: 'right', render: (v: number) => <Text style={{ fontWeight: 600, color: SYN_COLORS.danger }}>{formatBRL(v)}</Text> },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (v: SaidaStatus) => <Tag color={statusSaidaConfig[v].color} style={{ borderRadius: 6 }}>{statusSaidaConfig[v].label}</Tag> },
  ]

  const emptyState = (mensagem: string) => (
    <div style={{ textAlign: 'center', padding: '32px 0' }}>
      <Text type="secondary" style={{ fontSize: 13 }}>{mensagem}</Text>
    </div>
  )

  const tabItems = [
    {
      key: 'entradas', label: 'Entradas',
      children: (
        <Card style={{ borderRadius: 12 }}>
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col><Card size="small" style={{ borderRadius: 8 }}><Text type="secondary" style={{ fontSize: 12 }}>Total</Text><br /><Text style={{ fontSize: 16, fontWeight: 700, color: SYN_COLORS.success }}>{formatBRL(filteredEntradas.reduce((s, e) => s + e.valor, 0))}</Text></Card></Col>
            <Col><Card size="small" style={{ borderRadius: 8 }}><Text type="secondary" style={{ fontSize: 12 }}>Recebido</Text><br /><Text style={{ fontSize: 16, fontWeight: 700, color: SYN_COLORS.success }}>{formatBRL(filteredEntradas.filter(e => e.status === 'recebido').reduce((s, e) => s + e.valor, 0))}</Text></Card></Col>
            <Col><Card size="small" style={{ borderRadius: 8 }}><Text type="secondary" style={{ fontSize: 12 }}>Pendente</Text><br /><Text style={{ fontSize: 16, fontWeight: 700, color: SYN_COLORS.warning }}>{formatBRL(filteredEntradas.filter(e => e.status === 'pendente').reduce((s, e) => s + e.valor, 0))}</Text></Card></Col>
            <Col><Card size="small" style={{ borderRadius: 8 }}><Text type="secondary" style={{ fontSize: 12 }}>Atrasado</Text><br /><Text style={{ fontSize: 16, fontWeight: 700, color: SYN_COLORS.danger }}>{formatBRL(filteredEntradas.filter(e => e.status === 'atrasado').reduce((s, e) => s + e.valor, 0))}</Text></Card></Col>
          </Row>
          {filteredEntradas.length === 0 ? emptyState('Nenhuma entrada registrada.') : <Table dataSource={filteredEntradas} columns={colsEntrada} rowKey="id" size="small" pagination={{ pageSize: 8 }} scroll={{ x: 800 }} />}
        </Card>
      ),
    },
    {
      key: 'saidas', label: 'Saídas',
      children: (
        <Card style={{ borderRadius: 12 }}>
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col><Card size="small" style={{ borderRadius: 8 }}><Text type="secondary" style={{ fontSize: 12 }}>Total</Text><br /><Text style={{ fontSize: 16, fontWeight: 700, color: SYN_COLORS.danger }}>{formatBRL(filteredSaidas.reduce((s, e) => s + e.valor, 0))}</Text></Card></Col>
            <Col><Card size="small" style={{ borderRadius: 8 }}><Text type="secondary" style={{ fontSize: 12 }}>Pago</Text><br /><Text style={{ fontSize: 16, fontWeight: 700, color: SYN_COLORS.success }}>{formatBRL(filteredSaidas.filter(s => s.status === 'pago').reduce((s, e) => s + e.valor, 0))}</Text></Card></Col>
            <Col><Card size="small" style={{ borderRadius: 8 }}><Text type="secondary" style={{ fontSize: 12 }}>Pendente</Text><br /><Text style={{ fontSize: 16, fontWeight: 700, color: SYN_COLORS.warning }}>{formatBRL(filteredSaidas.filter(s => s.status === 'pendente').reduce((s, e) => s + e.valor, 0))}</Text></Card></Col>
            <Col><Card size="small" style={{ borderRadius: 8 }}><Text type="secondary" style={{ fontSize: 12 }}>Atrasado</Text><br /><Text style={{ fontSize: 16, fontWeight: 700, color: SYN_COLORS.danger }}>{formatBRL(filteredSaidas.filter(s => s.status === 'atrasado').reduce((s, e) => s + e.valor, 0))}</Text></Card></Col>
          </Row>
          {filteredSaidas.length === 0 ? emptyState('Nenhuma saída registrada.') : <Table dataSource={filteredSaidas} columns={colsSaida} rowKey="id" size="small" pagination={{ pageSize: 8 }} scroll={{ x: 800 }} />}
        </Card>
      ),
    },
    {
      key: 'lucro-periodo', label: 'Lucro por Período',
      children: (
        <Card style={{ borderRadius: 12 }}>
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col><Card size="small" style={{ borderRadius: 8 }}><Text type="secondary" style={{ fontSize: 12 }}>Receita Total</Text><br /><Text style={{ fontSize: 16, fontWeight: 700, color: SYN_COLORS.success }}>{formatBRL(totalEntradas)}</Text></Card></Col>
            <Col><Card size="small" style={{ borderRadius: 8 }}><Text type="secondary" style={{ fontSize: 12 }}>Custo Total</Text><br /><Text style={{ fontSize: 16, fontWeight: 700, color: SYN_COLORS.danger }}>{formatBRL(totalSaidas)}</Text></Card></Col>
            <Col><Card size="small" style={{ borderRadius: 8 }}><Text type="secondary" style={{ fontSize: 12 }}>Lucro</Text><br /><Text style={{ fontSize: 16, fontWeight: 700, color: lucro >= 0 ? SYN_COLORS.primary : SYN_COLORS.danger }}>{formatBRL(lucro)}</Text></Card></Col>
          </Row>
          {chartData.every(d => d.entradas === 0 && d.saidas === 0) ? emptyState('Nenhuma movimentação cadastrada para visualizar a evolução do lucro.') : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: SYN_COLORS.textSecondary }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={formatCompactBRL} tick={{ fontSize: 12, fill: SYN_COLORS.textSecondary }} axisLine={false} tickLine={false} width={75} />
                <ReTooltip formatter={(v) => [formatBRL(Number(v))]} contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB' }} />
                <Line type="monotone" dataKey="entradas" stroke={SYN_COLORS.success} strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Entradas" />
                <Line type="monotone" dataKey="saidas" stroke={SYN_COLORS.danger} strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Saídas" />
                <Line type="monotone" dataKey="lucro" stroke={SYN_COLORS.primary} strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Lucro" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>
      ),
    },
    {
      key: 'rent-cliente', label: 'Rent. por Cliente',
      children: (
        <Card style={{ borderRadius: 12 }}>
          {rentabilidadePorCliente.length === 0 ? emptyState('Nenhum dado de clientes disponível.') : (
            <Table
              dataSource={rentabilidadePorCliente} rowKey="cliente" size="small" pagination={{ pageSize: 10 }}
              columns={[
                { title: 'Cliente', dataIndex: 'cliente', key: 'cliente', render: (v: string) => <Text strong>{v}</Text> },
                { title: 'Receita', dataIndex: 'receita', key: 'receita', align: 'right', render: (v: number) => <Text style={{ color: SYN_COLORS.success }}>{formatBRL(v)}</Text> },
                { title: 'Custo Est.', dataIndex: 'custo', key: 'custo', align: 'right', render: (v: number) => <Text style={{ color: SYN_COLORS.danger }}>{formatBRL(v)}</Text> },
                { title: 'Lucro', dataIndex: 'lucro', key: 'lucro', align: 'right', render: (v: number) => <Text style={{ fontWeight: 600, color: v >= 0 ? SYN_COLORS.success : SYN_COLORS.danger }}>{formatBRL(v)}</Text> },
                { title: 'Margem', dataIndex: 'margemPct', key: 'margemPct', render: (v: number) => (<Space><Progress percent={Math.min(Math.max(v, 0), 100)} size="small" strokeColor={v >= 50 ? SYN_COLORS.success : v >= 30 ? SYN_COLORS.warning : SYN_COLORS.danger} style={{ width: 80 }} showInfo={false} /><Text style={{ color: v >= 50 ? SYN_COLORS.success : v >= 30 ? SYN_COLORS.warning : SYN_COLORS.danger }}>{v.toFixed(1).replace('.', ',')}%</Text></Space>) },
              ] as ColumnsType<ClienteRentabilidade>}
            />
          )}
        </Card>
      ),
    },
    {
      key: 'rent-servico', label: 'Rent. por Serviço',
      children: (
        <Card style={{ borderRadius: 12 }}>
          {lucroPorServico.length === 0 ? emptyState('Nenhum serviço cadastrado.') : (
            <Table
              dataSource={lucroPorServico} rowKey="nome" size="small" pagination={{ pageSize: 10 }}
              columns={[
                { title: 'Serviço', dataIndex: 'nome', key: 'nome', render: (v: string) => <Text strong>{v}</Text> },
                { title: 'Categoria', dataIndex: 'categoria', key: 'categoria', render: (v: string) => <Tag color="purple" style={{ borderRadius: 6 }}>{v}</Tag> },
                { title: 'Preço Venda', dataIndex: 'receita', key: 'receita', align: 'right', render: (v: number) => formatBRL(v) },
                { title: 'Custo Est.', dataIndex: 'custo', key: 'custo', align: 'right', render: (v: number) => <Text style={{ color: SYN_COLORS.danger }}>{formatBRL(v)}</Text> },
                { title: 'Lucro', dataIndex: 'lucro', key: 'lucro', align: 'right', render: (v: number) => <Text style={{ fontWeight: 600, color: v >= 0 ? SYN_COLORS.success : SYN_COLORS.danger }}>{formatBRL(v)}</Text> },
                { title: 'Margem', dataIndex: 'margemPct', key: 'margemPct', render: (v: number) => (<Space><Progress percent={Math.min(Math.max(v, 0), 100)} size="small" strokeColor={v >= 50 ? SYN_COLORS.success : v >= 30 ? SYN_COLORS.warning : SYN_COLORS.danger} style={{ width: 80 }} showInfo={false} /><Text style={{ color: v >= 50 ? SYN_COLORS.success : v >= 30 ? SYN_COLORS.warning : SYN_COLORS.danger }}>{v.toFixed(1).replace('.', ',')}%</Text></Space>) },
              ] as ColumnsType<ServicoRentabilidade>}
            />
          )}
        </Card>
      ),
    },
    {
      key: 'inadimplencia', label: 'Inadimplência',
      children: (
        <Card style={{ borderRadius: 12 }}>
          {(() => {
            const inadimplentes = filteredEntradas.filter(e => e.status === 'atrasado')
            const total = inadimplentes.reduce((s, e) => s + e.valor, 0)
            return (
              <>
                <Row gutter={16} style={{ marginBottom: 16 }}>
                  <Col><Card size="small" style={{ borderRadius: 8, borderColor: SYN_COLORS.danger }}><Text type="secondary" style={{ fontSize: 12 }}>Total Inadimplente</Text><br /><Text style={{ fontSize: 16, fontWeight: 700, color: SYN_COLORS.danger }}>{formatBRL(total)}</Text></Card></Col>
                  <Col><Card size="small" style={{ borderRadius: 8 }}><Text type="secondary" style={{ fontSize: 12 }}>Qtd. Registros</Text><br /><Text style={{ fontSize: 16, fontWeight: 700, color: SYN_COLORS.danger }}>{inadimplentes.length}</Text></Card></Col>
                </Row>
                {inadimplentes.length === 0 ? emptyState('Nenhuma inadimplência registrada.') : <Table dataSource={inadimplentes} columns={colsEntrada} rowKey="id" size="small" pagination={{ pageSize: 8 }} scroll={{ x: 800 }} />}
              </>
            )
          })()}
        </Card>
      ),
    },
    {
      key: 'contas-pagar', label: 'Contas a Pagar',
      children: (
        <Card style={{ borderRadius: 12 }}>
          {(() => {
            const pendentes = filteredSaidas.filter(s => s.status === 'pendente' || s.status === 'atrasado')
            const total = pendentes.reduce((s, e) => s + e.valor, 0)
            return (
              <>
                <Row gutter={16} style={{ marginBottom: 16 }}>
                  <Col><Card size="small" style={{ borderRadius: 8 }}><Text type="secondary" style={{ fontSize: 12 }}>Total Pendente</Text><br /><Text style={{ fontSize: 16, fontWeight: 700, color: SYN_COLORS.warning }}>{formatBRL(total)}</Text></Card></Col>
                  <Col><Card size="small" style={{ borderRadius: 8 }}><Text type="secondary" style={{ fontSize: 12 }}>Qtd. Registros</Text><br /><Text style={{ fontSize: 16, fontWeight: 700 }}>{pendentes.length}</Text></Card></Col>
                </Row>
                {pendentes.length === 0 ? emptyState('Nenhuma conta a pagar registrada.') : <Table dataSource={pendentes} columns={colsSaida} rowKey="id" size="small" pagination={{ pageSize: 8 }} scroll={{ x: 800 }} />}
              </>
            )
          })()}
        </Card>
      ),
    },
    {
      key: 'contas-receber', label: 'Contas a Receber',
      children: (
        <Card style={{ borderRadius: 12 }}>
          {(() => {
            const pendentes = filteredEntradas.filter(e => e.status === 'pendente' || e.status === 'atrasado')
            const total = pendentes.reduce((s, e) => s + e.valor, 0)
            return (
              <>
                <Row gutter={16} style={{ marginBottom: 16 }}>
                  <Col><Card size="small" style={{ borderRadius: 8 }}><Text type="secondary" style={{ fontSize: 12 }}>Total a Receber</Text><br /><Text style={{ fontSize: 16, fontWeight: 700, color: SYN_COLORS.warning }}>{formatBRL(total)}</Text></Card></Col>
                  <Col><Card size="small" style={{ borderRadius: 8 }}><Text type="secondary" style={{ fontSize: 12 }}>Qtd. Registros</Text><br /><Text style={{ fontSize: 16, fontWeight: 700 }}>{pendentes.length}</Text></Card></Col>
                </Row>
                {pendentes.length === 0 ? emptyState('Nenhuma conta a receber registrada.') : <Table dataSource={pendentes} columns={colsEntrada} rowKey="id" size="small" pagination={{ pageSize: 8 }} scroll={{ x: 800 }} />}
              </>
            )
          })()}
        </Card>
      ),
    },
  ]

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div style={{ padding: 24 }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={3} style={{ margin: 0, fontWeight: 700 }}>Relatórios</Title>
          <Text type="secondary">Central de relatórios gerenciais</Text>
        </Col>
        <Col>
          <Space>
            <Button icon={<FilePdfOutlined />} style={{ borderColor: SYN_COLORS.danger, color: SYN_COLORS.danger }} onClick={() => { setExportTipo('PDF'); setExportModalOpen(true) }}>Exportar PDF</Button>
            <Button icon={<FileExcelOutlined />} style={{ borderColor: SYN_COLORS.success, color: SYN_COLORS.success }} onClick={() => { setExportTipo('Excel'); setExportModalOpen(true) }}>Exportar Excel</Button>
          </Space>
        </Col>
      </Row>

      {/* Filtros */}
      <Card style={{ marginBottom: 24, borderRadius: 12 }} styles={{ body: { padding: '14px 20px' } }}>
        <Row gutter={[16, 8]} align="bottom" wrap>
          <Col>
            <Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Período</Text>
            <RangePicker format="DD/MM/YYYY" onChange={v => setFilterRange(v as [dayjs.Dayjs, dayjs.Dayjs] | null)} placeholder={['Data inicial', 'Data final']} />
          </Col>
          <Col>
            <Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Cliente</Text>
            <Select allowClear showSearch placeholder="Todos" style={{ width: 200 }} value={filterCliente || undefined} onChange={v => setFilterCliente(v ?? '')} options={clientes.map(c => ({ label: c, value: c }))} />
          </Col>
          <Col>
            <Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Serviço</Text>
            <Select allowClear showSearch placeholder="Todos" style={{ width: 220 }} value={filterServico || undefined} onChange={v => setFilterServico(v ?? '')} options={servicosList.map(s => ({ label: s, value: s }))} />
          </Col>
          <Col>
            <Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Categoria</Text>
            <Select allowClear placeholder="Todas" style={{ width: 180 }} value={filterCategoria || undefined} onChange={v => setFilterCategoria(v ?? '')} options={categorias.map(c => ({ label: c, value: c }))} />
          </Col>
          <Col>
            <Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Status</Text>
            <Select allowClear placeholder="Todos" style={{ width: 140 }} value={filterStatus || undefined} onChange={v => setFilterStatus(v ?? '')}
              options={[{ label: 'Recebido/Pago', value: 'recebido' }, { label: 'Pendente', value: 'pendente' }, { label: 'Atrasado', value: 'atrasado' }]}
            />
          </Col>
        </Row>
      </Card>

      {/* Cards de resumo */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        {[
          { label: 'Entradas', value: formatBRL(totalEntradas), color: SYN_COLORS.success, icon: <ArrowUpOutlined /> },
          { label: 'Saídas', value: formatBRL(totalSaidas), color: SYN_COLORS.danger, icon: <ArrowDownOutlined /> },
          { label: 'Lucro', value: formatBRL(lucro), color: lucro >= 0 ? SYN_COLORS.primary : SYN_COLORS.danger, icon: lucro >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined /> },
          { label: 'Margem', value: `${totalEntradas > 0 ? ((lucro / totalEntradas) * 100).toFixed(1).replace('.', ',') : '0,0'}%`, color: lucro >= 0 ? SYN_COLORS.success : SYN_COLORS.danger, icon: null },
        ].map(card => (
          <Col xs={12} sm={12} lg={6} key={card.label}>
            <Card style={{ borderRadius: 12, height: '100%' }} styles={{ body: { padding: '14px 16px' } }}>
              <Text type="secondary" style={{ fontSize: 12 }}>{card.label}</Text>
              <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                {card.icon && <span style={{ color: card.color }}>{card.icon}</span>}
                <Text style={{ fontSize: 18, fontWeight: 700, color: card.color }}>{card.value}</Text>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Gráficos */}
      <Row gutter={24} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={8}>
          <Card title={<Title level={5} style={{ margin: 0 }}>Despesas por Categoria</Title>} style={{ borderRadius: 12 }}>
            {despesasPorCategoria.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={despesasPorCategoria} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                      {despesasPorCategoria.map((_, i) => <Cell key={i} fill={DESP_CORES[i % DESP_CORES.length]} />)}
                    </Pie>
                    <ReTooltip formatter={(v) => [formatBRL(Number(v)), 'Valor']} contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ marginTop: 8 }}>
                  {despesasPorCategoria.slice(0, 5).map((item, i) => (
                    <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                      <Space size={6}><div style={{ width: 8, height: 8, borderRadius: 2, background: DESP_CORES[i % DESP_CORES.length] }} /><Text style={{ fontSize: 11 }}>{item.name}</Text></Space>
                      <Text style={{ fontSize: 11, fontWeight: 500 }}>{formatBRL(item.value)}</Text>
                    </div>
                  ))}
                </div>
              </>
            ) : <div style={{ textAlign: 'center', padding: 24 }}><Text type="secondary">Nenhuma despesa registrada</Text></div>}
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title={<Title level={5} style={{ margin: 0 }}>Receita por Cliente</Title>} style={{ borderRadius: 12 }}>
            {receitaPorCliente.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={receitaPorCliente} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F3F4F6" />
                  <XAxis type="number" tickFormatter={v => `R$${(Number(v) / 1000).toFixed(0)}K`} tick={{ fontSize: 10, fill: SYN_COLORS.textSecondary }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: SYN_COLORS.textPrimary }} axisLine={false} tickLine={false} width={110} />
                  <ReTooltip formatter={(v) => [formatBRL(Number(v)), 'Receita']} contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB' }} />
                  <Bar dataKey="value" fill={SYN_COLORS.success} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <div style={{ textAlign: 'center', padding: 24 }}><Text type="secondary">Nenhuma receita registrada</Text></div>}
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title={<Title level={5} style={{ margin: 0 }}>Lucro por Serviço</Title>} style={{ borderRadius: 12 }}>
            {lucroPorServico.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={lucroPorServico.slice(0, 6)} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F3F4F6" />
                  <XAxis type="number" tickFormatter={v => `R$${(Number(v) / 1000).toFixed(0)}K`} tick={{ fontSize: 10, fill: SYN_COLORS.textSecondary }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="nome" tick={{ fontSize: 10, fill: SYN_COLORS.textPrimary }} axisLine={false} tickLine={false} width={120} />
                  <ReTooltip formatter={(v) => [formatBRL(Number(v)), 'Lucro']} contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB' }} />
                  <Bar dataKey="lucro" fill={SYN_COLORS.primary} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <div style={{ textAlign: 'center', padding: 24 }}><Text type="secondary">Nenhum serviço registrado</Text></div>}
          </Card>
        </Col>
      </Row>

      {/* Evolução Financeira */}
      <Card title={<Title level={5} style={{ margin: 0 }}>Evolução Financeira Mensal</Title>} style={{ marginBottom: 24, borderRadius: 12 }}>
        {chartData.every(d => d.entradas === 0 && d.saidas === 0) ? (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <Text type="secondary" style={{ fontSize: 13 }}>Nenhuma movimentação cadastrada. Cadastre entradas e saídas para visualizar os gráficos.</Text>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: SYN_COLORS.textSecondary }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={formatCompactBRL} tick={{ fontSize: 12, fill: SYN_COLORS.textSecondary }} axisLine={false} tickLine={false} width={75} />
              <ReTooltip formatter={(v) => [formatBRL(Number(v))]} contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB' }} />
              <Line type="monotone" dataKey="entradas" stroke={SYN_COLORS.success} strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Entradas" />
              <Line type="monotone" dataKey="saidas" stroke={SYN_COLORS.danger} strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Saídas" />
              <Line type="monotone" dataKey="lucro" stroke={SYN_COLORS.primary} strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Lucro" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Relatórios em Abas */}
      <Divider style={{ marginBottom: 20 }}><Text type="secondary" style={{ fontSize: 13 }}>Relatórios Detalhados</Text></Divider>
      <Tabs type="card" size="small" items={tabItems} style={{ marginBottom: 24 }} />

      {/* Modal de exportação */}
      <Modal
        title={`Exportar ${exportTipo}`}
        open={exportModalOpen}
        onOk={() => setExportModalOpen(false)}
        onCancel={() => setExportModalOpen(false)}
        okText="Entendido"
        cancelButtonProps={{ style: { display: 'none' } }}
      >
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          {exportTipo === 'PDF' ? <FilePdfOutlined style={{ fontSize: 40, color: SYN_COLORS.danger, marginBottom: 16, display: 'block' }} /> : <FileExcelOutlined style={{ fontSize: 40, color: SYN_COLORS.success, marginBottom: 16, display: 'block' }} />}
          <Title level={4} style={{ marginTop: 0 }}>Exportação em {exportTipo}</Title>
          <Text type="secondary">A função de exportação será conectada ao backend em uma próxima fase. Os dados estão disponíveis para visualização na tela.</Text>
        </div>
      </Modal>
    </div>
  )
}
