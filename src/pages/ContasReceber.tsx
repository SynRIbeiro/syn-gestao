import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  Table, Button, Space, Tag, Typography, Row, Col, Card, Input, Select, App, Spin, Switch,
} from 'antd'
import {
  CheckCircleOutlined, SearchOutlined, WalletOutlined,
  ClockCircleOutlined, ExclamationCircleOutlined, PlusOutlined, UndoOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { useNavigate } from 'react-router-dom'

import type { Entrada, EntradaStatus } from '@/types'
import type { DbEntrada } from '@/types/database'
import { supabase } from '@/lib/supabase'
import { EMPRESA_ID } from '@/lib/constants'
import { isEntradaPrevista } from '@/lib/statusHelpers'
import { formatBRL } from '@/utils/formatters'
import { formatDateBR, daysUntil } from '@/utils/dateHelpers'
import { SYN_COLORS } from '@/styles/theme'

const { Title, Text } = Typography

type EntradaRow = DbEntrada & {
  clientes: { nome: string } | null
  servicos: { nome: string } | null
  categorias: { nome: string } | null
  contas_bancarias: { nome: string } | null
}

function DiasBadge({ data, status }: { data: string; status: EntradaStatus }) {
  if (status === 'recebido') {
    return <Tag color="success" icon={<CheckCircleOutlined />}>Recebido</Tag>
  }
  const dias = daysUntil(data)
  if (dias < 0) {
    return <Tag color="error">{Math.abs(dias)} dias em atraso</Tag>
  }
  if (dias === 0) {
    return <Tag color="warning">Vence hoje</Tag>
  }
  if (dias <= 7) {
    return <Tag color="warning">{dias} dias</Tag>
  }
  return <Tag color="blue">{dias} dias</Tag>
}

function dbToEntrada(row: EntradaRow): Entrada {
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

export default function ContasReceber() {
  const { message } = App.useApp()
  const navigate = useNavigate()

  const [entradas, setEntradas] = useState<Entrada[]>([])
  const [loading, setLoading] = useState(true)
  const [showHistorico, setShowHistorico] = useState(false)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<EntradaStatus | ''>('')
  const [filterCliente, setFilterCliente] = useState('')
  const [filterServico, setFilterServico] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('entradas')
      .select('*, clientes!cliente_id(nome), servicos!servico_id(nome), categorias!categoria_id(nome), contas_bancarias!conta_bancaria_id(nome)')
      .eq('empresa_id', EMPRESA_ID)
      .order('data_vencimento', { ascending: true })

    if (!showHistorico) {
      query = query.in('status', ['pendente', 'atrasado'])
    }

    const { data: rawData, error } = await query
    if (error) {
      console.error('ContasReceber fetch error:', error)
      message.error('Erro ao carregar contas a receber.')
    } else {
      setEntradas(((rawData ?? []) as unknown as EntradaRow[]).map(dbToEntrada))
    }
    setLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showHistorico])

  useEffect(() => { fetchData() }, [fetchData])

  const totals = useMemo(() => {
    const abertas = entradas.filter(e => isEntradaPrevista(e.status))
    const total = abertas.reduce((s, e) => s + e.valor, 0)
    const atrasado = abertas.filter(e => e.status === 'atrasado').reduce((s, e) => s + e.valor, 0)
    const proxVenc = abertas.filter(e => {
      const d = daysUntil(e.data)
      return d >= 0 && d <= 7
    }).reduce((s, e) => s + e.valor, 0)
    return { total, atrasado, proxVenc }
  }, [entradas])

  const clientes = useMemo(
    () => [...new Set(entradas.map(e => e.clienteNome).filter(Boolean))].sort(),
    [entradas],
  )

  const servicos = useMemo(
    () => [...new Set(entradas.map(e => e.servicoNome).filter(Boolean))].sort(),
    [entradas],
  )

  const filtered = useMemo(() => {
    return entradas.filter(e => {
      const q = search.toLowerCase()
      if (search && !e.descricao.toLowerCase().includes(q) && !e.clienteNome.toLowerCase().includes(q)) return false
      if (filterStatus && e.status !== filterStatus) return false
      if (filterCliente && e.clienteNome !== filterCliente) return false
      if (filterServico && e.servicoNome !== filterServico) return false
      return true
    }).sort((a, b) => a.data.localeCompare(b.data))
  }, [entradas, search, filterStatus, filterCliente, filterServico])

  async function handleMarkReceived(id: string) {
    const today = new Date().toISOString().split('T')[0]
    const { error } = await supabase
      .from('entradas')
      .update({ status: 'recebido', data_recebimento: today } as Record<string, unknown>)
      .eq('id', id)
    if (error) {
      console.error('handleMarkReceived error:', error)
      message.error('Erro ao atualizar status.')
      return
    }
    await fetchData()
    message.success('Conta marcada como recebida.')
  }

  async function handleUnmarkReceived(id: string) {
    const { error } = await supabase
      .from('entradas')
      .update({ status: 'pendente', data_recebimento: null } as Record<string, unknown>)
      .eq('id', id)
    if (error) {
      console.error('handleUnmarkReceived error:', error)
      message.error('Erro ao desfazer recebimento.')
      return
    }
    await fetchData()
    message.success('Recebimento desfeito. Conta volta para pendente.')
  }

  const statusOptions: { value: EntradaStatus; label: string }[] = showHistorico
    ? [
        { value: 'recebido', label: 'Recebido' },
        { value: 'pendente', label: 'Pendente' },
        { value: 'atrasado', label: 'Atrasado' },
      ]
    : [
        { value: 'pendente', label: 'Pendente' },
        { value: 'atrasado', label: 'Atrasado' },
      ]

  const columns: ColumnsType<Entrada> = [
    {
      title: 'Cliente',
      dataIndex: 'clienteNome',
      key: 'clienteNome',
      ellipsis: true,
      width: 180,
    },
    {
      title: 'Descrição',
      dataIndex: 'descricao',
      key: 'descricao',
      ellipsis: true,
    },
    {
      title: 'Serviço',
      dataIndex: 'servicoNome',
      key: 'servicoNome',
      width: 160,
      ellipsis: true,
      render: (v: string) => v || '—',
    },
    {
      title: 'Valor',
      dataIndex: 'valor',
      key: 'valor',
      width: 130,
      align: 'right',
      render: (v: number) => (
        <Text strong style={{ color: SYN_COLORS.success }}>{formatBRL(v)}</Text>
      ),
      sorter: (a, b) => a.valor - b.valor,
    },
    {
      title: 'Vencimento',
      dataIndex: 'data',
      key: 'data',
      width: 110,
      render: (v: string) => formatDateBR(v),
      sorter: (a, b) => a.data.localeCompare(b.data),
    },
    {
      title: 'Dias p/ Vencimento',
      key: 'dias',
      width: 160,
      render: (_, record) => <DiasBadge data={record.data} status={record.status} />,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (s: EntradaStatus) => {
        if (s === 'recebido') return <Tag icon={<CheckCircleOutlined />} color="success">Recebido</Tag>
        if (s === 'pendente') return <Tag icon={<ClockCircleOutlined />} color="warning">Pendente</Tag>
        return <Tag icon={<ExclamationCircleOutlined />} color="error">Atrasado</Tag>
      },
    },
    {
      title: 'Ações',
      key: 'acoes',
      width: 140,
      fixed: 'right',
      render: (_, record) => {
        if (record.status === 'recebido') {
          return (
            <Button
              size="small"
              icon={<UndoOutlined />}
              onClick={() => handleUnmarkReceived(record.id)}
            >
              Desfazer
            </Button>
          )
        }
        return (
          <Button
            size="small"
            type="primary"
            ghost
            icon={<CheckCircleOutlined />}
            onClick={() => handleMarkReceived(record.id)}
          >
            Recebido
          </Button>
        )
      },
    },
  ]

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Title level={4} style={{ margin: 0, fontWeight: 700 }}>Contas a Receber</Title>
          <Text type="secondary" style={{ fontSize: 13 }}>Gestão de cobranças e valores pendentes de clientes</Text>
        </div>
        <Space>
          <Text type="secondary" style={{ fontSize: 13 }}>Histórico</Text>
          <Switch
            checked={showHistorico}
            onChange={v => { setShowHistorico(v); setFilterStatus('') }}
            checkedChildren="Sim"
            unCheckedChildren="Não"
          />
        </Space>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 320, flexDirection: 'column', gap: 16 }}>
          <Spin size="large" />
          <Text type="secondary">Carregando contas a receber...</Text>
        </div>
      ) : (
        <>
          {/* Cards resumo — sempre baseados em pendentes/atrasadas */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={8}>
              <Card styles={{ body: { padding: '16px 20px' } }} style={{ borderRadius: 12, borderLeft: `4px solid ${SYN_COLORS.info}` }}>
                <Space>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: SYN_COLORS.infoLight, display: 'flex', alignItems: 'center', justifyContent: 'center', color: SYN_COLORS.info, fontSize: 18 }}>
                    <WalletOutlined />
                  </div>
                  <div>
                    <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>Total a Receber</Text>
                    <Text strong style={{ fontSize: 18, color: SYN_COLORS.info }}>{formatBRL(totals.total)}</Text>
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
                    <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>Próximos 7 dias</Text>
                    <Text strong style={{ fontSize: 18, color: SYN_COLORS.warning }}>{formatBRL(totals.proxVenc)}</Text>
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
                    <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>Em Atraso</Text>
                    <Text strong style={{ fontSize: 18, color: SYN_COLORS.danger }}>{formatBRL(totals.atrasado)}</Text>
                  </div>
                </Space>
              </Card>
            </Col>
          </Row>

          {/* Filtros */}
          <Card style={{ borderRadius: 12, marginBottom: 16 }} styles={{ body: { padding: '16px 20px' } }}>
            <Row gutter={[12, 12]} align="middle">
              <Col xs={24} sm={12} md={8}>
                <Input
                  prefix={<SearchOutlined />}
                  placeholder="Buscar por descrição ou cliente..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  allowClear
                />
              </Col>
              <Col xs={12} sm={6} md={4}>
                <Select
                  style={{ width: '100%' }}
                  placeholder="Status"
                  allowClear
                  value={filterStatus || undefined}
                  onChange={v => setFilterStatus(v ?? '')}
                  options={statusOptions}
                />
              </Col>
              <Col xs={12} sm={6} md={4}>
                <Select
                  style={{ width: '100%' }}
                  placeholder="Cliente"
                  allowClear
                  showSearch
                  value={filterCliente || undefined}
                  onChange={v => setFilterCliente(v ?? '')}
                  options={clientes.map(c => ({ value: c, label: c }))}
                />
              </Col>
              <Col xs={12} sm={6} md={4}>
                <Select
                  style={{ width: '100%' }}
                  placeholder="Serviço"
                  allowClear
                  showSearch
                  value={filterServico || undefined}
                  onChange={v => setFilterServico(v ?? '')}
                  options={servicos.map(s => ({ value: s, label: s }))}
                />
              </Col>
              {entradas.length === 0 && !showHistorico && (
                <Col xs={12} sm={6} md={4} style={{ marginLeft: 'auto' }}>
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/entradas')} style={{ width: '100%' }}>
                    Registrar Entrada
                  </Button>
                </Col>
              )}
            </Row>
          </Card>

          {filtered.length === 0 ? (
            <Card style={{ borderRadius: 12, textAlign: 'center' }} styles={{ body: { padding: '72px 24px' } }}>
              <WalletOutlined style={{ fontSize: 56, color: '#D1D5DB', marginBottom: 20 }} />
              <Title level={5} style={{ margin: '0 0 8px', color: '#6B7280', fontWeight: 600 }}>
                {showHistorico ? 'Nenhum lançamento encontrado' : 'Nenhuma conta a receber em aberto'}
              </Title>
              <Text type="secondary" style={{ fontSize: 14, display: 'block', marginBottom: 28 }}>
                {showHistorico
                  ? 'Ajuste os filtros ou alterne entre modos.'
                  : 'Todas as entradas estão quitadas ou ainda não há receitas registradas.'}
              </Text>
              {!showHistorico && (
                <Button type="primary" icon={<PlusOutlined />} size="large" onClick={() => navigate('/entradas')}>
                  Registrar Entrada
                </Button>
              )}
            </Card>
          ) : (
            <Card style={{ borderRadius: 12 }} styles={{ body: { padding: 0 } }}>
              <Table
                dataSource={filtered}
                columns={columns}
                rowKey="id"
                scroll={{ x: 1000 }}
                rowClassName={(record) => record.status === 'atrasado' ? 'row-atrasado' : ''}
                pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t) => `${t} registros`, pageSizeOptions: ['10', '20', '50'] }}
                locale={{ emptyText: <div style={{ padding: 40, textAlign: 'center' }}><WalletOutlined style={{ fontSize: 32, color: '#D1D5DB', marginBottom: 8 }} /><br /><Text type="secondary">Nenhuma conta encontrada com os filtros aplicados</Text></div> }}
              />
            </Card>
          )}
        </>
      )}
    </div>
  )
}
