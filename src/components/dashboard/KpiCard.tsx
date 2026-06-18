import { Card, Typography, Space } from 'antd'
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons'
import type { ReactNode } from 'react'
import { formatBRL, formatPercent } from '@/utils/formatters'
import { SYN_COLORS } from '@/styles/theme'

const { Text, Title } = Typography

interface KpiCardProps {
  label: string
  value: number
  format?: 'currency' | 'percent' | 'number'
  previousValue?: number
  icon: ReactNode
  iconBg?: string
  onClick?: () => void
}

export default function KpiCard({
  label,
  value,
  format = 'currency',
  previousValue,
  icon,
  iconBg = SYN_COLORS.primaryLight,
  onClick,
}: KpiCardProps) {
  const formattedValue =
    format === 'currency'
      ? formatBRL(value)
      : format === 'percent'
      ? `${value.toFixed(1).replace('.', ',')}%`
      : value.toLocaleString('pt-BR')

  const variation =
    previousValue !== undefined && previousValue !== 0
      ? ((value - previousValue) / Math.abs(previousValue)) * 100
      : undefined

  const isPositive = variation !== undefined && variation >= 0

  return (
    <Card
      hoverable={!!onClick}
      onClick={onClick}
      style={{
        borderRadius: 12,
        border: '1px solid #E5E7EB',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'box-shadow 0.2s, transform 0.2s',
        height: '100%',
      }}
      styles={{ body: { padding: '20px 24px' } }}
    >
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: SYN_COLORS.textSecondary, fontSize: 13, fontWeight: 500 }}>
            {label}
          </Text>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: iconBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              color: SYN_COLORS.primary,
            }}
          >
            {icon}
          </div>
        </div>

        <Title level={3} style={{ margin: 0, fontSize: 22, fontWeight: 700, color: SYN_COLORS.textPrimary }}>
          {formattedValue}
        </Title>

        {variation !== undefined && (
          <Space size={4}>
            {isPositive ? (
              <ArrowUpOutlined style={{ color: SYN_COLORS.success, fontSize: 12 }} />
            ) : (
              <ArrowDownOutlined style={{ color: SYN_COLORS.danger, fontSize: 12 }} />
            )}
            <Text
              style={{
                fontSize: 12,
                color: isPositive ? SYN_COLORS.success : SYN_COLORS.danger,
                fontWeight: 500,
              }}
            >
              {formatPercent(Math.abs(variation))} vs mês anterior
            </Text>
          </Space>
        )}
      </Space>
    </Card>
  )
}
