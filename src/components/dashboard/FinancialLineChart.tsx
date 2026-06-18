import { Card, Typography } from 'antd'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import type { ChartDataPoint } from '@/types'
import { formatCompactBRL } from '@/utils/formatters'
import { SYN_COLORS } from '@/styles/theme'

const { Title, Text } = Typography

interface FinancialLineChartProps {
  data: ChartDataPoint[]
}

export default function FinancialLineChart({ data }: FinancialLineChartProps) {
  return (
    <Card
      style={{ borderRadius: 12, border: '1px solid #E5E7EB', height: '100%' }}
      styles={{ body: { padding: '20px 24px' } }}
    >
      <div style={{ marginBottom: 20 }}>
        <Title level={5} style={{ margin: 0, fontWeight: 600 }}>
          Evolução Financeira
        </Title>
        <Text type="secondary" style={{ fontSize: 13 }}>
          Entradas, saídas e lucro nos últimos 6 meses
        </Text>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 12, fill: SYN_COLORS.textSecondary }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={formatCompactBRL}
            tick={{ fontSize: 12, fill: SYN_COLORS.textSecondary }}
            axisLine={false}
            tickLine={false}
            width={70}
          />
          <Tooltip
            formatter={(value) => [formatCompactBRL(Number(value ?? 0))]}
            contentStyle={{
              borderRadius: 8,
              border: '1px solid #E5E7EB',
              boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 16 }}
            formatter={(value) => {
              const map: Record<string, string> = {
                entradas: 'Entradas',
                saidas: 'Saídas',
                lucro: 'Lucro',
              }
              return map[value] ?? value
            }}
          />
          <Line
            type="monotone"
            dataKey="entradas"
            stroke={SYN_COLORS.success}
            strokeWidth={2.5}
            dot={{ r: 4, fill: SYN_COLORS.success }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="saidas"
            stroke={SYN_COLORS.danger}
            strokeWidth={2.5}
            dot={{ r: 4, fill: SYN_COLORS.danger }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="lucro"
            stroke={SYN_COLORS.primary}
            strokeWidth={2.5}
            dot={{ r: 4, fill: SYN_COLORS.primary }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  )
}
