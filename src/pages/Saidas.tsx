import { useState, useMemo, useEffect } from 'react'
import {
  Table, Button, Modal, Form, Input, InputNumber, Select, DatePicker,
  Space, Tag, Typography, Row, Col, Card, Drawer, Descriptions, App, Spin,
} from 'antd'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined,
  CheckCircleOutlined, SearchOutlined, ArrowDownOutlined,
  ClockCircleOutlined, ExclamationCircleOutlined, DollarOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'

import type { Saida, SaidaStatus } from '@/types'
import type { DbSaida } from '@/types/database'
import { supabase } from '@/lib/supabase'
import { EMPRESA_ID } from '@/lib/constants'
import { useEmpresaId } from '@/hooks/useEmpresaId'
import { formatBRL } from '@/utils/formatters'
import { formatDateBR, dayjs as djsInstance } from '@/utils/dateHelpers'
import { SYN_COLORS } from '@/styles/theme'

const { Title, Text } = Typography
const { RangePicker } = DatePicker
const { TextArea } = Input

type ModalMode = 'create' | 'edit' | 'view'

interface SaidaFormValues {
  descricao: string
  fornecedor: string
  categoriaId: string | null
  centroCustoId: string | null
  contaBancariaId: string | null
  valor: number
  vencimento: dayjs.Dayjs
  formaPagamento: string
  status: SaidaStatus
  observacoes?: string
}

interface RelOption { id: string; nome: string }

type SaidaJoinRow = DbSaida & {
  categorias: { id: string; nome: string } | null
  centros_custo: { id: string; nome: string } | null
  contas_bancarias: { id: string; nome: string } | null
}

const FORMAS_PAGAMENTO = [
  'PIX', 'Transferência Bancária', 'Boleto',
  'Cartão de Crédito', 'Cartão de Débito', 'Dinheiro', 'Débito Automático',
]

const statusConfig: Record<SaidaStatus, { color: string; label: string; icon: React.ReactNode }> = {
  pago: { color: 'success', label: 'Pago', icon: <CheckCircleOutlined /> },
  pendente: { color: 'warning', label: 'Pendente', icon: <ClockCircleOutlined /> },
  atrasado: { color: 'error', label: 'Atrasado', icon: <ExclamationCircleOutlined /> },
}

const EMPTY_MSG = (label: string, path: string) => (
  <div style={{ textAlign: 'center', padding: '6px 0', fontSize: 12, color: '#9CA3AF' }}>
    Nenhum(a) {label} cadastrado(a).{' '}
    <a href={path} rel="noreferrer" style={{ color: SYN_COLORS.primary }}>Cadastrar agora</a>
  </div>
)

function dbToSaida(row: SaidaJoinRow): Saida {
  return {
    id: row.id,
    descricao: row.descricao,
    fornecedor: row.fornecedor ?? '',
    categoriaId: row.categoria_id,
    categoriaNome: row.categorias?.nome ?? '',
    centroCustoId: row.centro_custo_id,
    centroCustoNome: row.centros_custo?.nome ?? '',
    contaBancariaId: row.conta_bancaria_id,
    contaBancariaNome: row.contas_bancarias?.nome ?? '',
    valor: Number(row.valor),
    vencimento: row.data_vencimento ?? '',
    formaPagamento: row.forma_pagamento ?? '',
    status: row.status,
    observacoes: row.observacoes ?? undefined,
  }
}

const SELECT_QUERY = `
  *,
  categorias(id, nome),
  centros_custo(id, nome),
  contas_bancarias(id, nome)
`.trim()

