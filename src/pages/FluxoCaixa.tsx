import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  Row, Col, Card, Typography, Select, Table, Tag, Space, Button, Spin, Empty,
} from 'antd'
import {
  LeftOutlined, RightOutlined, ArrowUpOutlined, ArrowDownOutlined,
  WalletOutlined, RiseOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip as ReTooltip, Legend,
} from 'recharts'
import { formatBRL, formatCompactBRL } from '@/utils/formatters'
import { formatDateBR, dayjs } from '@/utils/dateHelpers'
import { SYN_COLORS } from '@/styles/theme'
import { supabase } from '@/lib/supabase'
import { EMPRESA_ID } from '@/lib/constants'

const { Title, Text } = Typography

type FluxoTipo = 'entrada' | 'saida'
type FluxoStatusType = 'realizado' | 'previsto'

interface FluxoMovimentacao {
  id: string
  descricao: string
  tipo: FluxoTipo
  valor: number
  data: string
  status: FluxoStatusType
  categoria: string
}

interface FluxoMensal {
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

function buildMeses(now: ReturnType<typeof dayjs>): Array<{ mes: string; mesLabel: string; inicio: string; fim: string }> {
  return Array.from({ length: 12 }, (_, i) => {
    const m = now.subtract(6 - i, 'month')
    return {
      mes: m.format('YYYY-MM'),
      mesLabel: m.locale('pt-br').format('MMM/YY').replace(/^\w/, c => c.toUpperCase()),
      inicio: m.startOf('month').format('YYYY-MM-DD'),
      fim: m.endOf('month').format('YYYY-MM-DD'),
    }
  })
}

const now = dayjs()
const MESES_DEF = buildMeses(now)
const IDX_ATUAL = MESES_DEF.findIndex(m => m.mes === now.format('YYYY-MM'))

export default function FluxoCaixa() {
  const [mesIdx, setMesIdx] = useState(IDX_ATUAL >= 0 ? IDX_ATUAL : 6)
  const [filterTipo, setFilterTipo] = useState<FluxoTipo | ''>('')
  const [filterStatus, setFilterStatus] = useState<FluxoStatusType | ''>('')
  const [filterCategoria, setFilterCategoria] = useState('')
  const [loading, setLoading] = useState(true)
  const [saldoInicial, setSaldoInicial] = useState(0)
  const [todasMovs, setTodasMovs] = useState<FluxoMovimentacao[]>([])

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [contasRes, entradasRes, saidasRes] = await Promise.all([
      supabase.from('contas_bancarias').select('saldo_inicial').eq('empresa_id', EMPRESA_ID).eq('ativo', true),
      supabase.from('entradas').select('id, descricao, valor, status, data_vencimento, categorias!categoria_id(nome)').eq('empresa_id', EMPRESA_ID).gte('data_vencimento', MESES_DEF[0].inicio).lte('data_vencimento', MESES_DEF[MESES_DEF.length - 1].fim).order('data_vencimento'),
      supabase.from('saidas').select('id, descricao, valor, status, data_vencimento, categorias!categoria_id(nome)').eq('empresa_id', EMPRESA_ID).gte('data_vencimento', MESES_DEF[0].inicio).lte('data_vencimento', MESES_DEF[MESES_DEF.length - 1].fim).order('data_vencimento'),
    ])

    const saldoBase = (contasRes.data ?? []).reduce((s, c: any) => s + Number(c.saldo_inicial ?? 0), 0)
    setSaldoInicial(saldoBase)

    const movs: FluxoMovimentacao[] = [
      ...((entradasRes.data ?? []) as any[]).map(e => ({
        id: e.id,
        descricao: e.descricao,
        tipo: 'entrada' as FluxoTipo,
        valor: Number(e.valor),
        data: e.data_vencimento ?? '',
        status: e.status === 'recebido' ? 'realizado' : 'previsto' as FluxoStatusType,
        categoria: (e.categorias as any)?.nome ?? 'Sem Categoria',
      })),
      ...((saidasRes.data ?? []) as any[]).map(s => ({
        id: s.id,
        descricao: s.descricao,
        tipo: 'saida' as FluxoTipo,
        valor: Number(s.valor),
        data: s.data_vencimento ?? '',
        status: s.status === 'pago' ? 'realizado' : 'previsto' as FluxoStatusType,
        categoria: (s.categorias as any)?.nome ?? 'Sem Categoria',
      })),
    ].sort((a, b) => a.data.localeCompare(b.data))

    setTodasMovs(movs)
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const fluxoMensal: FluxoMensal[] = useMemo(() => {
    return MESES_DEF.map(m => {
      const movsMes = todasMovs.filter(mv => mv.data >= m.inicio && mv.data <= m.fim)
      const entradasRealizadas = movsMes.filter(mv => mv.tipo === 'entrada' && mv.status === 'realizado').reduce((s, mv) => s + mv.valor, 0)
      const saidasRealizadas = movsMes.filter(mv => mv.tipo === 'saida' && mv.status === 'realizado').reduce((s, mv) => s + mv.valor, 0)
      const entradasPrevistas = movsMes.filter(mv => mv.tipo === 'entrada' && mv.status === 'previsto').reduce((s, mv) => s + mv.valor, 0)
      const saidasPrevistas = movsMes.filter(mv => mv.tipo === 'saida' && mv.status === 'previsto').reduce((s, mv) => s + mv.valor, 0)
      const saldoFinal = saldoInicial + entradasRealizadas - saidasRealizadas
      const projecaoSaldo = saldoFinal + entradasPrevistas - saidasPrevistas
      return {
        mes: m.inicio,
        mesLabel: m.mesLabel,
        saldoInicial,
        entradasRealizadas,
        saidasRealizadas,
        saldoFinal,
        entradasPrevistas,
        saidasPrevistas,
        projecaoSaldo,
      }
    })
  }, [todasMovs, saldoInicial])

  const mesSelecionado = fluxoMensal[mesIdx] ?? fluxoMensal[0]

  const categorias = useMemo(
    () => [...new Set(todasMovs.map(m => m.categoria))].sort(),
    [todasMovs],
  )

  const movimentacoesFiltradas = useMemo(() => {
    const mesInicio = MESES_DEF[mesIdx]?.inicio ?? ''
    const mesFim = MESES_DEF[mesIdx]?.fim ?? ''
    return todasMovs.filter(m => {
      if (m.data < mesInicio || m.data > mesFim) return false
      if (filterTipo && m.tipo !== filterTipo) return false
      if (filterStatus && m.status !== filterStatus) return false
      if (filterCategoria && m.categoria !== filterCategoria) return false
      return true
    })
  }, [todasMovs, mesIdx, filterTipo, filterStatus, filterCategoria])

  const lineChartData = useMemo(() =>
    fluxoMensal.map(m => ({
      mes: m.mesLabel,
      saldoRealizado: m.entradasRealizadas > 0 || m.saidasRealizadas > 0 ? m.saldoFinal : null,
      projecaoSaldo: m.projecaoSaldo,
    })),
    [fluxoMensal],
  )

  const columns: ColumnsType<FluxoMovimentacao> = [
    {
      title: 'Data',
      dataIndex: 'data',
      key: 'data',
      width: 100,
      render: (v: string) => formatDateBR(v),
    },
    {
      title: 'Descrição',
      dataIndex: 'descricao',
      key: 'descricao',
      render: (v: string) => <Text style={{ fontSize: 13 }}>{v}</Text>,
    },
    {
      title: 'Categoria',
      dataIndex: 'categoria',
      key: 'categoria',
      render: (v: string) => <Tag color="default" style={{ borderRadius: 6 }}>{v}</Tag>,
    },
    {
      title: 'Tipo',
      dataIndex: 'tipo',
      key: 'tipo',
      width: 90,
      render: (v: FluxoTipo) => (
        <Tag color={v === 'entrada' ? 'success' : 'error'} style={{ borderRadius: 6 }}>
          {v === 'entrada' ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
          {' '}{v === 'entrada' ? 'Entrada' : 'Saída'}
        </Tag>
      ),
    },
    {
      title: 'Valor',
      dataIndex: 'valor',
      key: 'valor',
      align: 'right',
      render: (v: number, record: FluxoMovimentacao) => (
        <Text style={{ fontWeight: 600, color: record.tipo === 'entrada' ? SYN_COLORS.success : SYN_COLORS.danger }}>
          {record.tipo === 'saida' ? '-' : '+'}{formatBRL(v)}
        </Text>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (v: FluxoStatusType) => (
        <Tag color={v === 'realizado' ? 'success' : 'warning'} style={{ borderRadius: 6 }}>
          {v === 'realizado' ? 'Realizado' : 'Previsto'}
        </Tag>
      ),
    },
  ]

  const summaryCards = [
    { label: 'Saldo Inicial', value: mesSelecionado?.saldoInicial ?? 0, color: SYN_COLORS.info, icon: <WalletOutlined /> },
    { label: 'Entradas Realizadas', value: mesSelecionado?.entradasRealizadas ?? 0, color: SYN_COLORS.success, icon: <ArrowUpOutlined /> },
    { label: 'Saídas Realizadas', value: mesSelecionado?.saidasRealizadas ?? 0, color: SYN_COLORS.danger, icon: <ArrowDownOutlined /> },
    { label: 'Saldo Final', value: mesSelecionado?.saldoFinal ?? 0, color: SYN_COLORS.primary, icon: <WalletOutlined /> },
  ]

  const projCards = [
    { label: 'Entradas Previstas', value: mesSelecionado?.entradasPrevistas ?? 0, color: '#16A34A', icon: <ArrowUpOutlined /> },
    { label: 'Saídas Previstas', value: mesSelecionado?.saidasPrevistas ?? 0, color: '#DC2626', icon: <ArrowDownOutlined /> },
    { label: 'Projeção de Saldo', value: mesSelecionado?.projecaoSaldo ?? 0, color: SYN_COLORS.primary, icon: <RiseOutlined /> },
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
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0, fontWeight: 700 }}>Fluxo de Caixa</Title>
        <Text type="secondary">Controle e projeção de entradas e saídas</Text>
      </div>

      {/* Navegação de meses */}
      <Card style={{ marginBottom: 24, borderRadius: 12 }} styles={{ body: { padding: '14px 20px' } }}>
        <Row align="middle" gutter={16} wrap>
          <Col>
            <Text type="secondary" style={{ fontSize: 12 }}>Mês</Text>
            <Space style={{ display: 'flex', marginTop: 4 }}>
              <Button icon={<LeftOutlined />} size="small" disabled={mesIdx === 0} onClick={() => setMesIdx(i => i - 1)} />
              <Select
                value={mesIdx}
                onChange={setMesIdx}
                style={{ width: 120 }}
                options={fluxoMensal.map((m, i) => ({ label: m.mesLabel, value: i }))}
              />
              <Button icon={<RightOutlined />} size="small" disabled={mesIdx === fluxoMensal.length - 1} onClick={() => setMesIdx(i => i + 1)} />
            </Space>
          </Col>
          <Col>
            <Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Tipo</Text>
            <Select
              allowClear placeholder="Todos" style={{ width: 130 }}
              value={filterTipo || undefined}
              onChange={v => setFilterTipo((v ?? '') as FluxoTipo | '')}
              options={[{ label: 'Entrada', value: 'entrada' }, { label: 'Saída', value: 'saida' }]}
            />
          </Col>
          <Col>
            <Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Status</Text>
            <Select
              allowClear placeholder="Todos" style={{ width: 130 }}
              value={filterStatus || undefined}
              onChange={v => setFilterStatus((v ?? '') as FluxoStatusType | '')}
              options={[{ label: 'Realizado', value: 'realizado' }, { label: 'Previsto', value: 'previsto' }]}
            />
          </Col>
          <Col>
            <Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Categoria</Text>
            <Select
              allowClear placeholder="Todas" style={{ width: 190 }}
              value={filterCategoria || undefined}
              onChange={v => setFilterCategoria(v ?? '')}
              options={categorias.map(c => ({ label: c, value: c }))}
            />
          </Col>
        </Row>
      </Card>

      {/* Cards realizados */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        {summaryCards.map(card => (
          <Col xs={12} sm={12} lg={6} key={card.label}>
            <Card style={{ borderRadius: 12, height: '100%' }} styles={{ body: { padding: '14px 16px' } }}>
              <Space size={10} align="center">
                <div style={{ width: 36, height: 36, borderRadius: 8, background: `${card.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: card.color }}>
                  {card.icon}
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>{card.label}</Text>
                  <Text style={{ fontSize: 16, fontWeight: 700, color: card.color }}>{formatBRL(card.value)}</Text>
                </div>
              </Space>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Cards projeção */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        {projCards.map(card => (
          <Col xs={24} sm={8} key={card.label}>
            <Card style={{ borderRadius: 12, border: `1px dashed ${card.color}60`, height: '100%' }} styles={{ body: { padding: '14px 16px' } }}>
              <Space size={10} align="center">
                <div style={{ width: 36, height: 36, borderRadius: 8, background: `${card.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: card.color }}>
                  {card.icon}
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>{card.label}</Text>
                  <Text style={{ fontSize: 16, fontWeight: 700, color: card.color }}>{formatBRL(card.value)}</Text>
                </div>
              </Space>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Gráfico de linha */}
      <Card title={<Title level={5} style={{ margin: 0 }}>Evolução do Saldo</Title>} style={{ marginBottom: 24, borderRadius: 12 }}>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={lineChartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis dataKey="mes" tick={{ fontSize: 12, fill: SYN_COLORS.textSecondary }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={formatCompactBRL} tick={{ fontSize: 12, fill: SYN_COLORS.textSecondary }} axisLine={false} tickLine={false} width={75} />
            <ReTooltip formatter={(v, name) => [formatBRL(Number(v)), name === 'saldoRealizado' ? 'Saldo Realizado' : 'Projeção de Saldo']} contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB' }} />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} formatter={(v) => v === 'saldoRealizado' ? 'Saldo Realizado' : 'Projeção de Saldo'} />
            <Line type="monotone" dataKey="saldoRealizado" stroke={SYN_COLORS.success} strokeWidth={2.5} dot={{ r: 4, fill: SYN_COLORS.success }} activeDot={{ r: 6 }} connectNulls={false} />
            <Line type="monotone" dataKey="projecaoSaldo" stroke={SYN_COLORS.primary} strokeWidth={2} strokeDasharray="6 3" dot={{ r: 3, fill: SYN_COLORS.primary }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Tabela de movimentações */}
      <Card
        title={
          <Space>
            <Title level={5} style={{ margin: 0 }}>Movimentações — {mesSelecionado?.mesLabel}</Title>
            <Tag color="blue" style={{ borderRadius: 6 }}>{movimentacoesFiltradas.length} registros</Tag>
          </Space>
        }
        style={{ borderRadius: 12 }}
      >
        {movimentacoesFiltradas.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={<Text type="secondary">Nenhuma movimentação para este período.</Text>} style={{ padding: '24px 0' }} />
        ) : (
          <Table
            dataSource={movimentacoesFiltradas}
            columns={columns}
            rowKey="id"
            size="small"
            pagination={{ pageSize: 10, showSizeChanger: false }}
            scroll={{ x: 700 }}
            summary={data => {
              const totalEnt = data.filter(r => r.tipo === 'entrada').reduce((s, r) => s + r.valor, 0)
              const totalSai = data.filter(r => r.tipo === 'saida').reduce((s, r) => s + r.valor, 0)
              return (
                <Table.Summary.Row style={{ fontWeight: 600, background: '#F9FAFB' }}>
                  <Table.Summary.Cell index={0} colSpan={4}><Text strong>Total do período filtrado</Text></Table.Summary.Cell>
                  <Table.Summary.Cell index={4} align="right">
                    <Text style={{ color: SYN_COLORS.success }}>+{formatBRL(totalEnt)}</Text>{' / '}
                    <Text style={{ color: SYN_COLORS.danger }}>-{formatBRL(totalSai)}</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={5} />
                </Table.Summary.Row>
              )
            }}
          />
        )}
      </Card>
    </div>
  )
}
