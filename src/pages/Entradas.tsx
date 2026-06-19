import { useState, useMemo, useEffect } from 'react'
import {
  Table, Button, Modal, Form, Input, InputNumber, Select, DatePicker,
  Space, Tag, Typography, Row, Col, Card, Drawer, Descriptions, App, Spin,
} from 'antd'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined,
  CheckCircleOutlined, SearchOutlined, ArrowUpOutlined,
  DollarOutlined, ClockCircleOutlined, ExclamationCircleOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'

import type { Entrada, EntradaStatus } from '@/types'
import type { DbEntrada } from '@/types/database'
import { supabase } from '@/lib/supabase'
import { useEmpresaId } from '@/hooks/useEmpresaId'
import { formatBRL } from '@/utils/formatters'
import { formatDateBR, dayjs as djsInstance } from '@/utils/dateHelpers'
import { SYN_COLORS } from '@/styles/theme'

const { Title, Text } = Typography
const { RangePicker } = DatePicker
const { TextArea } = Input

type ModalMode = 'create' | 'edit' | 'view'

interface EntradaFormValues {
  descricao: string
  clienteId: string | null
  servicoId: string | null
  categoriaId: string | null
  contaBancariaId: string | null
  valor: number
  data: dayjs.Dayjs
  formaPagamento: string
  status: EntradaStatus
  observacoes?: string
}

interface RelOption { id: string; nome: string }

// Row shape returned pelo select com joins
type EntradaJoinRow = DbEntrada & {
  clientes: { id: string; nome: string } | null
  servicos: { id: string; nome: string } | null
  categorias: { id: string; nome: string } | null
  contas_bancarias: { id: string; nome: string } | null
}

const FORMAS_PAGAMENTO = [
  'PIX', 'Transferência Bancária', 'Boleto',
  'Cartão de Crédito', 'Cartão de Débito', 'Dinheiro', 'Débito Automático',
]

const statusConfig: Record<EntradaStatus, { color: string; label: string; icon: React.ReactNode }> = {
  recebido: { color: 'success', label: 'Recebido', icon: <CheckCircleOutlined /> },
  pendente: { color: 'warning', label: 'Pendente', icon: <ClockCircleOutlined /> },
  atrasado: { color: 'error', label: 'Atrasado', icon: <ExclamationCircleOutlined /> },
}

const EMPTY_MSG = (label: string, path: string) => (
  <div style={{ textAlign: 'center', padding: '6px 0', fontSize: 12, color: '#9CA3AF' }}>
    Nenhum(a) {label} cadastrado(a).{' '}
    <a href={path} rel="noreferrer" style={{ color: SYN_COLORS.primary }}>Cadastrar agora</a>
  </div>
)

function dbToEntrada(row: EntradaJoinRow): Entrada {
  return {
    id: row.id,
    descricao: row.descricao,
    clienteId: row.cliente_id,
    clienteNome: row.clientes?.nome ?? '',
    servicoId: row.servico_id,
    servicoNome: row.servicos?.nome ?? '',
    categoriaId: row.categoria_id,
    categoriaNome: row.categorias?.nome ?? '',
    contaBancariaId: row.conta_bancaria_id,
    contaBancariaNome: row.contas_bancarias?.nome ?? '',
    valor: Number(row.valor),
    data: row.data_vencimento ?? row.data_recebimento ?? '',
    formaPagamento: row.forma_pagamento ?? '',
    status: row.status,
    observacoes: row.observacoes ?? undefined,
  }
}

const SELECT_QUERY = `
  *,
  clientes(id, nome),
  servicos(id, nome),
  categorias(id, nome),
  contas_bancarias(id, nome)
`.trim()

