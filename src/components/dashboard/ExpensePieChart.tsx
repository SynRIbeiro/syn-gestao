import { Card, Typography, Space } from 'antd'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts'
import type { ExpenseCategory } from '@/types'
import { formatBRL } from '@/utils/formatters'

const { Title, Text } = Typography

interface ExpensePieChartProps {
  data: ExpenseCategory[]
}

export default function ExpensePieChart({ data }: ExpensePieChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0)

  return (
    <Card
      style={{ borderRadius: 12, border: '1px solid #E5E7EB', height: '100%' }}
      styles={{ body: { padding: '20px 24px' } }}
    >
      <div style={{ marginBottom: 16 }}>
        <Title level={5} style={{ margin: 0, fontWeight: 600 }}>
          Despesas por Categoria
        </Title>
        <Text type="secondary" style={{ fontSize: 13 }}>
          Distribuição das saídas no período
        </Text>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={95}
            paddingAngle={3}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => [formatBRL(Number(value ?? 0)), 'Valor']}
            contentStyle={{
              borderRadius: 8,
              border: '1px solid #E5E7EB',
              boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
            }}
          />
        </PieChart>
      </ResponsiveContainer>

      <Space direction="vertical" size={6} style={{ width: '100%', marginTop: 8 }}>
        {data.map((item) => (
          <div
            key={item.name}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <Space size={8}>
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  background: item.color,
                  flexShrink: 0,
                }}
              />
              <Text style={{ fontSize: 12 }}>{item.name}</Text>
            </Space>
            <Text style={{ fontSize: 12, fontWeight: 500 }}>
              {((item.value / total) * 100).toFixed(1).replace('.', ',')}%
            </Text>
          </div>
        ))}
      </Space>
    </Card>
  )
}
