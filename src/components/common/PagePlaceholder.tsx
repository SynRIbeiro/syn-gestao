import { Card, Typography, Space } from 'antd'
import { ClockCircleOutlined } from '@ant-design/icons'
import type { ReactNode } from 'react'
import { SYN_COLORS } from '@/styles/theme'

const { Title, Text } = Typography

interface PagePlaceholderProps {
  title: string
  description?: string
  icon?: ReactNode
}

export default function PagePlaceholder({ title, description, icon }: PagePlaceholderProps) {
  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0, fontWeight: 700 }}>
          {title}
        </Title>
        {description && (
          <Text type="secondary" style={{ fontSize: 13 }}>
            {description}
          </Text>
        )}
      </div>

      <Card
        style={{
          borderRadius: 12,
          border: '1px solid #E5E7EB',
          minHeight: 400,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        styles={{ body: { width: '100%', textAlign: 'center', padding: 64 } }}
      >
        <Space direction="vertical" size={16} align="center">
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 18,
              background: SYN_COLORS.primaryLight,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 32,
              color: SYN_COLORS.primary,
              margin: '0 auto',
            }}
          >
            {icon ?? <ClockCircleOutlined />}
          </div>
          <div>
            <Title level={4} style={{ margin: '0 0 8px', fontWeight: 600 }}>
              {title}
            </Title>
            <Text type="secondary" style={{ fontSize: 14 }}>
              Esta seção será implementada na próxima fase.
            </Text>
          </div>
        </Space>
      </Card>
    </div>
  )
}
