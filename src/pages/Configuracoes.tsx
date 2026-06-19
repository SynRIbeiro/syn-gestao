import { useState, useEffect } from 'react'
import {
  Tabs, Card, Typography, Button, Table, Modal, Form, Input, Select, Switch,
  Space, Tag, App, Spin, Row, Col, InputNumber,
} from 'antd'
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  AppstoreOutlined, ApartmentOutlined, BankOutlined, SettingOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { DbCategoria, DbCentroCusto, DbContaBancaria, DbEmpresa } from '@/types/database'
import { supabase } from '@/lib/supabase'
import { EMPRESA_ID } from '@/lib/constants'
import { formatBRL } from '@/utils/formatters'
import { SYN_COLORS } from '@/styles/theme'

const { Title, Text } = Typography

// ─── Categorias ──────────────────────────────────────────────────────────────

interface CatForm { nome: string; tipo: 'entrada' | 'saida' | 'ambos'; ativo: boolean }

function Categorias() {
  const { modal, message } = App.useApp()
  const [form] = Form.useForm<CatForm>()
  const [data, setData] = useState<DbCategoria[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<DbCategoria | null>(null)

  async function fetch() {
    setLoading(true)
    const { data: rows, error } = await supabase.from('categorias').select('*').eq('empresa_id', EMPRESA_ID).order('nome')
    if (error) message.error('Erro ao carregar categorias.')
    else setData((rows ?? []) as unknown as DbCategoria[])
    setLoading(false)
  }

  useEffect(() => { fetch() }, [])

  function openCreate() {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ ativo: true, tipo: 'ambos' })
    setOpen(true)
  }

  function openEdit(row: DbCategoria) {
    setEditing(row)
    form.setFieldsValue({ nome: row.nome, tipo: row.tipo, ativo: row.ativo })
    setOpen(true)
  }

  function handleDelete(row: DbCategoria) {
    modal.confirm({
      title: 'Excluir categoria?', content: `"${row.nome}" será removida permanentemente.`,
      okText: 'Excluir', okType: 'danger', cancelText: 'Cancelar',
      onOk: async () => {
        const { error } = await supabase.from('categorias').delete().eq('id', row.id)
        if (error) { message.error('Erro ao excluir categoria.'); return }
        setData(prev => prev.filter(c => c.id !== row.id))
        message.success('Categoria excluída.')
      },
    })
  }

  async function handleSubmit(values: CatForm) {
    if (editing) {
      const { data: upd, error } = await supabase.from('categorias').update({ nome: values.nome, tipo: values.tipo, ativo: values.ativo } as any).eq('id', editing.id).select().single()
      if (error) { message.error('Erro ao atualizar categoria.'); return }
      setData(prev => prev.map(c => c.id === editing.id ? upd as unknown as DbCategoria : c))
      message.success('Categoria atualizada.')
    } else {
      const { data: ins, error } = await supabase.from('categorias').insert({ empresa_id: EMPRESA_ID, nome: values.nome, tipo: values.tipo, ativo: values.ativo } as any).select().single()
      if (error) { message.error('Erro ao criar categoria.'); return }
      setData(prev => [...prev, ins as unknown as DbCategoria].sort((a, b) => a.nome.localeCompare(b.nome)))
      message.success('Categoria criada.')
    }
    setOpen(false)
    form.resetFields()
  }

  const columns: ColumnsType<DbCategoria> = [
    { title: 'Nome', dataIndex: 'nome', key: 'nome', ellipsis: true },
    {
      title: 'Tipo', dataIndex: 'tipo', key: 'tipo', width: 120,
      render: (v: string) => {
        const cfg: Record<string, { color: string; label: string }> = { entrada: { color: 'success', label: 'Entrada' }, saida: { color: 'error', label: 'Saída' }, ambos: { color: 'processing', label: 'Ambos' } }
        return <Tag color={cfg[v]?.color}>{cfg[v]?.label ?? v}</Tag>
      },
    },
    { title: 'Status', dataIndex: 'ativo', key: 'ativo', width: 100, render: (v: boolean) => <Tag color={v ? 'success' : 'default'}>{v ? 'Ativo' : 'Inativo'}</Tag> },
    {
      title: 'Ações', key: 'acoes', width: 90, fixed: 'right',
      render: (_, record) => (
        <Space size={4}>
          <Button size="small" type="text" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record)} />
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Text type="secondary" style={{ fontSize: 13 }}>Categorias para classificar entradas e saídas</Text>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Nova Categoria</Button>
      </div>
      {loading ? <Spin /> : (
        <Table dataSource={data} columns={columns} rowKey="id" size="small" pagination={{ pageSize: 10 }} locale={{ emptyText: 'Nenhuma categoria cadastrada.' }} />
      )}
      <Modal title={editing ? 'Editar Categoria' : 'Nova Categoria'} open={open} onOk={() => form.submit()} onCancel={() => { setOpen(false); form.resetFields() }} okText={editing ? 'Salvar' : 'Criar'} cancelText="Cancelar" destroyOnHidden>
        <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ marginTop: 16 }}>
          <Form.Item name="nome" label="Nome" rules={[{ required: true, message: 'Informe o nome' }]}>
            <Input placeholder="Ex: Consultoria, Aluguel, Software..." />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="tipo" label="Tipo" rules={[{ required: true }]}>
                <Select options={[{ value: 'entrada', label: 'Entrada' }, { value: 'saida', label: 'Saída' }, { value: 'ambos', label: 'Ambos' }]} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="ativo" label="Status" valuePropName="checked">
                <Switch checkedChildren="Ativo" unCheckedChildren="Inativo" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  )
}

