import { useState, useMemo } from 'react'
import {
  Row, Col, Card, Typography, Select, Table, Tag, Space, Button, Alert, Empty,
} from 'antd'
import {
  LeftOutlined, RightOutlined, ArrowUpOutlined, ArrowDownOutlined,
  WalletOutlined, RiseOutlined, InfoCircleOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip as ReTooltip, Legend,
} from 'recharts'
import type { FluxoMovimentacao, FluxoTipo, FluxoStatusType, FluxoMensal } from '@/types'
import { formatBRL, formatCompactBRL } from '@/utils/formatters'
import { formatDateBR, dayjs } from '@/utils/dateHelpers'
import { SYN_COLORS } from '@/styles/theme'

const { Title, Text } = Typography

const FLUXO_VAZIO: FluxoMensal = {
  mes: dayjs().format('YYYY-MM-DD'),
  mesLabel: dayjs().locale('pt-br').format('MMM/YY').replace(/^\w/, c => c.toUpperCase()),
  saldoInicial: 0,
  entradasRealizadas: 0,
  saidasRealizadas: 0,
  saldoFinal: 0,
  entradasPrevistas: 0,
  saidasPrevistas: 0,
  projecaoSaldo: 0,
}

const fluxoMensal: FluxoMensal[] = [FLUXO_VAZIO]
const fluxoMovimentacoes: FluxoMovimentacao[] = []

const MESES = fluxoMensal.map((m, i) => ({ label: m.mesLabel, value: i }))

const TIPO_COLORS: Record<FluxoTipo, string> = {
  entrada: SYN_COLORS.success,
  saida: SYN_COLORS.danger,
}

