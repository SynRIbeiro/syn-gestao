import { useState, useMemo, useEffect } from 'react'
import {
  Table, Button, Modal, Form, Input, InputNumber, Select, DatePicker,
  Row, Col, Card, Typography, Tag, Space, Drawer, Descriptions, App, Spin,
} from 'antd'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined,
  RiseOutlined, FallOutlined, DollarOutlined, BarChartOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip as ReTooltip, Cell,
} from 'recharts'
import type { ROIInvestimento, ROIStatus } from '@/types'
import type { DbInvestimento } from '@/types/database'
import { formatBRL } from '@/utils/formatters'
import { formatDateBR, dayjs } from '@/utils/dateHelpers'
import { SYN_COLORS } from '@/styles/theme'
import { supabase } from '@/lib/supabase'
import { EMPRESA_ID } from '@/lib/constants'

const { Title, Text } = Typography
const { RangePicker } = DatePicker

const ROI_CATEGORIAS = [
  'Marketing Digital', 'Software', 'Treinamento',
  'Infraestrutura', 'Publicidade', 'Outros',
]

type ModalMode = 'create' | 'edit' | 'view'

interface ROIFormValues {
  nome: string
  categoria: string
  valorInvestido: number
  receitaGerada: number
  dataInicial: dayjs.Dayjs
  dataFinal: dayjs.Dayjs
  status: ROIStatus
}

const statusConfig: Record<ROIStatus, { color: string; label: string }> = {
  ativo: { color: 'processing', label: 'Ativo' },
  concluido: { color: 'success', label: 'Concluído' },
  cancelado: { color: 'error', label: 'Cancelado' },
}

function calcROI(valorInvestido: number, receitaGerada: number): number {
  if (valorInvestido === 0) return 0
  return ((receitaGerada - valorInvestido) / valorInvestido) * 100
}

function dbToROI(row: DbInvestimento): ROIInvestimento {
  return {
    id: row.id,
    nome: row.nome,
    categoria: row.categoria ?? 'Outros',
    valorInvestido: Number(row.valor_investido),
    receitaGerada: Number(row.receita_gerada ?? 0),
    dataInicial: row.data_inicial ?? '',
    dataFinal: row.data_final ?? '',
    status: (row.status as ROIStatus) ?? 'ativo',
  }
}