// ─── Centros de Custo ────────────────────────────────────────────────────────

interface CentroForm { nome: string; descricao?: string; ativo: boolean }

function CentrosCusto() {
  const { modal, message } = App.useApp()
  const [form] = Form.useForm<CentroForm>()
  const [data, setData] = useState<DbCentroCusto[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<DbCentroCusto | null>(null)

  async function fetch() {
    setLoading(true)
    const { data: rows, error } = await supabase.from('centros_custo').select('*').eq('empresa_id', EMPRESA_ID).order('nome')
    if (error) message.error('Erro ao carregar centros de custo.')
    else setData((rows ?? []) as unknown as DbCentroCusto[])
    setLoading(false)
  }

  useEffect(() => { fetch() }, [])

  function openCreate() { setEditing(null); form.resetFields(); form.setFieldsValue({ ativo: true }); setOpen(true) }
  function openEdit(row: DbCentroCusto) { setEditing(row); form.setFieldsValue({ nome: row.nome, descricao: row.descricao ?? '', ativo: row.ativo }); setOpen(true) }

  function handleDelete(row: DbCentroCusto) {
    modal.confirm({
      title: 'Excluir centro de custo?', content: `"${row.nome}" será removido.`, okText: 'Excluir', okType: 'danger', cancelText: 'Cancelar',
      onOk: async () => {
        const { error } = await supabase.from('centros_custo').delete().eq('id', row.id)
        if (error) { message.error('Erro ao excluir centro de custo.'); return }
        setData(prev => prev.filter(c => c.id !== row.id))
        message.success('Centro de custo excluído.')
      },
    })
  }

  async function handleSubmit(values: CentroForm) {
    if (editing) {
      const { data: upd, error } = await supabase.from('centros_custo').update({ nome: values.nome, descricao: values.descricao || null, ativo: values.ativo } as any).eq('id', editing.id).select().single()
      if (error) { message.error('Erro ao atualizar centro de custo.'); return }
      setData(prev => prev.map(c => c.id === editing.id ? upd as unknown as DbCentroCusto : c))
      message.success('Centro de custo atualizado.')
    } else {
      const { data: ins, error } = await supabase.from('centros_custo').insert({ empresa_id: EMPRESA_ID, nome: values.nome, descricao: values.descricao || null, ativo: values.ativo } as any).select().single()
      if (error) { message.error('Erro ao criar centro de custo.'); return }
      setData(prev => [...prev, ins as unknown as DbCentroCusto].sort((a, b) => a.nome.localeCompare(b.nome)))
      message.success('Centro de custo criado.')
    }
    setOpen(false)
    form.resetFields()
  }

  const columns: ColumnsType<DbCentroCusto> = [
    { title: 'Nome', dataIndex: 'nome', key: 'nome', ellipsis: true },
    { title: 'Descrição', dataIndex: 'descricao', key: 'descricao', ellipsis: true, render: (v: string) => v || <Text type="secondary">—</Text> },
    { title: 'Status', dataIndex: 'ativo', key: 'ativo', width: 100, render: (v: boolean) => <Tag color={v ? 'success' : 'default'}>{v ? 'Ativo' : 'Inativo'}</Tag> },
    {
      title: 'Ações', key: 'acoes', width: 90, fixed: 'right',
      render: (_, record) => (<Space size={4}><Button size="small" type="text" icon={<EditOutlined />} onClick={() => openEdit(record)} /><Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record)} /></Space>),
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Text type="secondary" style={{ fontSize: 13 }}>Centros de custo para organizar as saídas</Text>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Novo Centro de Custo</Button>
      </div>
      {loading ? <Spin /> : <Table dataSource={data} columns={columns} rowKey="id" size="small" pagination={{ pageSize: 10 }} locale={{ emptyText: 'Nenhum centro de custo cadastrado.' }} />}
      <Modal title={editing ? 'Editar Centro de Custo' : 'Novo Centro de Custo'} open={open} onOk={() => form.submit()} onCancel={() => { setOpen(false); form.resetFields() }} okText={editing ? 'Salvar' : 'Criar'} cancelText="Cancelar" destroyOnHidden>
        <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ marginTop: 16 }}>
          <Form.Item name="nome" label="Nome" rules={[{ required: true, message: 'Informe o nome' }]}><Input placeholder="Ex: Operacional, Administrativo, Marketing..." /></Form.Item>
          <Form.Item name="descricao" label="Descrição"><Input.TextArea rows={2} placeholder="Descrição opcional..." /></Form.Item>
          <Form.Item name="ativo" label="Status" valuePropName="checked"><Switch checkedChildren="Ativo" unCheckedChildren="Inativo" /></Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

