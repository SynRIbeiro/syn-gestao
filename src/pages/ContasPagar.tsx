import { useState, useMemo, useEffect } from 'react'
import {
  Table, Button, Space, Tag, Typography, Row, Col, Card, Input, Select, App, Spin,
} from 'antd'
import {
  CheckCircleOutlined, SearchOutlined, CreditCardOutlined,
  ClockCircleOutlined, ExclamationCircleOutlined, PlusOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { useNavigate } from 'react-router-dom'

import type { Saida, SaidaStatus } from '@/types'
import type { DbSaida } from '@/types/database'
import { supabase } from '@/lib/supabase'
import { formatBRL } from '@/utils/formatters'
import { formatDateBR, daysUntil } from '@/utils/dateHelpers'
import { SYN_COLORS } from '@/styles/theme'

const { Title, Text } = Typography

type SaidaRow = DbSaida & {
  categorias: { nome: string } | null
  centros_custo: { nome: string } | null
  contas_bancarias: { nome: string } | null
}

function DiasBadge({ data, status }: { data: string; status: SaidaStatus }) {
  if (status === 'pago') {
    return <Tag color="success" icon={<CheckCircleOutlined />}>Pago</Tag>
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

function dbToSaida(row: SaidaRow): Saida {
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

export default function ContasPagar() {
  const { message } = App.useApp()
  const navigate = useNavigate()

  const [abertas, setAbertas] = useState<Saida[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<SaidaStatus | ''>('')
  const [filterCategoria, setFilterCategoria] = useState('')

  useEffect(() => {
    async function fetchAbertas() {
      setLoading(true)
      const { data: rawData, error } = await supabase
        .from('saidas')
        .select('*, categorias!categoria_id(nome), centros_custo!centro_custo_id(nome), contas_bancarias!conta_bancaria_id(nome)')
        .in('status', ['pendente', 'atrasado'])
        .order('data_vencimento', { ascending: true })
      if (error) {
        message.error('Erro ao carregar contas a pagar.')
      } else {
        setAbertas(((rawData ?? []) as unknown as SaidaRow[]).map(dbToSaida))
      }
      setLoading(false)
    }
    fetchAbertas()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const totals = useMemo(() => {
    const total = abertas.reduce((s, e) => s + e.valor, 0)
    const atrasado = abertas.filter(s => s.status === 'atrasado').reduce((s, e) => s + e.valor, 0)
    const proxVenc = abertas.filter(s => {
      const d = daysUntil(s.vencimento)
      return d >= 0 && d <= 7
    }).reduce((s, e) => s + e.valor, 0)
    return { total, atrasado, proxVenc }
  }, [abertas])

  const categorias = useMemo(
    () => [...new Set(abertas.map(s => s.categoriaNome).filter(Boolean))].sort(),
    [abertas],
  )

  const filtered = useMemo(() => {
    return abertas.filter(s => {
      const q = search.toLowerCase()
      if (search && !s.descricao.toLowerCase().includes(q) && !s.fornecedor.toLowerCase().includes(q)) return false
      if (filterStatus && s.status !== filterStatus) return false
      if (filterCategoria && s.categoriaNome !== filterCategoria) return false
      return true
    }).sort((a, b) => a.vencimento.localeCompare(b.vencimento))
  }, [abertas, search, filterStatus, filterCategoria])

  async function handleMarkPago(id: string) {
    const { error } = await supabase.from('saidas').update({ status: 'pago' } as Record<string, unknown>).eq('id', id)
    if (error) {
      message.error('Erro ao atualizar status.')
      return
    }
    setAbertas(prev => prev.filter(s => s.id !== id))
    message.success('Conta marcada como paga.')
  }

  const columns: ColumnsType<Saida> = [
    {
      title: 'Fornecedor',
      dataIndex: 'fornecedor',
      key: 'fornecedor',
      ellipsis: true,
      width: 200,
    },
    {
      title: 'Descrição',
      dataIndex: 'descricao',
      key: 'descricao',
      ellipsis: true,
    },
    {
      title: 'Categoria',
      dataIndex: 'categoriaNome',
      key: 'categoriaNome',
      width: 160,
      ellipsis: true,
    },
    {
      title: 'Valor',
      dataIndex: 'valor',
      key: 'valor',
      width: 130,
      align: 'right',
      render: (v: number) => (
        <Text strong style={{ color: SYN_COLORS.danger }}>{formatBRL(v)}</Text>
      ),
      sorter: (a, b) => a.valor - b.valor,
    },
    {
      title: 'Vencimento',
      dataIndex: 'vencimento',
      key: 'vencimento',
      width: 120,
      render: (v: string) => formatDateBR(v),
      sorter: (a, b) => a.vencimento.localeCompare(b.vencimento),
    },
    {
      title: 'Dias p/ Vencimento',
      key: 'dias',
      width: 160,
      render: (_, record) => <DiasBadge data={record.vencimento} status={record.status} />,
      sorter: (a, b) => daysUntil(a.vencimento) - daysUntil(b.vencimento),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (s: SaidaStatus) => {
        if (s === 'pago') return <Tag icon={<CheckCircleOutlined />} color="success">Pago</Tag>
        if (s === 'pendente') return <Tag icon={<ClockCircleOutlined />} color="warning">Pendente</Tag>
        return <Tag icon={<ExclamationCircleOutlined />} color="error">Atrasado</Tag>
      },
    },
    {
      title: 'Ações',
      key: 'acoes',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Button
          size="small"
          type="primary"
          ghost
          icon={<CheckCircleOutlined />}
          onClick={() => handleMarkPago(record.id)}
        >
          Pago
        </Button>
      ),
    },
  ]

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0, fontWeight: 700 }}>Contas a Pagar</Title>
        <Text type="secondary" style={{ fontSize: 13 }}>Gestão de obrigações e valores a pagar a fornecedores</Text>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 320, flexDirection: 'column', gap: 16 }}>
          <Spin size="large" />
          <Text type="secondary">Carregando contas a pagar...</Text>
        </div>
      ) : abertas.length === 0 ? (
        <Card style={{ borderRadius: 12, textAlign: 'center' }} styles={{ body: { padding: '72px 24px' } }}>
          <CreditCardOutlined style={{ fontSize: 56, color: '#D1D5DB', marginBottom: 20 }} />
          <Title level={5} style={{ margin: '0 0 8px', color: '#6B7280', fontWeight: 600 }}>
            Nenhuma conta a pagar em aberto
          </Title>
          <Text type="secondary" style={{ fontSize: 14, display: 'block', marginBottom: 28 }}>
            Todas as saídas estão quitadas ou ainda não há despesas registradas.
          </Text>
          <Button type="primary" icon={<PlusOutlined />} size="large" onClick={() => navigate('/saidas')}>
            Registrar Saída
          </Button>
        </Card>
      ) : (
        <>
          {/* Cards resumo */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={8}>
              <Card styles={{ body: { padding: '16px 20px' } }} style={{ borderRadius: 12, borderLeft: `4px solid ${SYN_COLORS.primary}` }}>
                <Space>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: SYN_COLORS.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center', color: SYN_COLORS.primary, fontSize: 18 }}>
                    <CreditCardOutlined />
                  </div>
                  <div>
                    <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>Total a Pagar</Text>
                    <Text strong style={{ fontSize: 18, color: SYN_COLORS.primary }}>{formatBRL(totals.total)}</Text>
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
                  placeholder="Buscar por descrição ou fornecedor..."
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
                  options={[
                    { value: 'pendente', label: 'Pendente' },
                    { value: 'atrasado', label: 'Atrasado' },
                  ]}
                />
              </Col>
              <Col xs={12} sm={6} md={5}>
                <Select
                  style={{ width: '100%' }}
                  placeholder="Categoria"
                  allowClear
                  value={filterCategoria || undefined}
                  onChange={v => setFilterCategoria(v ?? '')}
                  options={categorias.map(c => ({ value: c, label: c }))}
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
              scroll={{ x: 1050 }}
              pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t) => `${t} registros`, pageSizeOptions: ['10', '20', '50'] }}
              locale={{ emptyText: <div style={{ padding: 40, textAlign: 'center' }}><CreditCardOutlined style={{ fontSize: 32, color: '#D1D5DB', marginBottom: 8 }} /><br /><Text type="secondary">Nenhuma conta encontrada com os filtros aplicados</Text></div> }}
            />
          </Card>
        </>
      )}
    </div>
  )
}