export default function Saidas() {
  const { modal, message } = App.useApp()
  const [form] = Form.useForm<SaidaFormValues>()
  const { empresaId, loading: empresaLoading, errorType: empresaError } = useEmpresaId()

  const [saidas, setSaidas] = useState<Saida[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<ModalMode>('create')
  const [selected, setSelected] = useState<Saida | null>(null)

  const [categoriasList, setCategoriasList] = useState<RelOption[]>([])
  const [centrosCustoList, setCentrosCustoList] = useState<RelOption[]>([])
  const [contasList, setContasList] = useState<RelOption[]>([])

  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<SaidaStatus | ''>('')
  const [filterCategoria, setFilterCategoria] = useState('')
  const [filterRange, setFilterRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null)

  useEffect(() => {
    async function fetchAll() {
      setLoading(true)
      const [saidasRes, categoriasRes, centrosRes, contasRes] = await Promise.all([
        supabase.from('saidas').select(SELECT_QUERY).eq('empresa_id', EMPRESA_ID).order('data_vencimento', { ascending: false }),
        supabase.from('categorias').select('id, nome').eq('empresa_id', EMPRESA_ID).in('tipo', ['saida', 'ambos']).eq('ativo', true).order('nome'),
        supabase.from('centros_custo').select('id, nome').eq('empresa_id', EMPRESA_ID).eq('ativo', true).order('nome'),
        supabase.from('contas_bancarias').select('id, nome').eq('empresa_id', EMPRESA_ID).eq('ativo', true).order('nome'),
      ])

      if (saidasRes.error) {
        message.error('Erro ao carregar saídas.')
      } else {
        setSaidas(((saidasRes.data ?? []) as unknown as SaidaJoinRow[]).map(dbToSaida))
      }

      setCategoriasList((categoriasRes.data ?? []) as unknown as RelOption[])
      setCentrosCustoList((centrosRes.data ?? []) as unknown as RelOption[])
      setContasList((contasRes.data ?? []) as unknown as RelOption[])
      setLoading(false)
    }
    fetchAll()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const totals = useMemo(() => ({
    pago: saidas.filter(s => s.status === 'pago').reduce((acc, s) => acc + s.valor, 0),
    pendente: saidas.filter(s => s.status === 'pendente').reduce((acc, s) => acc + s.valor, 0),
    atrasado: saidas.filter(s => s.status === 'atrasado').reduce((acc, s) => acc + s.valor, 0),
  }), [saidas])

  const categoriasFilter = useMemo(
    () => [...new Set(saidas.map(s => s.categoriaNome).filter(Boolean))].sort(),
    [saidas]
  )

  const filtered = useMemo(() => {
    return saidas.filter(s => {
      const q = search.toLowerCase()
      if (search &&
        !s.descricao.toLowerCase().includes(q) &&
        !s.fornecedor.toLowerCase().includes(q) &&
        !s.categoriaNome.toLowerCase().includes(q)) return false
      if (filterStatus && s.status !== filterStatus) return false
      if (filterCategoria && s.categoriaNome !== filterCategoria) return false
      if (filterRange) {
        const d = djsInstance(s.vencimento)
        if (d.isBefore(filterRange[0], 'day') || d.isAfter(filterRange[1], 'day')) return false
      }
      return true
    }).sort((a, b) => b.vencimento.localeCompare(a.vencimento))
  }, [saidas, search, filterStatus, filterCategoria, filterRange])

  function openCreate() {
    setModalMode('create')
    setSelected(null)
    form.resetFields()
    form.setFieldsValue({ vencimento: dayjs(), status: 'pendente' })
    setModalOpen(true)
  }

  function openEdit(record: Saida) {
    setModalMode('edit')
    setSelected(record)
    form.setFieldsValue({
      descricao: record.descricao,
      fornecedor: record.fornecedor,
      categoriaId: record.categoriaId,
      centroCustoId: record.centroCustoId,
      contaBancariaId: record.contaBancariaId,
      valor: record.valor,
      vencimento: djsInstance(record.vencimento),
      formaPagamento: record.formaPagamento,
      status: record.status,
      observacoes: record.observacoes,
    })
    setModalOpen(true)
  }

  function openView(record: Saida) {
    setModalMode('view')
    setSelected(record)
    setModalOpen(true)
  }

  function handleDelete(id: string) {
    modal.confirm({
      title: 'Confirmar exclusão',
      content: 'Tem certeza que deseja excluir esta saída? Esta ação não pode ser desfeita.',
      okText: 'Excluir',
      okType: 'danger',
      cancelText: 'Cancelar',
      onOk: async () => {
        const { error } = await supabase.from('saidas').delete().eq('id', id)
        if (error) { message.error('Erro ao excluir saída.'); return }
        setSaidas(prev => prev.filter(s => s.id !== id))
        message.success('Saída excluída com sucesso.')
      },
    })
  }

  async function handleMarkPago(id: string) {
    const { error } = await supabase
      .from('saidas')
      .update({ status: 'pago' } as Record<string, unknown>)
      .eq('id', id)
    if (error) { message.error('Erro ao atualizar status.'); return }
    setSaidas(prev => prev.map(s => s.id === id ? { ...s, status: 'pago' as SaidaStatus } : s))
    message.success('Saída marcada como paga.')
  }

  async function handleFormSubmit(values: SaidaFormValues) {
    if (empresaLoading) {
      message.warning('Aguarde, carregando dados da empresa...')
      return
    }
    if (!empresaId) {
      if (empresaError === 'network') {
        message.error('Erro de conexão ao carregar o perfil. Verifique sua internet e tente novamente.')
      } else if (empresaError === 'profile_not_found') {
        message.error('Perfil de usuário não encontrado. Entre em contato com o administrador.')
      } else if (empresaError === 'empresa_id_missing') {
        message.error('Nenhuma empresa vinculada ao seu perfil. Entre em contato com o administrador.')
      } else {
        message.error('Não foi possível carregar os dados da empresa. Tente recarregar a página.')
      }
      return
    }
    const vencStr = values.vencimento.format('YYYY-MM-DD')

    const payload = {
      empresa_id: empresaId,
      descricao: values.descricao,
      fornecedor: values.fornecedor || null,
      categoria_id: values.categoriaId ?? null,
      centro_custo_id: values.centroCustoId ?? null,
      conta_bancaria_id: values.contaBancariaId ?? null,
      valor: values.valor,
      data_vencimento: vencStr,
      forma_pagamento: values.formaPagamento || null,
      status: values.status,
      recorrente: false,
      observacoes: values.observacoes || null,
    }

    if (modalMode === 'create') {
      const { data: rawIns, error } = await supabase
        .from('saidas')
        .insert(payload as Record<string, unknown>)
        .select(SELECT_QUERY)
        .single()
      if (error) { message.error('Erro ao cadastrar saída.'); return }
      setSaidas(prev => [dbToSaida(rawIns as unknown as SaidaJoinRow), ...prev])
      message.success('Saída cadastrada com sucesso!')
    } else if (selected) {
      const { empresa_id: _eid, recorrente: _rec, ...updatePayload } = payload
      const { data: rawUpd, error } = await supabase
        .from('saidas')
        .update(updatePayload as Record<string, unknown>)
        .eq('id', selected.id)
        .select(SELECT_QUERY)
        .single()
      if (error) { message.error('Erro ao atualizar saída.'); return }
      setSaidas(prev => prev.map(s => s.id === selected.id ? dbToSaida(rawUpd as unknown as SaidaJoinRow) : s))
      message.success('Saída atualizada com sucesso!')
    }
    setModalOpen(false)
    form.resetFields()
  }

  const columns: ColumnsType<Saida> = [
    {
      title: 'Vencimento',
      dataIndex: 'vencimento',
      key: 'vencimento',
      width: 110,
      render: (v: string) => formatDateBR(v),
      sorter: (a, b) => a.vencimento.localeCompare(b.vencimento),
    },
    {
      title: 'Descrição',
      dataIndex: 'descricao',
      key: 'descricao',
      ellipsis: true,
    },
    {
      title: 'Fornecedor',
      dataIndex: 'fornecedor',
      key: 'fornecedor',
      ellipsis: true,
      width: 180,
      render: (v: string) => v || <Text type="secondary">—</Text>,
    },
    {
      title: 'Categoria',
      dataIndex: 'categoriaNome',
      key: 'categoriaNome',
      width: 150,
      ellipsis: true,
      render: (v: string) => v || <Text type="secondary">—</Text>,
    },
    {
      title: 'Centro de Custo',
      dataIndex: 'centroCustoNome',
      key: 'centroCustoNome',
      width: 140,
      ellipsis: true,
      render: (v: string) => v || <Text type="secondary">—</Text>,
    },
    {
      title: 'Valor',
      dataIndex: 'valor',
      key: 'valor',
      width: 130,
      align: 'right',
      render: (v: number) => <Text strong style={{ color: SYN_COLORS.danger }}>{formatBRL(v)}</Text>,
      sorter: (a, b) => a.valor - b.valor,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 115,
      render: (s: SaidaStatus) => (
        <Tag icon={statusConfig[s].icon} color={statusConfig[s].color}>
          {statusConfig[s].label}
        </Tag>
      ),
    },
    {
      title: 'Ações',
      key: 'acoes',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space size={4}>
          <Button size="small" type="text" icon={<EyeOutlined />} onClick={() => openView(record)} title="Visualizar" />
          <Button size="small" type="text" icon={<EditOutlined />} onClick={() => openEdit(record)} title="Editar" />
          {record.status !== 'pago' && (
            <Button
              size="small" type="text"
              icon={<CheckCircleOutlined />}
              style={{ color: SYN_COLORS.success }}
              onClick={() => handleMarkPago(record.id)}
              title="Marcar como pago"
            />
          )}
          <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)} title="Excluir" />
        </Space>
      ),
    },
  ]

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Title level={4} style={{ margin: 0, fontWeight: 700 }}>Saídas</Title>
          <Text type="secondary" style={{ fontSize: 13 }}>Registro e gestão de despesas</Text>
        </div>
        {!loading && saidas.length > 0 && (
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Nova Saída</Button>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 320, flexDirection: 'column', gap: 16 }}>
          <Spin size="large" />
          <Text type="secondary">Carregando saídas...</Text>
        </div>
      ) : saidas.length === 0 ? (
        <Card style={{ borderRadius: 12, textAlign: 'center' }} styles={{ body: { padding: '72px 24px' } }}>
          <ArrowDownOutlined style={{ fontSize: 56, color: '#D1D5DB', marginBottom: 20 }} />
          <Title level={5} style={{ margin: '0 0 8px', color: '#6B7280', fontWeight: 600 }}>
            Nenhuma saída registrada ainda
          </Title>
          <Text type="secondary" style={{ fontSize: 14, display: 'block', marginBottom: 28 }}>
            Registre sua primeira despesa para começar a controlar as saídas financeiras.
          </Text>
          <Button type="primary" icon={<PlusOutlined />} size="large" onClick={openCreate}>
            Registrar Primeira Saída
          </Button>
        </Card>
      ) : (
        <>
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={8}>
              <Card styles={{ body: { padding: '16px 20px' } }} style={{ borderRadius: 12, borderLeft: `4px solid ${SYN_COLORS.success}` }}>
                <Space>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: SYN_COLORS.successLight, display: 'flex', alignItems: 'center', justifyContent: 'center', color: SYN_COLORS.success, fontSize: 18 }}>
                    <CheckCircleOutlined />
                  </div>
                  <div>
                    <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>Total Pago</Text>
                    <Text strong style={{ fontSize: 18, color: SYN_COLORS.success }}>{formatBRL(totals.pago)}</Text>
                  </div>
                </Space>
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card styles={{ body: { padding: '16px 20px' } }} style={{ borderRadius: 12, borderLeft: `4px solid ${SYN_COLORS.warning}` }}>
                <Space>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: SYN_COLORS.warningLight, display: 'flex', alignItems: 'center', justifyContent: 'center', color: SYN_COLORS.warning, fontSize: 18 }}>
                    <ClockCircleOutlined />
                  </div>
                  <div>
                    <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>Total Pendente</Text>
                    <Text strong style={{ fontSize: 18, color: SYN_COLORS.warning }}>{formatBRL(totals.pendente)}</Text>
                  </div>
                </Space>
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card styles={{ body: { padding: '16px 20px' } }} style={{ borderRadius: 12, borderLeft: `4px solid ${SYN_COLORS.danger}` }}>
                <Space>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: SYN_COLORS.dangerLight, display: 'flex', alignItems: 'center', justifyContent: 'center', color: SYN_COLORS.danger, fontSize: 18 }}>
                    <ExclamationCircleOutlined />
                  </div>
                  <div>
                    <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>Total Atrasado</Text>
                    <Text strong style={{ fontSize: 18, color: SYN_COLORS.danger }}>{formatBRL(totals.atrasado)}</Text>
                  </div>
                </Space>
              </Card>
            </Col>
          </Row>

          <Card style={{ borderRadius: 12, marginBottom: 16 }} styles={{ body: { padding: '16px 20px' } }}>
            <Row gutter={[12, 12]} align="middle">
              <Col xs={24} sm={12} md={7}>
                <Input
                  prefix={<SearchOutlined />}
                  placeholder="Buscar por descrição, fornecedor..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  allowClear
                />
              </Col>
              <Col xs={24} sm={12} md={7}>
                <RangePicker
                  style={{ width: '100%' }}
                  format="DD/MM/YYYY"
                  placeholder={['Vencimento inicial', 'Vencimento final']}
                  onChange={v => setFilterRange(v ? [v[0]!, v[1]!] : null)}
                />
              </Col>
              <Col xs={12} sm={8} md={5}>
                <Select
                  style={{ width: '100%' }}
                  placeholder="Status"
                  allowClear
                  value={filterStatus || undefined}
                  onChange={v => setFilterStatus(v ?? '')}
                  options={[
                    { value: 'pago', label: 'Pago' },
                    { value: 'pendente', label: 'Pendente' },
                    { value: 'atrasado', label: 'Atrasado' },
                  ]}
                />
              </Col>
              <Col xs={12} sm={8} md={5}>
                <Select
                  style={{ width: '100%' }}
                  placeholder="Categoria"
                  allowClear
                  value={filterCategoria || undefined}
                  onChange={v => setFilterCategoria(v ?? '')}
                  options={categoriasFilter.map(c => ({ value: c, label: c }))}
                />
              </Col>
            </Row>
          </Card>

          <Card style={{ borderRadius: 12 }} styles={{ body: { padding: 0 } }}>
            <Table
              dataSource={filtered}
              columns={columns}
              rowKey="id"
              scroll={{ x: 1100 }}
              pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t) => `${t} registros`, pageSizeOptions: ['10', '20', '50'] }}
              locale={{ emptyText: <div style={{ padding: 40, textAlign: 'center' }}><ArrowDownOutlined style={{ fontSize: 32, color: '#D1D5DB', marginBottom: 8 }} /><br /><Text type="secondary">Nenhuma saída encontrada com os filtros aplicados</Text></div> }}
            />
          </Card>
        </>
      )}

      {/* Drawer visualizar */}
      {modalMode === 'view' && selected ? (
        <Drawer
          title={<Space><DollarOutlined style={{ color: SYN_COLORS.danger }} /><span>Detalhes da Saída</span></Space>}
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          width={480}
          extra={<Button type="primary" onClick={() => { setModalOpen(false); openEdit(selected) }}>Editar</Button>}
        >
          <Descriptions column={1} bordered size="small" labelStyle={{ fontWeight: 600, width: 150 }}>
            <Descriptions.Item label="Descrição">{selected.descricao}</Descriptions.Item>
            <Descriptions.Item label="Fornecedor">{selected.fornecedor || '—'}</Descriptions.Item>
            <Descriptions.Item label="Categoria">{selected.categoriaNome || '—'}</Descriptions.Item>
            <Descriptions.Item label="Centro de Custo">{selected.centroCustoNome || '—'}</Descriptions.Item>
            <Descriptions.Item label="Conta Bancária">{selected.contaBancariaNome || '—'}</Descriptions.Item>
            <Descriptions.Item label="Valor">
              <Text strong style={{ color: SYN_COLORS.danger, fontSize: 16 }}>{formatBRL(selected.valor)}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Vencimento">{selected.vencimento ? formatDateBR(selected.vencimento) : '—'}</Descriptions.Item>
            <Descriptions.Item label="Forma de Pgto.">{selected.formaPagamento || '—'}</Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag icon={statusConfig[selected.status].icon} color={statusConfig[selected.status].color}>
                {statusConfig[selected.status].label}
              </Tag>
            </Descriptions.Item>
            {selected.observacoes && (
              <Descriptions.Item label="Observações">{selected.observacoes}</Descriptions.Item>
            )}
          </Descriptions>
          {selected.status !== 'pago' && (
            <Button
              block type="primary" icon={<CheckCircleOutlined />} style={{ marginTop: 16 }}
              onClick={() => { handleMarkPago(selected.id); setModalOpen(false) }}
            >
              Marcar como Pago
            </Button>
          )}
        </Drawer>
      ) : (
        <Modal
          title={modalMode === 'create' ? 'Nova Saída' : 'Editar Saída'}
          open={modalOpen}
          onCancel={() => { setModalOpen(false); form.resetFields() }}
          onOk={() => form.submit()}
          okText={modalMode === 'create' ? 'Cadastrar' : 'Salvar'}
          cancelText="Cancelar"
          width={620}
          destroyOnHidden
        >
          <Form form={form} layout="vertical" onFinish={handleFormSubmit} style={{ marginTop: 16 }}>
            <Form.Item name="descricao" label="Descrição" rules={[{ required: true, message: 'Informe a descrição' }]}>
              <Input placeholder="Ex: Aluguel do Escritório — Junho/2026" />
            </Form.Item>

            <Row gutter={12}>
              <Col span={12}>
                <Form.Item name="fornecedor" label="Fornecedor">
                  <Input placeholder="Nome do fornecedor" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="categoriaId" label="Categoria">
                  <Select
                    placeholder="Selecione a categoria"
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    notFoundContent={EMPTY_MSG('categoria', '/configuracoes')}
                    options={categoriasList.map(c => ({ value: c.id, label: c.nome }))}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={12}>
              <Col span={12}>
                <Form.Item name="centroCustoId" label="Centro de Custo">
                  <Select
                    placeholder="Selecione o centro de custo"
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    notFoundContent={EMPTY_MSG('centro de custo', '/configuracoes')}
                    options={centrosCustoList.map(c => ({ value: c.id, label: c.nome }))}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="valor" label="Valor (R$)" rules={[{ required: true, message: 'Informe o valor' }]}>
                  <InputNumber style={{ width: '100%' }} min={0.01} step={0.01} precision={2} placeholder="0,00" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={12}>
              <Col span={12}>
                <Form.Item name="vencimento" label="Vencimento" rules={[{ required: true, message: 'Informe o vencimento' }]}>
                  <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="formaPagamento" label="Forma de Pagamento">
                  <Select
                    placeholder="Selecione"
                    allowClear
                    options={FORMAS_PAGAMENTO.map(f => ({ value: f, label: f }))}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={12}>
              <Col span={12}>
                <Form.Item name="contaBancariaId" label="Conta Bancária">
                  <Select
                    placeholder="Selecione a conta"
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    notFoundContent={EMPTY_MSG('conta bancária', '/configuracoes')}
                    options={contasList.map(c => ({ value: c.id, label: c.nome }))}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="status" label="Status" rules={[{ required: true, message: 'Selecione o status' }]}>
                  <Select
                    options={[
                      { value: 'pago', label: 'Pago' },
                      { value: 'pendente', label: 'Pendente' },
                      { value: 'atrasado', label: 'Atrasado' },
                    ]}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name="observacoes" label="Observações">
              <TextArea rows={3} placeholder="Observações adicionais..." />
            </Form.Item>
          </Form>
        </Modal>
      )}
    </div>
  )
}