// ─── Contas Bancárias ─────────────────────────────────────────────────────────

interface ContaForm { nome: string; banco?: string; agencia?: string; conta?: string; saldoInicial?: number; ativo: boolean }

function ContasBancarias() {
  const { modal, message } = App.useApp()
  const [form] = Form.useForm<ContaForm>()
  const [data, setData] = useState<DbContaBancaria[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<DbContaBancaria | null>(null)

  async function fetch() {
    setLoading(true)
    const { data: rows, error } = await supabase.from('contas_bancarias').select('*').eq('empresa_id', EMPRESA_ID).order('nome')
    if (error) message.error('Erro ao carregar contas bancárias.')
    else setData((rows ?? []) as unknown as DbContaBancaria[])
    setLoading(false)
  }

  useEffect(() => { fetch() }, [])

  function openCreate() { setEditing(null); form.resetFields(); form.setFieldsValue({ ativo: true, saldoInicial: 0 }); setOpen(true) }
  function openEdit(row: DbContaBancaria) {
    setEditing(row)
    form.setFieldsValue({ nome: row.nome, banco: row.banco ?? '', agencia: row.agencia ?? '', conta: row.conta ?? '', saldoInicial: Number(row.saldo_inicial ?? 0), ativo: row.ativo })
    setOpen(true)
  }

  function handleDelete(row: DbContaBancaria) {
    modal.confirm({
      title: 'Excluir conta bancária?', content: `"${row.nome}" será removida.`, okText: 'Excluir', okType: 'danger', cancelText: 'Cancelar',
      onOk: async () => {
        const { error } = await supabase.from('contas_bancarias').delete().eq('id', row.id)
        if (error) { message.error('Erro ao excluir conta bancária.'); return }
        setData(prev => prev.filter(c => c.id !== row.id))
        message.success('Conta bancária excluída.')
      },
    })
  }

  async function handleSubmit(values: ContaForm) {
    const payload = { nome: values.nome, banco: values.banco || null, agencia: values.agencia || null, conta: values.conta || null, saldo_inicial: values.saldoInicial ?? 0, ativo: values.ativo }
    if (editing) {
      const { data: upd, error } = await supabase.from('contas_bancarias').update(payload as any).eq('id', editing.id).select().single()
      if (error) { message.error('Erro ao atualizar conta bancária.'); return }
      setData(prev => prev.map(c => c.id === editing.id ? upd as unknown as DbContaBancaria : c))
      message.success('Conta bancária atualizada.')
    } else {
      const { data: ins, error } = await supabase.from('contas_bancarias').insert({ empresa_id: EMPRESA_ID, ...payload } as any).select().single()
      if (error) { message.error('Erro ao criar conta bancária.'); return }
      setData(prev => [...prev, ins as unknown as DbContaBancaria].sort((a, b) => a.nome.localeCompare(b.nome)))
      message.success('Conta bancária criada.')
    }
    setOpen(false)
    form.resetFields()
  }

  const columns: ColumnsType<DbContaBancaria> = [
    { title: 'Nome', dataIndex: 'nome', key: 'nome', ellipsis: true },
    { title: 'Banco', dataIndex: 'banco', key: 'banco', width: 160, render: (v: string) => v || <Text type="secondary">—</Text> },
    { title: 'Agência', dataIndex: 'agencia', key: 'agencia', width: 100, render: (v: string) => v || <Text type="secondary">—</Text> },
    { title: 'Conta', dataIndex: 'conta', key: 'conta', width: 130, render: (v: string) => v || <Text type="secondary">—</Text> },
    { title: 'Saldo Inicial', dataIndex: 'saldo_inicial', key: 'saldo_inicial', width: 130, align: 'right', render: (v: number) => <Text style={{ color: SYN_COLORS.success }}>{formatBRL(Number(v ?? 0))}</Text> },
    { title: 'Status', dataIndex: 'ativo', key: 'ativo', width: 100, render: (v: boolean) => <Tag color={v ? 'success' : 'default'}>{v ? 'Ativo' : 'Inativo'}</Tag> },
    {
      title: 'Ações', key: 'acoes', width: 90, fixed: 'right',
      render: (_, record) => (<Space size={4}><Button size="small" type="text" icon={<EditOutlined />} onClick={() => openEdit(record)} /><Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record)} /></Space>),
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Text type="secondary" style={{ fontSize: 13 }}>Contas bancárias para registrar movimentações</Text>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Nova Conta</Button>
      </div>
      {loading ? <Spin /> : <Table dataSource={data} columns={columns} rowKey="id" size="small" pagination={{ pageSize: 10 }} scroll={{ x: 800 }} locale={{ emptyText: 'Nenhuma conta bancária cadastrada.' }} />}
      <Modal title={editing ? 'Editar Conta Bancária' : 'Nova Conta Bancária'} open={open} onOk={() => form.submit()} onCancel={() => { setOpen(false); form.resetFields() }} okText={editing ? 'Salvar' : 'Criar'} cancelText="Cancelar" destroyOnHidden>
        <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ marginTop: 16 }}>
          <Form.Item name="nome" label="Nome da Conta" rules={[{ required: true, message: 'Informe o nome' }]}><Input placeholder="Ex: Conta Corrente Principal, Poupança..." /></Form.Item>
          <Row gutter={12}>
            <Col span={12}><Form.Item name="banco" label="Banco"><Input placeholder="Ex: Itaú, Bradesco, Nubank..." /></Form.Item></Col>
            <Col span={12}><Form.Item name="saldoInicial" label="Saldo Inicial (R$)"><InputNumber style={{ width: '100%' }} min={0} precision={2} placeholder="0,00" /></Form.Item></Col>
          </Row>
          <Row gutter={12}>
            <Col span={10}><Form.Item name="agencia" label="Agência"><Input placeholder="0000" /></Form.Item></Col>
            <Col span={14}><Form.Item name="conta" label="Número da Conta"><Input placeholder="00000-0" /></Form.Item></Col>
          </Row>
          <Form.Item name="ativo" label="Status" valuePropName="checked"><Switch checkedChildren="Ativo" unCheckedChildren="Inativo" /></Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

