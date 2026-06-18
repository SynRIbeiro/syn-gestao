import { Card, Typography } from 'antd'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts'
import type { RevenueSource } from '@/types'
import { formatCompactBRL } from '@/utils/formatters'
import { SYN_COLORS } from '@/styles/theme'

const { Title, Text } = Typography

const COLORS = ['#7C3AED', '#8B5CF6', '#A78BFA', '#C4B5FD', '#DDD6FE']

interface RevenueBarChartProps {
  data: RevenueSource[]
}

export default function RevenueBarChart({ data }: RevenueBarChartProps) {
  const sorted = [...data].sort((a, b) => b.value - a.value)

  return (
    <Card
      style={{ borderRadius: 12, border: '1px solid #E5E7EB', height: '100%' }}
      styles={{ body: { padding: '20px 24px' } }}
    >
      <div style={{ marginBottom: 16 }}>
        <Title level={5} style={{ margin: 0, fontWeight: 600 }}>
          Fontes de Receita
        </Title>
        <Text type="secondary" style={{ fontSize: 13 }}>
          Receitas por origem no período
        </Text>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <BarChart
          data={sorted}
          layout="vertical"
          margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F3F4F6" />
          <XAxis
            type="number"
            tickFormatter={formatCompactBRL}
            tick={{ fontSize: 11, fill: SYN_COLORS.textSecondary }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 12, fill: SYN_COLORS.textSecondary }}
            axisLine={false}
            tickLine={false}
            width={100}
          />
          <Tooltip
            formatter={(value) => [formatCompactBRL(Number(value ?? 0)), 'Receita']}
            contentStyle={{
              borderRadius: 8,
              border: '1px solid #E5E7EB',
              boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
            }}
          />
          <Bar dataKey="value" radius={[0, 6, 6, 0]}>
            {sorted.map((_entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  )
}