export default function Entradas() {
  const { modal, message } = App.useApp()
  const [form] = Form.useForm<EntradaFormValues>()
  const { empresaId, loading: empresaLoading, errorType: empresaError } = useEmpresaId()

  const [entradas, setEntradas] = useState<Entrada[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<ModalMode>('create')
  const [selected, setSelected] = useState<Entrada | null>(null)

  // Opções dos selects relacionais
  const [clientesList, setClientesList] = useState<RelOption[]>([])
  const [servicosList, setServicosList] = useState<RelOption[]>([])
  const [categoriasList, setCategoriasList] = useState<RelOption[]>([])
  const [contasList, setContasList] = useState<RelOption[]>([])

  // Filtros
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<EntradaStatus | ''>('')
  const [filterCategoria, setFilterCategoria] = useState('')
  const [filterCliente, setFilterCliente] = useState('')
  const [filterRange, setFilterRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null)

  useEffect(() => {
    async function fetchAll() {
      setLoading(true)
      const [entradasRes, clientesRes, servicosRes, categoriasRes, contasRes] = await Promise.all([
        supabase.from('entradas').select(SELECT_QUERY).order('data_vencimento', { ascending: false }),
        supabase.from('clientes').select('id, nome').eq('status', 'ativo').order('nome'),
        supabase.from('servicos').select('id, nome').eq('ativo', true).order('nome'),
        supabase.from('categorias').select('id, nome').in('tipo', ['entrada', 'ambos']).eq('ativo', true).order('nome'),
        supabase.from('contas_bancarias').select('id, nome').eq('ativo', true).order('nome'),
      ])

      if (entradasRes.error) {
        message.error('Erro ao carregar entradas.')
      } else {
        setEntradas(((entradasRes.data ?? []) as unknown as EntradaJoinRow[]).map(dbToEntrada))
      }

      setClientesList((clientesRes.data ?? []) as unknown as RelOption[])
      setServicosList((servicosRes.data ?? []) as unknown as RelOption[])
      setCategoriasList((categoriasRes.data ?? []) as unknown as RelOption[])
      setContasList((contasRes.data ?? []) as unknown as RelOption[])
      setLoading(false)
    }
    fetchAll()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const totals = useMemo(() => ({
    recebido: entradas.filter(e => e.status === 'recebido').reduce((s, e) => s + e.valor, 0),
    pendente: entradas.filter(e => e.status === 'pendente').reduce((s, e) => s + e.valor, 0),
    atrasado: entradas.filter(e => e.status === 'atrasado').reduce((s, e) => s + e.valor, 0),
  }), [entradas])

  const clientesFilter = useMemo(
    () => [...new Set(entradas.map(e => e.clienteNome).filter(Boolean))].sort(),
    [entradas]
  )

  const filtered = useMemo(() => {
    return entradas.filter(e => {
      const q = search.toLowerCase()
      if (search &&
        !e.descricao.toLowerCase().includes(q) &&
        !e.clienteNome.toLowerCase().includes(q) &&
        !e.servicoNome.toLowerCase().includes(q)) return false
      if (filterStatus && e.status !== filterStatus) return false
      if (filterCategoria && e.categoriaNome !== filterCategoria) return false
      if (filterCliente && e.clienteNome !== filterCliente) return false
      if (filterRange) {
        const d = djsInstance(e.data)
        if (d.isBefore(filterRange[0], 'day') || d.isAfter(filterRange[1], 'day')) return false
      }
      return true
    }).sort((a, b) => b.data.localeCompare(a.data))
  }, [entradas, search, filterStatus, filterCategoria, filterCliente, filterRange])

  function openCreate() {
    setModalMode('create')
    setSelected(null)
    form.resetFields()
    form.setFieldsValue({ data: dayjs(), status: 'pendente' })
    setModalOpen(true)
  }

  function openEdit(record: Entrada) {
    setModalMode('edit')
    setSelected(record)
    form.setFieldsValue({
      descricao: record.descricao,
      clienteId: record.clienteId,
      servicoId: record.servicoId,
      categoriaId: record.categoriaId,
      contaBancariaId: record.contaBancariaId,
      valor: record.valor,
      data: djsInstance(record.data),
      formaPagamento: record.formaPagamento,
      status: record.status,
      observacoes: record.observacoes,
    })
    setModalOpen(true)
  }

  function openView(record: Entrada) {
    setModalMode('view')
    setSelected(record)
    setModalOpen(true)
  }

  function handleDelete(id: string) {
    modal.confirm({
      title: 'Confirmar exclusão',
      content: 'Tem certeza que deseja excluir esta entrada? Esta ação não pode ser desfeita.',
      okText: 'Excluir',
      okType: 'danger',
      cancelText: 'Cancelar',
      onOk: async () => {
        const { error } = await supabase.from('entradas').delete().eq('id', id)
        if (error) { message.error('Erro ao excluir entrada.'); return }
        setEntradas(prev => prev.filter(e => e.id !== id))
        message.success('Entrada excluída com sucesso.')
      },
    })
  }

  async function handleMarkReceived(id: string) {
    const { error } = await supabase
      .from('entradas')
      .update({ status: 'recebido' } as Record<string, unknown>)
      .eq('id', id)
    if (error) { message.error('Erro ao atualizar status.'); return }
    setEntradas(prev => prev.map(e => e.id === id ? { ...e, status: 'recebido' as EntradaStatus } : e))
    message.success('Entrada marcada como recebida.')
  }

  async function handleFormSubmit(values: EntradaFormValues) {
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
    const dataStr = values.data.format('YYYY-MM-DD')

    const payload = {
      empresa_id: empresaId,
      descricao: values.descricao,
      cliente_id: values.clienteId ?? null,
      servico_id: values.servicoId ?? null,
      categoria_id: values.categoriaId ?? null,
      conta_bancaria_id: values.contaBancariaId ?? null,
      valor: values.valor,
      data_vencimento: dataStr,
      forma_pagamento: values.formaPagamento || null,
      status: values.status,
      recorrente: false,
      observacoes: values.observacoes || null,
    }

    if (modalMode === 'create') {
      const { data: rawIns, error } = await supabase
        .from('entradas')
        .insert(payload as Record<string, unknown>)
        .select(SELECT_QUERY)
        .single()
      if (error) { message.error('Erro ao cadastrar entrada.'); return }
      setEntradas(prev => [dbToEntrada(rawIns as unknown as EntradaJoinRow), ...prev])
      message.success('Entrada cadastrada com sucesso!')
    } else if (selected) {
      const { empresa_id: _eid, recorrente: _rec, ...updatePayload } = payload
      const { data: rawUpd, error } = await supabase
        .from('entradas')
        .update(updatePayload as Record<string, unknown>)
        .eq('id', selected.id)
        .select(SELECT_QUERY)
        .single()
      if (error) { message.error('Erro ao atualizar entrada.'); return }
      setEntradas(prev => prev.map(e => e.id === selected.id ? dbToEntrada(rawUpd as unknown as EntradaJoinRow) : e))
      message.success('Entrada atualizada com sucesso!')
    }
    setModalOpen(false)
    form.resetFields()
  }

  const categoriasFilter = useMemo(
    () => [...new Set(entradas.map(e => e.categoriaNome).filter(Boolean))].sort(),
    [entradas]
  )

  const columns: ColumnsType<Entrada> = [
    {
      title: 'Data',
      dataIndex: 'data',
      key: 'data',
      width: 110,
      render: (v: string) => formatDateBR(v),
      sorter: (a, b) => a.data.localeCompare(b.data),
    },
    {
      title: 'Descrição',
      dataIndex: 'descricao',
      key: 'descricao',
      ellipsis: true,
    },
    {
      title: 'Cliente',
      dataIndex: 'clienteNome',
      key: 'clienteNome',
      ellipsis: true,
      width: 180,
      render: (v: string) => v || <Text type="secondary">—</Text>,
    },
    {
      title: 'Categoria',
      dataIndex: 'categoriaNome',
      key: 'categoriaNome',
      width: 130,
      render: (v: string) => v || <Text type="secondary">—</Text>,
    },
    {
      title: 'Valor',
      dataIndex: 'valor',
      key: 'valor',
      width: 130,
      align: 'right',
      render: (v: number) => <Text strong style={{ color: SYN_COLORS.success }}>{formatBRL(v)}</Text>,
      sorter: (a, b) => a.valor - b.valor,
    },
    {
      title: 'Pagamento',
      dataIndex: 'formaPagamento',
      key: 'formaPagamento',
      width: 140,
      ellipsis: true,
      render: (v: string) => v || <Text type="secondary">—</Text>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 115,
      render: (s: EntradaStatus) => (
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
          {record.status !== 'recebido' && (
            <Button
              size="small" type="text"
              icon={<CheckCircleOutlined />}
              style={{ color: SYN_COLORS.success }}
              onClick={() => handleMarkReceived(record.id)}
              title="Marcar como recebido"
            />
          )}
          <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)} title="Excluir" />
        </Space>
      ),
    },
  ]

  const modalTitle = modalMode === 'create' ? 'Nova Entrada' : modalMode === 'edit' ? 'Editar Entrada' : 'Detalhes da Entrada'

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      {/* Cabeçalho */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Title level={4} style={{ margin: 0, fontWeight: 700 }}>Entradas</Title>
          <Text type="secondary" style={{ fontSize: 13 }}>Registro e gestão de receitas</Text>
        </div>
        {!loading && entradas.length > 0 && (
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Nova Entrada</Button>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 320, flexDirection: 'column', gap: 16 }}>
          <Spin size="large" />
          <Text type="secondary">Carregando entradas...</Text>
        </div>
      ) : entradas.length === 0 ? (
        <Card style={{ borderRadius: 12, textAlign: 'center' }} styles={{ body: { padding: '72px 24px' } }}>
          <ArrowUpOutlined style={{ fontSize: 56, color: '#D1D5DB', marginBottom: 20 }} />
          <Title level={5} style={{ margin: '0 0 8px', color: '#6B7280', fontWeight: 600 }}>
            Nenhuma entrada registrada ainda
          </Title>
          <Text type="secondary" style={{ fontSize: 14, display: 'block', marginBottom: 28 }}>
            Registre sua primeira receita para começar a acompanhar as entradas financeiras.
          </Text>
          <Button type="primary" icon={<PlusOutlined />} size="large" onClick={openCreate}>
            Registrar Primeira Entrada
          </Button>
        </Card>
      ) : (
        <>
          {/* Cards resumo */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={8}>
              <Card styles={{ body: { padding: '16px 20px' } }} style={{ borderRadius: 12, borderLeft: `4px solid ${SYN_COLORS.success}` }}>
                <Space>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: SYN_COLORS.successLight, display: 'flex', alignItems: 'center', justifyContent: 'center', color: SYN_COLORS.success, fontSize: 18 }}>
                    <CheckCircleOutlined />
                  </div>
                  <div>
                    <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>Total Recebido</Text>
                    <Text strong style={{ fontSize: 18, color: SYN_COLORS.success }}>{formatBRL(totals.recebido)}</Text>
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

          {/* Filtros */}
          <Card style={{ borderRadius: 12, marginBottom: 16 }} styles={{ body: { padding: '16px 20px' } }}>
            <Row gutter={[12, 12]} align="middle">
              <Col xs={24} sm={12} md={6}>
                <Input
                  prefix={<SearchOutlined />}
                  placeholder="Buscar por descrição, cliente..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  allowClear
                />
              </Col>
              <Col xs={24} sm={12} md={6}>
                <RangePicker
                  style={{ width: '100%' }}
                  format="DD/MM/YYYY"
                  placeholder={['Data inicial', 'Data final']}
                  onChange={v => setFilterRange(v ? [v[0]!, v[1]!] : null)}
                />
              </Col>
              <Col xs={12} sm={8} md={4}>
                <Select
                  style={{ width: '100%' }}
                  placeholder="Status"
                  allowClear
                  value={filterStatus || undefined}
                  onChange={v => setFilterStatus(v ?? '')}
                  options={[
                    { value: 'recebido', label: 'Recebido' },
                    { value: 'pendente', label: 'Pendente' },
                    { value: 'atrasado', label: 'Atrasado' },
                  ]}
                />
              </Col>
              <Col xs={12} sm={8} md={4}>
                <Select
                  style={{ width: '100%' }}
                  placeholder="Categoria"
                  allowClear
                  value={filterCategoria || undefined}
                  onChange={v => setFilterCategoria(v ?? '')}
                  options={categoriasFilter.map(c => ({ value: c, label: c }))}
                />
              </Col>
              <Col xs={24} sm={8} md={4}>
                <Select
                  style={{ width: '100%' }}
                  placeholder="Cliente"
                  allowClear
                  showSearch
                  value={filterCliente || undefined}
                  onChange={v => setFilterCliente(v ?? '')}
                  options={clientesFilter.map(c => ({ value: c, label: c }))}
                />
              </Col>
            </Row>
          </Card>

          {/* Tabela */}
          <Card style={{ borderRadius: 12 }} styles={{ body: { padding: 0 } }}>
            <Table
              dataSource={filtered}
              columns={columns}
              rowKey="id"
              scroll={{ x: 900 }}
              pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t) => `${t} registros`, pageSizeOptions: ['10', '20', '50'] }}
              locale={{ emptyText: <div style={{ padding: 40, textAlign: 'center' }}><ArrowUpOutlined style={{ fontSize: 32, color: '#D1D5DB', marginBottom: 8 }} /><br /><Text type="secondary">Nenhuma entrada encontrada com os filtros aplicados</Text></div> }}
            />
          </Card>
        </>
      )}

      {/* Drawer visualizar */}
      {modalMode === 'view' && selected ? (
        <Drawer
          title={<Space><DollarOutlined style={{ color: SYN_COLORS.primary }} /><span>Detalhes da Entrada</span></Space>}
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          width={480}
          extra={<Button type="primary" onClick={() => { setModalOpen(false); openEdit(selected) }}>Editar</Button>}
        >
          <Descriptions column={1} bordered size="small" labelStyle={{ fontWeight: 600, width: 140 }}>
            <Descriptions.Item label="Descrição">{selected.descricao}</Descriptions.Item>
            <Descriptions.Item label="Cliente">{selected.clienteNome || '—'}</Descriptions.Item>
            <Descriptions.Item label="Serviço">{selected.servicoNome || '—'}</Descriptions.Item>
            <Descriptions.Item label="Categoria">{selected.categoriaNome || '—'}</Descriptions.Item>
            <Descriptions.Item label="Conta Bancária">{selected.contaBancariaNome || '—'}</Descriptions.Item>
            <Descriptions.Item label="Valor">
              <Text strong style={{ color: SYN_COLORS.success, fontSize: 16 }}>{formatBRL(selected.valor)}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Data">{selected.data ? formatDateBR(selected.data) : '—'}</Descriptions.Item>
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
          {selected.status !== 'recebido' && (
            <Button
              block type="primary" icon={<CheckCircleOutlined />} style={{ marginTop: 16 }}
              onClick={() => { handleMarkReceived(selected.id); setModalOpen(false) }}
            >
              Marcar como Recebido
            </Button>
          )}
        </Drawer>
      ) : (
        <Modal
          title={modalTitle}
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
              <Input placeholder="Ex: Consultoria Empresarial — Junho/2026" />
            </Form.Item>

            <Row gutter={12}>
              <Col span={12}>
                <Form.Item name="clienteId" label="Cliente">
                  <Select
                    placeholder="Selecione o cliente"
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    notFoundContent={EMPTY_MSG('cliente', '/clientes')}
                    options={clientesList.map(c => ({ value: c.id, label: c.nome }))}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="servicoId" label="Serviço">
                  <Select
                    placeholder="Selecione o serviço"
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    notFoundContent={EMPTY_MSG('serviço', '/servicos')}
                    options={servicosList.map(s => ({ value: s.id, label: s.nome }))}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={12}>
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
              <Col span={12}>
                <Form.Item name="valor" label="Valor (R$)" rules={[{ required: true, message: 'Informe o valor' }]}>
                  <InputNumber style={{ width: '100%' }} min={0.01} step={0.01} precision={2} placeholder="0,00" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={12}>
              <Col span={12}>
                <Form.Item name="data" label="Data de Vencimento" rules={[{ required: true, message: 'Informe a data' }]}>
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
                      { value: 'recebido', label: 'Recebido' },
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