export default function ROI() {
  const { modal, message } = App.useApp()
  const [form] = Form.useForm<ROIFormValues>()

  const [investimentos, setInvestimentos] = useState<ROIInvestimento[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<ModalMode>('create')
  const [selected, setSelected] = useState<ROIInvestimento | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const [filterRange, setFilterRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null)
  const [filterCategoria, setFilterCategoria] = useState('')
  const [filterStatus, setFilterStatus] = useState<ROIStatus | ''>('')

  async function fetchInvestimentos() {
    setLoading(true)
    const { data, error } = await supabase
      .from('investimentos')
      .select('*')
      .eq('empresa_id', EMPRESA_ID)
      .order('data_inicial', { ascending: false })
    if (error) {
      message.error('Erro ao carregar investimentos.')
    } else {
      setInvestimentos(((data ?? []) as unknown as DbInvestimento[]).map(dbToROI))
    }
    setLoading(false)
  }

  useEffect(() => { fetchInvestimentos() }, [])

  const filtered = useMemo(() => {
    return investimentos.filter(inv => {
      if (filterCategoria && inv.categoria !== filterCategoria) return false
      if (filterStatus && inv.status !== filterStatus) return false
      if (filterRange && inv.dataInicial) {
        const d = dayjs(inv.dataInicial)
        if (d.isBefore(filterRange[0], 'day') || d.isAfter(filterRange[1], 'day')) return false
      }
      return true
    })
  }, [investimentos, filterCategoria, filterStatus, filterRange])

  const totals = useMemo(() => {
    const totalInvestido = filtered.reduce((s, i) => s + i.valorInvestido, 0)
    const totalReceita = filtered.reduce((s, i) => s + i.receitaGerada, 0)
    const totalLucro = totalReceita - totalInvestido
    const roiMedio = totalInvestido > 0 ? (totalLucro / totalInvestido) * 100 : 0
    return { totalInvestido, totalReceita, totalLucro, roiMedio }
  }, [filtered])

  const chartData = useMemo(() =>
    [...filtered]
      .filter(i => i.valorInvestido > 0)
      .map(i => ({ name: i.nome.length > 28 ? i.nome.slice(0, 28) + '…' : i.nome, roi: calcROI(i.valorInvestido, i.receitaGerada) }))
      .sort((a, b) => b.roi - a.roi),
    [filtered],
  )

  function openCreate() {
    setModalMode('create')
    setSelected(null)
    form.resetFields()
    form.setFieldsValue({ status: 'ativo', dataInicial: dayjs(), dataFinal: dayjs().add(1, 'month') })
    setModalOpen(true)
  }

  function openEdit(inv: ROIInvestimento) {
    setModalMode('edit')
    setSelected(inv)
    form.setFieldsValue({
      ...inv,
      dataInicial: inv.dataInicial ? dayjs(inv.dataInicial) : dayjs(),
      dataFinal: inv.dataFinal ? dayjs(inv.dataFinal) : dayjs(),
    })
    setModalOpen(true)
  }

  function openView(inv: ROIInvestimento) {
    setSelected(inv)
    setDrawerOpen(true)
  }

  function handleDelete(inv: ROIInvestimento) {
    modal.confirm({
      title: 'Excluir investimento?',
      content: `"${inv.nome}" será removido permanentemente.`,
      okText: 'Excluir', okType: 'danger', cancelText: 'Cancelar',
      onOk: async () => {
        const { error } = await supabase.from('investimentos').delete().eq('id', inv.id)
        if (error) { message.error('Erro ao excluir investimento.'); return }
        setInvestimentos(prev => prev.filter(i => i.id !== inv.id))
        message.success('Investimento excluído.')
      },
    })
  }

  async function handleModalOk() {
    const values = await form.validateFields()
    const payload = {
      nome: values.nome,
      categoria: values.categoria,
      valor_investido: values.valorInvestido,
      receita_gerada: values.receitaGerada ?? 0,
      data_inicial: values.dataInicial.format('YYYY-MM-DD'),
      data_final: values.dataFinal.format('YYYY-MM-DD'),
      status: values.status,
    }

    if (modalMode === 'create') {
      const { data: rawIns, error } = await supabase
        .from('investimentos')
        .insert({ empresa_id: EMPRESA_ID, ...payload } as Record<string, unknown>)
        .select()
        .single()
      if (error) { message.error('Erro ao criar investimento.'); return }
      setInvestimentos(prev => [dbToROI(rawIns as unknown as DbInvestimento), ...prev])
      message.success('Investimento criado.')
    } else if (selected) {
      const { data: rawUpd, error } = await supabase
        .from('investimentos')
        .update(payload as Record<string, unknown>)
        .eq('id', selected.id)
        .select()
        .single()
      if (error) { message.error('Erro ao atualizar investimento.'); return }
      setInvestimentos(prev => prev.map(i => i.id === selected.id ? dbToROI(rawUpd as unknown as DbInvestimento) : i))
      message.success('Investimento atualizado.')
    }
    setModalOpen(false)
    form.resetFields()
  }

  const columns: ColumnsType<ROIInvestimento> = [
    { title: 'Nome', dataIndex: 'nome', key: 'nome', render: (v: string) => <Text strong style={{ fontSize: 13 }}>{v}</Text> },
    { title: 'Categoria', dataIndex: 'categoria', key: 'categoria', render: (v: string) => <Tag color="purple" style={{ borderRadius: 6 }}>{v}</Tag> },
    { title: 'Investido', dataIndex: 'valorInvestido', key: 'valorInvestido', align: 'right', render: (v: number) => <Text style={{ color: SYN_COLORS.danger }}>{formatBRL(v)}</Text> },
    { title: 'Receita Gerada', dataIndex: 'receitaGerada', key: 'receitaGerada', align: 'right', render: (v: number) => <Text style={{ color: SYN_COLORS.success }}>{formatBRL(v)}</Text> },
    {
      title: 'ROI', key: 'roi', align: 'right',
      render: (_: unknown, record: ROIInvestimento) => {
        const roi = calcROI(record.valorInvestido, record.receitaGerada)
        return (
          <Text style={{ fontWeight: 700, color: roi >= 0 ? SYN_COLORS.success : SYN_COLORS.danger }}>
            {roi >= 0 ? <RiseOutlined /> : <FallOutlined />}{' '}{roi.toFixed(1).replace('.', ',')}%
          </Text>
        )
      },
    },
    { title: 'Início', dataIndex: 'dataInicial', key: 'dataInicial', render: (v: string) => v ? formatDateBR(v) : '—' },
    { title: 'Fim', dataIndex: 'dataFinal', key: 'dataFinal', render: (v: string) => v ? formatDateBR(v) : '—' },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (v: ROIStatus) => <Tag color={statusConfig[v].color} style={{ borderRadius: 6 }}>{statusConfig[v].label}</Tag> },
    {
      title: 'Ações', key: 'acoes', align: 'center',
      render: (_: unknown, record: ROIInvestimento) => (
        <Space size={4}>
          <Button size="small" type="text" icon={<EyeOutlined />} onClick={() => openView(record)} />
          <Button size="small" type="text" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record)} />
        </Space>
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
          <Title level={3} style={{ margin: 0, fontWeight: 700 }}>ROI</Title>
          <Text type="secondary">Retorno sobre Investimento</Text>
        </Col>
        <Col>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Novo Investimento</Button>
        </Col>
      </Row>

      {/* Filtros */}
      <Card style={{ marginBottom: 24, borderRadius: 12 }} styles={{ body: { padding: '14px 20px' } }}>
        <Space wrap size={16}>
          <div>
            <Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Período</Text>
            <RangePicker format="DD/MM/YYYY" onChange={v => setFilterRange(v as [dayjs.Dayjs, dayjs.Dayjs] | null)} placeholder={['Data inicial', 'Data final']} />
          </div>
          <div>
            <Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Categoria</Text>
            <Select allowClear placeholder="Todas" style={{ width: 200 }} value={filterCategoria || undefined} onChange={v => setFilterCategoria(v ?? '')} options={ROI_CATEGORIAS.map(c => ({ label: c, value: c }))} />
          </div>
          <div>
            <Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Status</Text>
            <Select allowClear placeholder="Todos" style={{ width: 160 }} value={filterStatus || undefined} onChange={v => setFilterStatus((v ?? '') as ROIStatus | '')}
              options={[{ label: 'Ativo', value: 'ativo' }, { label: 'Concluído', value: 'concluido' }, { label: 'Cancelado', value: 'cancelado' }]}
            />
          </div>
        </Space>
      </Card>

      {/* Cards de resumo */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        {[
          { label: 'Investimento Total', value: formatBRL(totals.totalInvestido), icon: <DollarOutlined />, color: SYN_COLORS.danger },
          { label: 'Receita Gerada', value: formatBRL(totals.totalReceita), icon: <RiseOutlined />, color: SYN_COLORS.success },
          { label: 'Lucro Gerado', value: formatBRL(totals.totalLucro), icon: <RiseOutlined />, color: totals.totalLucro >= 0 ? SYN_COLORS.success : SYN_COLORS.danger },
          { label: 'ROI Médio', value: `${totals.roiMedio.toFixed(1).replace('.', ',')}%`, icon: <BarChartOutlined />, color: totals.roiMedio >= 0 ? SYN_COLORS.primary : SYN_COLORS.danger },
        ].map(card => (
          <Col xs={24} sm={12} lg={6} key={card.label}>
            <Card style={{ borderRadius: 12, height: '100%' }} styles={{ body: { padding: '16px 20px' } }}>
              <Space size={12} align="center">
                <div style={{ width: 40, height: 40, borderRadius: 10, background: `${card.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: card.color }}>
                  {card.icon}
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>{card.label}</Text>
                  <Text style={{ fontSize: 18, fontWeight: 700, color: card.color }}>{card.value}</Text>
                </div>
              </Space>
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={24} style={{ marginBottom: 24 }}>
        <Col xs={24} xl={10}>
          <Card title={<Title level={5} style={{ margin: 0 }}>ROI por Investimento</Title>} style={{ borderRadius: 12, height: '100%' }}>
            {chartData.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <Text type="secondary">Nenhum investimento cadastrado</Text>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(chartData.length * 40, 200)}>
                <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 40, left: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F3F4F6" />
                  <XAxis type="number" tickFormatter={v => `${Number(v).toFixed(0)}%`} tick={{ fontSize: 11, fill: SYN_COLORS.textSecondary }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: SYN_COLORS.textPrimary }} axisLine={false} tickLine={false} width={160} />
                  <ReTooltip formatter={(v) => [`${Number(v).toFixed(1).replace('.', ',')}%`, 'ROI']} contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB' }} />
                  <Bar dataKey="roi" radius={[0, 4, 4, 0]}>
                    {chartData.map((entry, i) => <Cell key={i} fill={entry.roi >= 0 ? SYN_COLORS.success : SYN_COLORS.danger} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </Col>

        <Col xs={24} xl={14}>
          <Card title={<Title level={5} style={{ margin: 0 }}>Investimentos ({filtered.length})</Title>} style={{ borderRadius: 12 }}>
            <Table dataSource={filtered} columns={columns} rowKey="id" size="small" pagination={{ pageSize: 8, showSizeChanger: false }} scroll={{ x: 900 }} locale={{ emptyText: <div style={{ padding: 40, textAlign: 'center' }}><Text type="secondary">Nenhum investimento cadastrado.</Text></div> }} />
          </Card>
        </Col>
      </Row>

      {/* Modal criar/editar */}
      <Modal
        title={modalMode === 'create' ? 'Novo Investimento' : 'Editar Investimento'}
        open={modalOpen}
        onOk={handleModalOk}
        onCancel={() => { setModalOpen(false); form.resetFields() }}
        okText={modalMode === 'create' ? 'Criar' : 'Salvar'}
        cancelText="Cancelar"
        width={560}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="nome" label="Nome do Investimento" rules={[{ required: true, message: 'Informe o nome' }]}>
            <Input placeholder="Ex: Campanha Google Ads — Q3/2026" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="categoria" label="Categoria" rules={[{ required: true, message: 'Selecione a categoria' }]}>
                <Select placeholder="Selecionar" options={ROI_CATEGORIAS.map(c => ({ label: c, value: c }))} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="status" label="Status" rules={[{ required: true, message: 'Selecione o status' }]}>
                <Select placeholder="Selecionar" options={[{ label: 'Ativo', value: 'ativo' }, { label: 'Concluído', value: 'concluido' }, { label: 'Cancelado', value: 'cancelado' }]} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="valorInvestido" label="Valor Investido (R$)" rules={[{ required: true, message: 'Informe o valor' }]}>
                <InputNumber style={{ width: '100%' }} min={0} precision={2} decimalSeparator="," prefix="R$" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="receitaGerada" label="Receita Gerada (R$)">
                <InputNumber style={{ width: '100%' }} min={0} precision={2} decimalSeparator="," prefix="R$" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="dataInicial" label="Data Inicial" rules={[{ required: true, message: 'Informe a data' }]}>
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="dataFinal" label="Data Final" rules={[{ required: true, message: 'Informe a data' }]}>
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Drawer de visualização */}
      <Drawer
        title="Detalhes do Investimento"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={480}
        extra={<Button type="primary" icon={<EditOutlined />} onClick={() => { setDrawerOpen(false); if (selected) openEdit(selected) }}>Editar</Button>}
      >
        {selected && (
          <Descriptions column={1} bordered size="small" style={{ marginBottom: 20 }}>
            <Descriptions.Item label="Nome">{selected.nome}</Descriptions.Item>
            <Descriptions.Item label="Categoria"><Tag color="purple" style={{ borderRadius: 6 }}>{selected.categoria}</Tag></Descriptions.Item>
            <Descriptions.Item label="Status"><Tag color={statusConfig[selected.status].color} style={{ borderRadius: 6 }}>{statusConfig[selected.status].label}</Tag></Descriptions.Item>
            <Descriptions.Item label="Valor Investido"><Text style={{ color: SYN_COLORS.danger, fontWeight: 600 }}>{formatBRL(selected.valorInvestido)}</Text></Descriptions.Item>
            <Descriptions.Item label="Receita Gerada"><Text style={{ color: SYN_COLORS.success, fontWeight: 600 }}>{formatBRL(selected.receitaGerada)}</Text></Descriptions.Item>
            <Descriptions.Item label="Lucro Gerado"><Text style={{ fontWeight: 600, color: selected.receitaGerada - selected.valorInvestido >= 0 ? SYN_COLORS.success : SYN_COLORS.danger }}>{formatBRL(selected.receitaGerada - selected.valorInvestido)}</Text></Descriptions.Item>
            <Descriptions.Item label="ROI">
              {(() => {
                const roi = calcROI(selected.valorInvestido, selected.receitaGerada)
                return <Text style={{ fontWeight: 700, fontSize: 16, color: roi >= 0 ? SYN_COLORS.success : SYN_COLORS.danger }}>{roi >= 0 ? <RiseOutlined /> : <FallOutlined />}{' '}{roi.toFixed(2).replace('.', ',')}%</Text>
              })()}
            </Descriptions.Item>
            <Descriptions.Item label="Data Inicial">{selected.dataInicial ? formatDateBR(selected.dataInicial) : '—'}</Descriptions.Item>
            <Descriptions.Item label="Data Final">{selected.dataFinal ? formatDateBR(selected.dataFinal) : '—'}</Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>
    </div>
  )
}