// ─── Dados da Empresa ─────────────────────────────────────────────────────────

interface EmpresaForm { nome: string; nome_fantasia?: string; cnpj?: string; telefone?: string; email?: string }

function DadosEmpresa() {
  const { message } = App.useApp()
  const [form] = Form.useForm<EmpresaForm>()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function fetchEmpresa() {
      setLoading(true)
      const { data, error } = await supabase.from('empresas').select('*').eq('id', EMPRESA_ID).single()
      if (error) { message.error('Erro ao carregar dados da empresa.') }
      else if (data) {
        const row = data as unknown as DbEmpresa
        form.setFieldsValue({ nome: row.nome, nome_fantasia: row.nome_fantasia ?? '', cnpj: row.cnpj ?? '', telefone: row.telefone ?? '', email: row.email ?? '' })
      }
      setLoading(false)
    }
    fetchEmpresa()
  }, [])

  async function handleSubmit(values: EmpresaForm) {
    setSaving(true)
    const { error } = await supabase.from('empresas').update({ nome: values.nome, nome_fantasia: values.nome_fantasia || null, cnpj: values.cnpj || null, telefone: values.telefone || null, email: values.email || null } as any).eq('id', EMPRESA_ID)
    setSaving(false)
    if (error) { message.error('Erro ao salvar dados da empresa.'); return }
    message.success('Dados da empresa salvos com sucesso!')
  }

  if (loading) return <Spin />

  return (
    <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ maxWidth: 600 }}>
      <Form.Item name="nome" label="Razão Social" rules={[{ required: true, message: 'Informe o nome' }]}><Input placeholder="Nome da empresa" /></Form.Item>
      <Form.Item name="nome_fantasia" label="Nome Fantasia"><Input placeholder="Nome fantasia" /></Form.Item>
      <Row gutter={12}>
        <Col span={12}><Form.Item name="cnpj" label="CNPJ"><Input placeholder="00.000.000/0001-00" /></Form.Item></Col>
        <Col span={12}><Form.Item name="telefone" label="Telefone"><Input placeholder="(00) 0000-0000" /></Form.Item></Col>
      </Row>
      <Form.Item name="email" label="E-mail" rules={[{ type: 'email', message: 'Informe um e-mail válido' }]}><Input placeholder="contato@empresa.com.br" /></Form.Item>
      <Form.Item>
        <Button type="primary" htmlType="submit" loading={saving}>Salvar Alterações</Button>
      </Form.Item>
    </Form>
  )
}