export default function FluxoCaixa() {
  const [mesIdx, setMesIdx] = useState(0)
  const [filterTipo, setFilterTipo] = useState<FluxoTipo | ''>('')
  const [filterStatus, setFilterStatus] = useState<FluxoStatusType | ''>('')
  const [filterCategoria, setFilterCategoria] = useState('')

  const mesSelecionado = fluxoMensal[mesIdx] ?? FLUXO_VAZIO

  const categorias = useMemo(() =>
    [...new Set(fluxoMovimentacoes.map(m => m.categoria))].sort(),
    [],
  )

  const movimentacoesFiltradas = useMemo(() => {
    const mesStr = mesSelecionado.mes.slice(0, 7)
    return fluxoMovimentacoes.filter(m => {
      if (!m.data.startsWith(mesStr)) return false
      if (filterTipo && m.tipo !== filterTipo) return false
      if (filterStatus && m.status !== filterStatus) return false
      if (filterCategoria && m.categoria !== filterCategoria) return false
      return true
    })
  }, [mesSelecionado, filterTipo, filterStatus, filterCategoria])

  const lineChartData = useMemo(() =>
    fluxoMensal.map(m => ({
      mes: m.mesLabel,
      saldoRealizado: m.saldoFinal > m.saldoInicial ? m.saldoFinal : null,
      projecaoSaldo: m.projecaoSaldo,
    })),
    [],
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
        <Tag
          color={v === 'entrada' ? 'success' : 'error'}
          style={{ borderRadius: 6 }}
        >
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
        <Text style={{ fontWeight: 600, color: TIPO_COLORS[record.tipo] }}>
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
    { label: 'Saldo Inicial', value: mesSelecionado.saldoInicial, color: SYN_COLORS.info, icon: <WalletOutlined /> },
    { label: 'Entradas Realizadas', value: mesSelecionado.entradasRealizadas, color: SYN_COLORS.success, icon: <ArrowUpOutlined /> },
    { label: 'Saídas Realizadas', value: mesSelecionado.saidasRealizadas, color: SYN_COLORS.danger, icon: <ArrowDownOutlined /> },
    { label: 'Saldo Final', value: mesSelecionado.saldoFinal, color: SYN_COLORS.primary, icon: <WalletOutlined /> },
  ]

  const projCards = [
    { label: 'Entradas Previstas', value: mesSelecionado.entradasPrevistas, color: '#16A34A', icon: <ArrowUpOutlined /> },
    { label: 'Saídas Previstas', value: mesSelecionado.saidasPrevistas, color: '#DC2626', icon: <ArrowDownOutlined /> },
    { label: 'Projeção de Saldo', value: mesSelecionado.projecaoSaldo, color: SYN_COLORS.primary, icon: <RiseOutlined /> },
  ]

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0, fontWeight: 700 }}>Fluxo de Caixa</Title>
        <Text type="secondary">Controle e projeção de entradas e saídas</Text>
      </div>

      {/* Banner informativo */}
      <Alert
        icon={<InfoCircleOutlined />}
        message="Nenhuma movimentação cadastrada"
        description="O fluxo de caixa será preenchido automaticamente conforme você registrar entradas e saídas."
        type="info"
        showIcon
        style={{ marginBottom: 24, borderRadius: 10 }}
      />

      {/* Navegação de meses */}
      <Card style={{ marginBottom: 24, borderRadius: 12 }} styles={{ body: { padding: '14px 20px' } }}>
        <Row align="middle" gutter={16} wrap>
          <Col>
            <Text type="secondary" style={{ fontSize: 12 }}>Mês</Text>
            <Space style={{ display: 'flex', marginTop: 4 }}>
              <Button
                icon={<LeftOutlined />}
                size="small"
                disabled={mesIdx === 0}
                onClick={() => setMesIdx(i => i - 1)}
              />
              <Select
                value={mesIdx}
                onChange={setMesIdx}
                style={{ width: 120 }}
                options={MESES}
              />
              <Button
                icon={<RightOutlined />}
                size="small"
                disabled={mesIdx === fluxoMensal.length - 1}
                onClick={() => setMesIdx(i => i + 1)}
              />
            </Space>
          </Col>
          <Col>
            <Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Tipo</Text>
            <Select
              allowClear
              placeholder="Todos"
              style={{ width: 130 }}
              value={filterTipo || undefined}
              onChange={v => setFilterTipo((v ?? '') as FluxoTipo | '')}
              options={[
                { label: 'Entrada', value: 'entrada' },
                { label: 'Saída', value: 'saida' },
              ]}
            />
          </Col>
          <Col>
            <Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Status</Text>
            <Select
              allowClear
              placeholder="Todos"
              style={{ width: 130 }}
              value={filterStatus || undefined}
              onChange={v => setFilterStatus((v ?? '') as FluxoStatusType | '')}
              options={[
                { label: 'Realizado', value: 'realizado' },
                { label: 'Previsto', value: 'previsto' },
              ]}
            />
          </Col>
          <Col>
            <Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Categoria</Text>
            <Select
              allowClear
              placeholder="Todas"
              style={{ width: 190 }}
              value={filterCategoria || undefined}
              onChange={v => setFilterCategoria(v ?? '')}
              options={categorias.map(c => ({ label: c, value: c }))}
            />
          </Col>
        </Row>
      </Card>

      {/* Cards de resumo realizados */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        {summaryCards.map(card => (
          <Col xs={12} sm={12} lg={6} key={card.label}>
            <Card style={{ borderRadius: 12, height: '100%' }} styles={{ body: { padding: '14px 16px' } }}>
              <Space size={10} align="center">
                <div style={{
                  width: 36, height: 36, borderRadius: 8,
                  background: `${card.color}20`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, color: card.color,
                }}>
                  {card.icon}
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>{card.label}</Text>
                  <Text style={{ fontSize: 16, fontWeight: 700, color: card.color }}>
                    {formatBRL(card.value)}
                  </Text>
                </div>
              </Space>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Cards de projeção */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        {projCards.map(card => (
          <Col xs={24} sm={8} key={card.label}>
            <Card
              style={{ borderRadius: 12, border: `1px dashed ${card.color}60`, height: '100%' }}
              styles={{ body: { padding: '14px 16px' } }}
            >
              <Space size={10} align="center">
                <div style={{
                  width: 36, height: 36, borderRadius: 8,
                  background: `${card.color}15`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, color: card.color,
                }}>
                  {card.icon}
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>{card.label}</Text>
                  <Text style={{ fontSize: 16, fontWeight: 700, color: card.color }}>
                    {formatBRL(card.value)}
                  </Text>
                </div>
              </Space>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Gráfico de linha */}
      <Card
        title={<Title level={5} style={{ margin: 0 }}>Evolução do Saldo</Title>}
        style={{ marginBottom: 24, borderRadius: 12 }}
      >
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={lineChartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis
              dataKey="mes"
              tick={{ fontSize: 12, fill: SYN_COLORS.textSecondary }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={formatCompactBRL}
              tick={{ fontSize: 12, fill: SYN_COLORS.textSecondary }}
              axisLine={false}
              tickLine={false}
              width={75}
            />
            <ReTooltip
              formatter={(v, name) => [
                formatBRL(Number(v)),
                name === 'saldoRealizado' ? 'Saldo Realizado' : 'Projeção de Saldo',
              ]}
              contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB' }}
            />
            <Legend
              wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
              formatter={(v) => v === 'saldoRealizado' ? 'Saldo Realizado' : 'Projeção de Saldo'}
            />
            <Line
              type="monotone"
              dataKey="saldoRealizado"
              stroke={SYN_COLORS.success}
              strokeWidth={2.5}
              dot={{ r: 4, fill: SYN_COLORS.success }}
              activeDot={{ r: 6 }}
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="projecaoSaldo"
              stroke={SYN_COLORS.primary}
              strokeWidth={2}
              strokeDasharray="6 3"
              dot={{ r: 3, fill: SYN_COLORS.primary }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Tabela de movimentações */}
      <Card
        title={
          <Space>
            <Title level={5} style={{ margin: 0 }}>Movimentações — {mesSelecionado.mesLabel}</Title>
            <Tag color="blue" style={{ borderRadius: 6 }}>{movimentacoesFiltradas.length} registros</Tag>
          </Space>
        }
        style={{ borderRadius: 12 }}
      >
        {movimentacoesFiltradas.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <Text type="secondary">
                Nenhuma movimentação cadastrada para este período.
                <br />
                Cadastre entradas e saídas para visualizar o fluxo.
              </Text>
            }
            style={{ padding: '24px 0' }}
          />
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
                  <Table.Summary.Cell index={0} colSpan={4}>
                    <Text strong>Total do período filtrado</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={4} align="right">
                    <Text style={{ color: SYN_COLORS.success }}>+{formatBRL(totalEnt)}</Text>
                    {' / '}
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
