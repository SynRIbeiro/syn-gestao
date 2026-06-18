import { Card, Typography, Space } from 'antd'
import { ArrowUpOutlined, ArrowDownOutlined, MinusOutlined } from '@ant-design/icons'
interface ComparisonItem {
  label: string
  current: number
  previous: number
  higherIsBetter: boolean
}
import { formatBRL } from '@/utils/formatters'
import { SYN_COLORS } from '@/styles/theme'

const { Title, Text } = Typography

interface MonthComparisonProps {
  currentMonth: string
  previousMonth: string
  items: ComparisonItem[]
}

function getVariation(current: number, previous: number, higherIsBetter: boolean) {
  if (previous === 0) return { pct: 0, positive: true }
  const pct = ((current - previous) / Math.abs(previous)) * 100
  const positive = higherIsBetter ? pct >= 0 : pct <= 0
  return { pct, positive }
}

export default function MonthComparison({ currentMonth, previousMonth, items }: MonthComparisonProps) {
  return (
    <Card
      style={{ borderRadius: 12, border: '1px solid #E5E7EB', height: '100%' }}
      styles={{ body: { padding: '20px 24px' } }}
    >
      <div style={{ marginBottom: 20 }}>
        <Title level={5} style={{ margin: 0, fontWeight: 600 }}>
          Comparativo Mensal
        </Title>
        <Text type="secondary" style={{ fontSize: 13 }}>
          {previousMonth} → {currentMonth}
        </Text>
      </div>

      {/* Cabeçalho da tabela */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          paddingBottom: 10,
          borderBottom: `2px solid ${SYN_COLORS.border}`,
          marginBottom: 4,
        }}
      >
        <Text style={{ fontSize: 11, color: SYN_COLORS.textSecondary, fontWeight: 600, flex: 1, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Métrica
        </Text>
        <Text style={{ fontSize: 11, color: SYN_COLORS.textSecondary, fontWeight: 600, width: 88, textAlign: 'right', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Mês ant.
        </Text>
        <Text style={{ fontSize: 11, color: SYN_COLORS.textSecondary, fontWeight: 600, width: 88, textAlign: 'right', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Mês atual
        </Text>
        <Text style={{ fontSize: 11, color: SYN_COLORS.textSecondary, fontWeight: 600, width: 60, textAlign: 'right', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Var.
        </Text>
      </div>

      <Space direction="vertical" size={0} style={{ width: '100%' }}>
        {items.map((item, index) => {
          const { pct, positive } = getVariation(item.current, item.previous, item.higherIsBetter)
          const isNeutral = pct === 0
          const trendColor = isNeutral
            ? SYN_COLORS.textSecondary
            : positive
            ? SYN_COLORS.success
            : SYN_COLORS.danger

          const TrendIcon = isNeutral ? MinusOutlined : positive ? ArrowUpOutlined : ArrowDownOutlined

          return (
            <div
              key={item.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '12px 0',
                borderBottom: index < items.length - 1 ? `1px solid #F3F4F6` : 'none',
              }}
            >
              <div style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: 500, color: SYN_COLORS.textPrimary }}>
                  {item.label}
                </Text>
              </div>

              <Text
                style={{
                  fontSize: 13,
                  color: SYN_COLORS.textSecondary,
                  width: 88,
                  textAlign: 'right',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {formatBRL(item.previous)}
              </Text>

              <Text
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: SYN_COLORS.textPrimary,
                  width: 88,
                  textAlign: 'right',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {formatBRL(item.current)}
              </Text>

              <div
                style={{
                  width: 60,
                  textAlign: 'right',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: 3,
                }}
              >
                <TrendIcon style={{ color: trendColor, fontSize: 10 }} />
                <Text style={{ fontSize: 12, fontWeight: 600, color: trendColor }}>
                  {Math.abs(pct).toFixed(1).replace('.', ',')}%
                </Text>
              </div>
            </div>
          )
        })}
      </Space>

      {/* Rodapé com total de variação geral */}
      <div
        style={{
          marginTop: 16,
          paddingTop: 12,
          borderTop: `1px solid ${SYN_COLORS.border}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Text style={{ fontSize: 12, color: SYN_COLORS.textSecondary }}>
          Período analisado
        </Text>
        <div
          style={{
            background: SYN_COLORS.primaryLight,
            borderRadius: 6,
            padding: '3px 10px',
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: 600, color: SYN_COLORS.primary }}>
            {previousMonth} → {currentMonth}
          </Text>
        </div>
      </div>
    </Card>
  )
}
