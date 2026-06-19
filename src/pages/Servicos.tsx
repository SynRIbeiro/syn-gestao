import { useState, useMemo, useEffect } from 'react'
import {
  Table, Button, Modal, Form, Input, InputNumber, Select, Switch,
  Space, Tag, Typography, Row, Col, Card, Drawer, Descriptions,
  Progress, App, Spin,
} from 'antd'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined,
  SearchOutlined, AppstoreOutlined, CheckCircleOutlined,
  CloseCircleOutlined, RiseOutlined, SyncOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'

import type { ServicoItem } from '@/types'
import type { DbServico } from '@/types/database'
import { supabase } from '@/lib/supabase'
import { EMPRESA_ID } from '@/lib/constants'
import { useEmpresaId } from '@/hooks/useEmpresaId'
import { formatBRL } from '@/utils/formatters'
import { SYN_COLORS } from '@/styles/theme'

const { Title, Text } = Typography
const { TextArea } = Input

type ModalMode = 'create' | 'edit' | 'view'

interface ServicoFormValues {
  nome: string
  descricao: string
  categoria: string
  valorVenda: number
  custoEstimado: number
  recorrente: boolean
  status: 'ativo' | 'inativo'
}

const CATEGORIAS = ['Consultoria', 'Desenvolvimento', 'Suporte', 'Treinamento', 'Outros']

function calcMargem(valorVenda: number, custoEstimado: number): number {
  if (!valorVenda || valorVenda === 0) return 0
  return ((valorVenda - custoEstimado) / valorVenda) * 100
}

function MargemBadge({ margem }: { margem: number }) {
  const color = margem >= 60 ? SYN_COLORS.success : margem >= 40 ? SYN_COLORS.warning : SYN_COLORS.danger
  return (
    <Space direction="vertical" size={2} style={{ width: 90 }}>
      <Text strong style={{ color, fontSize: 13 }}>{margem.toFixed(1)}%</Text>
      <Progress percent={Math.min(margem, 100)} showInfo={false} strokeColor={color} size="small" style={{ width: 80 }} />
    </Space>
  )
}

function dbToServico(row: DbServico): ServicoItem {
  return {
    id: row.id,
    nome: row.nome,
    descricao: row.descricao ?? '',
    categoria: row.categoria ?? '',
    valorVenda: Number(row.valor_venda ?? 0),
    custoEstimado: Number(row.custo_estimado ?? 0),
    recorrente: row.recorrente,
    status: row.ativo ? 'ativo' : 'inativo',
  }
}

