import { Card, Typography, List, Tag, Space } from 'antd'
import { ClockCircleOutlined, WarningOutlined } from '@ant-design/icons'
import type { Transaction } from '@/types'
import { formatBRL } from '@/utils/formatters'
import { formatDateBR, daysUntil } from '@/utils/dateHelpers'
import { SYN_COLORS } from '@/styles/theme'

const { Title, Text } = Typography

function getDueBadge(dueDate: string) {
  const days = daysUntil(dueDate)
  if (days < 0) return { color: SYN_COLORS.danger, label: 'Vencida', icon: <WarningOutlined /> }
  if (days === 0) return { color: SYN_COLORS.warning, label: 'Vence hoje', icon: <ClockCircleOutlined /> }
  if (days <= 3) return { color: SYN_COLORS.warning, label: `${days}d`, icon: <ClockCircleOutlined /> }
  return { color: SYN_COLORS.textSecondary, label: `${days}d`, icon: <ClockCircleOutlined /> }
}

interface UpcomingBillsProps {
  data: Transaction[]
}

export default function UpcomingBills({ data }: UpcomingBillsProps) {
  return (
    <Card
      style={{ borderRadius: 12, border: '1px solid #E5E7EB', height: '100%' }}
      styles={{ body: { padding: '20px 24px' } }}
    >
      <div style={{ marginBottom: 16 }}>
        <Title level={5} style={{ margin: 0, fontWeight: 600 }}>
          Próximos Vencimentos
        </Title>
        <Text type="secondary" style={{ fontSize: 13 }}>
          Contas a vencer nos próximos dias
        </Text>
      </div>

      <List
        dataSource={data}
        renderItem={(item) => {
          const badge = getDueBadge(item.dueDate ?? item.date)
          return (
            <List.Item
              style={{
                padding: '10px 0',
                borderBottom: '1px solid #F3F4F6',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    style={{ fontSize: 13, fontWeight: 500, display: 'block' }}
                    ellipsis
                  >
                    {item.description}
                  </Text>
                  <Space size={6} style={{ marginTop: 2 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {formatDateBR(item.dueDate ?? item.date)}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>·</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {item.category}
                    </Text>
                  </Space>
                </div>
                <Space direction="vertical" align="end" size={4} style={{ marginLeft: 12 }}>
                  <Text strong style={{ fontSize: 13, color: SYN_COLORS.danger }}>
                    {formatBRL(item.amount)}
                  </Text>
                  <Tag
                    icon={badge.icon}
                    style={{
                      borderRadius: 6,
                      fontSize: 11,
                      color: badge.color,
                      borderColor: badge.color,
                      background: 'transparent',
                      margin: 0,
                    }}
                  >
                    {badge.label}
                  </Tag>
                </Space>
              </div>
            </List.Item>
          )
        }}
      />
    </Card>
  )
}
