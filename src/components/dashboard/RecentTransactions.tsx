import { Card, Typography, Table, Tag, Badge } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { Transaction } from '@/types'
import { formatBRL } from '@/utils/formatters'
import { formatDateBR } from '@/utils/dateHelpers'
import { SYN_COLORS } from '@/styles/theme'

const { Title, Text } = Typography

const statusConfig: Record<string, { color: string; label: string }> = {
  pago: { color: 'success', label: 'Pago' },
  pendente: { color: 'warning', label: 'Pendente' },
  vencido: { color: 'error', label: 'Vencido' },
  cancelado: { color: 'default', label: 'Cancelado' },
}

const columns: ColumnsType<Transaction> = [
  {
    title: 'Descrição',
    dataIndex: 'description',
    key: 'description',
    render: (text: string, record: Transaction) => (
      <div>
        <Text style={{ fontSize: 13, fontWeight: 500, display: 'block' }}>{text}</Text>
        {record.client && (
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.client}
          </Text>
        )}
      </div>
    ),
  },
  {
    title: 'Categoria',
    dataIndex: 'category',
    key: 'category',
    render: (cat: string) => (
      <Text type="secondary" style={{ fontSize: 12 }}>
        {cat}
      </Text>
    ),
  },
  {
    title: 'Data',
    dataIndex: 'date',
    key: 'date',
    render: (date: string) => (
      <Text style={{ fontSize: 13 }}>{formatDateBR(date)}</Text>
    ),
    responsive: ['md'],
  },
  {
    title: 'Status',
    dataIndex: 'status',
    key: 'status',
    render: (status: string) => {
      const cfg = statusConfig[status] ?? { color: 'default', label: status }
      return <Badge status={cfg.color as 'success' | 'error' | 'warning' | 'default'} text={cfg.label} />
    },
    responsive: ['sm'],
  },
  {
    title: 'Valor',
    dataIndex: 'amount',
    key: 'amount',
    align: 'right',
    render: (amount: number, record: Transaction) => (
      <Text
        strong
        style={{
          fontSize: 13,
          color: record.type === 'entrada' ? SYN_COLORS.success : SYN_COLORS.danger,
        }}
      >
        {record.type === 'entrada' ? '+' : '-'} {formatBRL(amount)}
      </Text>
    ),
  },
]

interface RecentTransactionsProps {
  data: Transaction[]
}

export default function RecentTransactions({ data }: RecentTransactionsProps) {
  return (
    <Card
      style={{ borderRadius: 12, border: '1px solid #E5E7EB' }}
      styles={{ body: { padding: '20px 24px' } }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <div>
          <Title level={5} style={{ margin: 0, fontWeight: 600 }}>
            Últimas Movimentações
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Transações mais recentes
          </Text>
        </div>
        <Tag color="purple" style={{ cursor: 'pointer', borderRadius: 6 }}>
          Ver todas
        </Tag>
      </div>

      <Table
        dataSource={data}
        columns={columns}
        rowKey="id"
        pagination={false}
        size="small"
        style={{ fontSize: 13 }}
        rowClassName={() => 'syn-table-row'}
      />
    </Card>
  )
}