// ─── Página Principal ─────────────────────────────────────────────────────────

export default function Configuracoes() {
  const tabItems = [
    {
      key: 'categorias', label: <Space><AppstoreOutlined />Categorias</Space>,
      children: <Card style={{ borderRadius: 12 }} styles={{ body: { padding: '20px 24px' } }}><Categorias /></Card>,
    },
    {
      key: 'centros-custo', label: <Space><ApartmentOutlined />Centros de Custo</Space>,
      children: <Card style={{ borderRadius: 12 }} styles={{ body: { padding: '20px 24px' } }}><CentrosCusto /></Card>,
    },
    {
      key: 'contas-bancarias', label: <Space><BankOutlined />Contas Bancárias</Space>,
      children: <Card style={{ borderRadius: 12 }} styles={{ body: { padding: '20px 24px' } }}><ContasBancarias /></Card>,
    },
    {
      key: 'empresa', label: <Space><SettingOutlined />Dados da Empresa</Space>,
      children: <Card style={{ borderRadius: 12 }} styles={{ body: { padding: '20px 24px' } }}><DadosEmpresa /></Card>,
    },
  ]

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0, fontWeight: 700 }}>Configurações</Title>
        <Text type="secondary" style={{ fontSize: 13 }}>Gerencie categorias, centros de custo, contas bancárias e dados da empresa</Text>
      </div>
      <Tabs type="card" items={tabItems} />
    </div>
  )
}