export default function Servicos() {
  const { modal, message } = App.useApp()
  const [form] = Form.useForm<ServicoFormValues>()
  const { empresaId, loading: empresaLoading, errorType: empresaError } = useEmpresaId()

  const [servicos, setServicos] = useState<ServicoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<ModalMode>('create')
  const [selected, setSelected] = useState<ServicoItem | null>(null)

  const [search, setSearch] = useState('')
  const [filterCategoria, setFilterCategoria] = useState('')
  const [filterStatus, setFilterStatus] = useState<'ativo' | 'inativo' | ''>('')

  useEffect(() => {
    async function fetchServicos() {
      setLoading(true)
      const { data: rawData, error } = await supabase
        .from('servicos')
        .select('*')
        .eq('empresa_id', EMPRESA_ID)
        .order('nome')
      if (error) {
        message.error('Erro ao carregar serviços.')
      } else {
        setServicos(((rawData ?? []) as unknown as DbServico[]).map(dbToServico))
      }
      setLoading(false)
    }
    fetchServicos()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const totals = useMemo(() => ({
    total: servicos.length,
    ativos: servicos.filter(s => s.status === 'ativo').length,
    recorrentes: servicos.filter(s => s.recorrente && s.status === 'ativo').length,
    margemMedia: servicos.length > 0
      ? servicos.reduce((sum, s) => sum + calcMargem(s.valorVenda, s.custoEstimado), 0) / servicos.length
      : 0,
  }), [servicos])

  const filtered = useMemo(() => {
    return servicos.filter(s => {
      const q = search.toLowerCase()
      if (search && !s.nome.toLowerCase().includes(q) && !s.descricao.toLowerCase().includes(q)) return false
      if (filterCategoria && s.categoria !== filterCategoria) return false
      if (filterStatus && s.status !== filterStatus) return false
      return true
    }).sort((a, b) => a.nome.localeCompare(b.nome))
  }, [servicos, search, filterCategoria, filterStatus])

  function openCreate() {
    setModalMode('create')
    setSelected(null)
    form.resetFields()
    form.setFieldsValue({ status: 'ativo', recorrente: false })
    setModalOpen(true)
  }

  function openEdit(record: ServicoItem) {
    setModalMode('edit')
    setSelected(record)
    form.setFieldsValue({ ...record })
    setModalOpen(true)
  }

  function openView(record: ServicoItem) {
    setModalMode('view')
    setSelected(record)
    setModalOpen(true)
  }

  function handleDelete(id: string) {
    modal.confirm({
      title: 'Confirmar exclusão',
      content: 'Tem certeza que deseja excluir este serviço? Esta ação não pode ser desfeita.',
      okText: 'Excluir',
      okType: 'danger',
      cancelText: 'Cancelar',
      onOk: async () => {
        const { error } = await supabase.from('servicos').delete().eq('id', id)
        if (error) {
          message.error('Erro ao excluir serviço.')
          return
        }
        setServicos(prev => prev.filter(s => s.id !== id))
        message.success('Serviço excluído com sucesso.')
      },
    })
  }

  async function handleFormSubmit(values: ServicoFormValues) {
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

    if (modalMode === 'create') {
      const { data: rawIns, error } = await supabase
        .from('servicos')
        .insert({
          empresa_id: empresaId,
          nome: values.nome,
          descricao: values.descricao || null,
          categoria: values.categoria || null,
          valor_venda: values.valorVenda || null,
          custo_estimado: values.custoEstimado || null,
          recorrente: values.recorrente ?? false,
          ativo: values.status === 'ativo',
        } as Record<string, unknown>)
        .select()
        .single()

      if (error) {
        message.error('Erro ao cadastrar serviço.')
        return
      }
      setServicos(prev => [dbToServico(rawIns as unknown as DbServico), ...prev])
      message.success('Serviço cadastrado com sucesso!')
    } else if (selected) {
      const { data: rawUpd, error } = await supabase
        .from('servicos')
        .update({
          nome: values.nome,
          descricao: values.descricao || null,
          categoria: values.categoria || null,
          valor_venda: values.valorVenda || null,
          custo_estimado: values.custoEstimado || null,
          recorrente: values.recorrente ?? false,
          ativo: values.status === 'ativo',
        } as Record<string, unknown>)
        .eq('id', selected.id)
        .select()
        .single()

      if (error) {
        message.error('Erro ao atualizar serviço.')
        return
      }
      setServicos(prev => prev.map(s => s.id === selected.id ? dbToServico(rawUpd as unknown as DbServico) : s))
      message.success('Serviço atualizado com sucesso!')
    }
    setModalOpen(false)
    form.resetFields()
  }

  const columns: ColumnsType<ServicoItem> = [
    {
      title: 'Nome',
      dataIndex: 'nome',
      key: 'nome',
      ellipsis: true,
      sorter: (a, b) => a.nome.localeCompare(b.nome),
    },
    {
      title: 'Categoria',
      dataIndex: 'categoria',
      key: 'categoria',
      width: 130,
    },
    {
      title: 'Valor de Venda',
      dataIndex: 'valorVenda',
      key: 'valorVenda',
      width: 140,
      align: 'right',
      render: (v: number) => <Text strong style={{ color: SYN_COLORS.success }}>{formatBRL(v)}</Text>,
      sorter: (a, b) => a.valorVenda - b.valorVenda,
    },
    {
      title: 'Custo Estimado',
      dataIndex: 'custoEstimado',
      key: 'custoEstimado',
      width: 140,
      align: 'right',
      render: (v: number) => <Text style={{ color: SYN_COLORS.danger }}>{formatBRL(v)}</Text>,
    },
    {
      title: 'Margem de Lucro',
      key: 'margem',
      width: 130,
      render: (_, record) => <MargemBadge margem={calcMargem(record.valorVenda, record.custoEstimado)} />,
      sorter: (a, b) => calcMargem(a.valorVenda, a.custoEstimado) - calcMargem(b.valorVenda, b.custoEstimado),
    },
    {
      title: 'Recorrente',
      dataIndex: 'recorrente',
      key: 'recorrente',
      width: 110,
      align: 'center',
      render: (v: boolean) => v
        ? <Tag icon={<SyncOutlined />} color="processing">Sim</Tag>
        : <Tag color="default">Não</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (s: 'ativo' | 'inativo') => s === 'ativo'
        ? <Tag icon={<CheckCircleOutlined />} color="success">Ativo</Tag>
        : <Tag icon={<CloseCircleOutlined />} color="default">Inativo</Tag>,
    },
    {
      title: 'Ações',
      key: 'acoes',
      width: 110,
      fixed: 'right',
      render: (_, record) => (
        <Space size={4}>
          <Button size="small" type="text" icon={<EyeOutlined />} onClick={() => openView(record)} title="Visualizar" />
          <Button size="small" type="text" icon={<EditOutlined />} onClick={() => openEdit(record)} title="Editar" />
          <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)} title="Excluir" />
        </Space>
      ),
    },
  ]

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      {/* Cabeçalho */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Title level={4} style={{ margin: 0, fontWeight: 700 }}>Serviços</Title>
          <Text type="secondary" style={{ fontSize: 13 }}>Catálogo de serviços com margens de lucro</Text>
        </div>
        {!loading && servicos.length > 0 && (
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Novo Serviço</Button>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 320, flexDirection: 'column', gap: 16 }}>
          <Spin size="large" />
          <Text type="secondary">Carregando serviços...</Text>
        </div>
      ) : servicos.length === 0 ? (
        <Card style={{ borderRadius: 12, textAlign: 'center' }} styles={{ body: { padding: '72px 24px' } }}>
          <AppstoreOutlined style={{ fontSize: 56, color: '#D1D5DB', marginBottom: 20 }} />
          <Title level={5} style={{ margin: '0 0 8px', color: '#6B7280', fontWeight: 600 }}>
            Nenhum serviço cadastrado ainda
          </Title>
          <Text type="secondary" style={{ fontSize: 14, display: 'block', marginBottom: 28 }}>
            Adicione seu primeiro serviço para montar o catálogo e acompanhar margens de lucro.
          </Text>
          <Button type="primary" icon={<PlusOutlined />} size="large" onClick={openCreate}>
            Cadastrar Primeiro Serviço
          </Button>
        </Card>
      ) : (
        <>
          {/* Cards resumo */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={12} sm={6}>
              <Card styles={{ body: { padding: '16px 20px' } }} style={{ borderRadius: 12, borderLeft: `4px solid ${SYN_COLORS.primary}` }}>
                <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>Total de Serviços</Text>
                <Text strong style={{ fontSize: 22, color: SYN_COLORS.primary }}>{totals.total}</Text>
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card styles={{ body: { padding: '16px 20px' } }} style={{ borderRadius: 12, borderLeft: `4px solid ${SYN_COLORS.success}` }}>
                <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>Serviços Ativos</Text>
                <Text strong style={{ fontSize: 22, color: SYN_COLORS.success }}>{totals.ativos}</Text>
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card styles={{ body: { padding: '16px 20px' } }} style={{ borderRadius: 12, borderLeft: `4px solid ${SYN_COLORS.info}` }}>
                <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>Recorrentes Ativos</Text>
                <Text strong style={{ fontSize: 22, color: SYN_COLORS.info }}>{totals.recorrentes}</Text>
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card styles={{ body: { padding: '16px 20px' } }} style={{ borderRadius: 12, borderLeft: `4px solid ${SYN_COLORS.success}` }}>
                <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>Margem Média</Text>
                <Text strong style={{ fontSize: 22, color: SYN_COLORS.success }}>{totals.margemMedia.toFixed(1)}%</Text>
              </Card>
            </Col>
          </Row>

          {/* Filtros */}
          <Card style={{ borderRadius: 12, marginBottom: 16 }} styles={{ body: { padding: '16px 20px' } }}>
            <Row gutter={[12, 12]} align="middle">
              <Col xs={24} sm={12} md={8}>
                <Input
                  prefix={<SearchOutlined />}
                  placeholder="Buscar por nome ou descrição..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  allowClear
                />
              </Col>
              <Col xs={12} sm={6} md={4}>
                <Select
                  style={{ width: '100%' }}
                  placeholder="Categoria"
                  allowClear
                  value={filterCategoria || undefined}
                  onChange={v => setFilterCategoria(v ?? '')}
                  options={CATEGORIAS.map(c => ({ value: c, label: c }))}
                />
              </Col>
              <Col xs={12} sm={6} md={4}>
                <Select
                  style={{ width: '100%' }}
                  placeholder="Status"
                  allowClear
                  value={filterStatus || undefined}
                  onChange={v => setFilterStatus(v ?? '')}
                  options={[
                    { value: 'ativo', label: 'Ativo' },
                    { value: 'inativo', label: 'Inativo' },
                  ]}
                />
              </Col>
              <Col xs={12} sm={6} md={4} style={{ marginLeft: 'auto' }}>
                <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} style={{ width: '100%' }}>
                  Novo Serviço
                </Button>
              </Col>
            </Row>
          </Card>

          {/* Tabela */}
          <Card style={{ borderRadius: 12 }} styles={{ body: { padding: 0 } }}>
            <Table
              dataSource={filtered}
              columns={columns}
              rowKey="id"
              scroll={{ x: 1050 }}
              pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t) => `${t} serviços`, pageSizeOptions: ['10', '20', '50'] }}
              locale={{ emptyText: <div style={{ padding: 40, textAlign: 'center' }}><AppstoreOutlined style={{ fontSize: 32, color: '#D1D5DB', marginBottom: 8 }} /><br /><Text type="secondary">Nenhum serviço encontrado com os filtros aplicados</Text></div> }}
            />
          </Card>
        </>
      )}

      {/* Drawer visualizar */}
      {modalMode === 'view' && selected && (
        <Drawer
          title={<Space><RiseOutlined style={{ color: SYN_COLORS.primary }} /><span>Detalhes do Serviço</span></Space>}
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          width={480}
          extra={
            <Button type="primary" onClick={() => { setModalOpen(false); openEdit(selected) }}>
              Editar
            </Button>
          }
        >
          <Descriptions column={1} bordered size="small" labelStyle={{ fontWeight: 600, width: 150 }}>
            <Descriptions.Item label="Nome">{selected.nome}</Descriptions.Item>
            <Descriptions.Item label="Categoria">{selected.categoria || '—'}</Descriptions.Item>
            <Descriptions.Item label="Descrição">{selected.descricao || '—'}</Descriptions.Item>
            <Descriptions.Item label="Valor de Venda">
              <Text strong style={{ color: SYN_COLORS.success, fontSize: 15 }}>{formatBRL(selected.valorVenda)}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Custo Estimado">
              <Text style={{ color: SYN_COLORS.danger }}>{formatBRL(selected.custoEstimado)}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Lucro Estimado">
              <Text strong style={{ color: SYN_COLORS.success }}>{formatBRL(selected.valorVenda - selected.custoEstimado)}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Margem de Lucro">
              <Space>
                <Text strong style={{ color: SYN_COLORS.success, fontSize: 16 }}>
                  {calcMargem(selected.valorVenda, selected.custoEstimado).toFixed(1)}%
                </Text>
                <Progress
                  percent={Math.min(calcMargem(selected.valorVenda, selected.custoEstimado), 100)}
                  showInfo={false}
                  strokeColor={SYN_COLORS.success}
                  style={{ width: 100 }}
                  size="small"
                />
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="Recorrente">
              {selected.recorrente ? <Tag icon={<SyncOutlined />} color="processing">Sim</Tag> : <Tag>Não</Tag>}
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              {selected.status === 'ativo'
                ? <Tag icon={<CheckCircleOutlined />} color="success">Ativo</Tag>
                : <Tag icon={<CloseCircleOutlined />} color="default">Inativo</Tag>}
            </Descriptions.Item>
          </Descriptions>
        </Drawer>
      )}

      {/* Modal criar/editar */}
      {modalMode !== 'view' && (
        <Modal
          title={modalMode === 'create' ? 'Novo Serviço' : 'Editar Serviço'}
          open={modalOpen}
          onCancel={() => { setModalOpen(false); form.resetFields() }}
          onOk={() => form.submit()}
          okText={modalMode === 'create' ? 'Cadastrar' : 'Salvar'}
          cancelText="Cancelar"
          width={600}
          destroyOnHidden
        >
          <Form form={form} layout="vertical" onFinish={handleFormSubmit} style={{ marginTop: 16 }}>
            <Form.Item name="nome" label="Nome do Serviço" rules={[{ required: true, message: 'Informe o nome' }]}>
              <Input placeholder="Ex: Consultoria Empresarial Mensal" />
            </Form.Item>
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item name="categoria" label="Categoria" rules={[{ required: true, message: 'Selecione a categoria' }]}>
                  <Select placeholder="Selecione" options={CATEGORIAS.map(c => ({ value: c, label: c }))} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="status" label="Status" rules={[{ required: true, message: 'Selecione o status' }]}>
                  <Select
                    options={[
                      { value: 'ativo', label: 'Ativo' },
                      { value: 'inativo', label: 'Inativo' },
                    ]}
                  />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="descricao" label="Descrição" rules={[{ required: true, message: 'Informe a descrição' }]}>
              <TextArea rows={3} placeholder="Descreva o serviço..." />
            </Form.Item>
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item name="valorVenda" label="Valor de Venda (R$)" rules={[{ required: true, message: 'Informe o valor de venda' }]}>
                  <InputNumber style={{ width: '100%' }} min={0} step={0.01} precision={2} placeholder="0,00" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="custoEstimado" label="Custo Estimado (R$)" rules={[{ required: true, message: 'Informe o custo estimado' }]}>
                  <InputNumber style={{ width: '100%' }} min={0} step={0.01} precision={2} placeholder="0,00" />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="recorrente" label="Serviço Recorrente" valuePropName="checked">
              <Switch checkedChildren="Sim" unCheckedChildren="Não" />
            </Form.Item>

            {/* Preview margem em tempo real */}
            <Form.Item shouldUpdate={(prev, curr) => prev.valorVenda !== curr.valorVenda || prev.custoEstimado !== curr.custoEstimado}>
              {({ getFieldValue }) => {
                const venda = getFieldValue('valorVenda') || 0
                const custo = getFieldValue('custoEstimado') || 0
                const margem = calcMargem(venda, custo)
                if (!venda) return null
                return (
                  <Card styles={{ body: { padding: 12 } }} style={{ borderRadius: 8, background: margem >= 40 ? SYN_COLORS.successLight : SYN_COLORS.dangerLight, border: 'none' }}>
                    <Row>
                      <Col span={8}><Text type="secondary" style={{ fontSize: 12 }}>Lucro Estimado</Text><br /><Text strong style={{ color: SYN_COLORS.success }}>{formatBRL(venda - custo)}</Text></Col>
                      <Col span={8}><Text type="secondary" style={{ fontSize: 12 }}>Margem de Lucro</Text><br /><Text strong style={{ color: margem >= 40 ? SYN_COLORS.success : SYN_COLORS.danger }}>{margem.toFixed(1)}%</Text></Col>
                      <Col span={8}><Progress percent={Math.min(margem, 100)} showInfo={false} strokeColor={margem >= 40 ? SYN_COLORS.success : SYN_COLORS.danger} size="small" /></Col>
                    </Row>
                  </Card>
                )
              }}
            </Form.Item>
          </Form>
        </Modal>
      )}
    </div>
  )
}
