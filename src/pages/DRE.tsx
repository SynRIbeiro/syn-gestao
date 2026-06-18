import { useState, useMemo } from 'react'
import {
  Select, Row, Col, Card, Typography, Space, DatePicker, Divider, Alert,
} from 'antd'
import {
  InfoCircleOutlined,
} from '@ant-design/icons'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip as ReTooltip, Cell,
} from 'recharts'
import type { DREPeriodo, DRELinha } from '@/types'
import { formatBRL } from '@/utils/formatters'
import { dayjs } from '@/utils/dateHelpers'
import { SYN_COLORS } from '@/styles/theme'

const { Title, Text } = Typography
const { RangePicker } = DatePicker

type FilterTipo = 'mensal' | 'trimestral' | 'anual' | 'personalizado'
type RowTipo = 'section' | 'line' | 'subtotal' | 'total'

interface DRETableRow {
  key: string
  tipo: RowTipo
  descricao: string
  campo: keyof DRELinha | null
  negativo?: boolean
  nivel?: number
}

const DRE_LINHAS: DRETableRow[] = [
  { key: 'sec_rec', tipo: 'section', descricao: 'RECEITA', campo: null },
  { key: 'rec_bruta', tipo: 'line', descricao: 'Receita Bruta', campo: 'receitaBruta', nivel: 0 },
  { key: 'ded', tipo: 'line', descricao: '(-) Deduções e Impostos', campo: 'deducoesImpostos', negativo: true, nivel: 1 },
  { key: 'rec_liq', tipo: 'subtotal', descricao: '= Receita Líquida', campo: 'receitaLiquida', nivel: 0 },
  { key: 'sec_cus', tipo: 'section', descricao: 'CUSTOS', campo: null },
  { key: 'cus_serv', tipo: 'line', descricao: '(-) Custos dos Serviços', campo: 'custosServicos', negativo: true, nivel: 1 },
  { key: 'luc_bruto', tipo: 'subtotal', descricao: '= Lucro Bruto', campo: 'lucroBruto', nivel: 0 },
  { key: 'sec_desp', tipo: 'section', descricao: 'DESPESAS OPERACIONAIS', campo: null },
  { key: 'desp_adm', tipo: 'line', descricao: 'Despesas Administrativas', campo: 'despesasAdministrativas', negativo: true, nivel: 1 },
  { key: 'desp_mkt', tipo: 'line', descricao: 'Despesas de Marketing', campo: 'despesasMarketing', negativo: true, nivel: 1 },
  { key: 'outras_desp', tipo: 'line', descricao: 'Outras Despesas', campo: 'outrasDespesas', negativo: true, nivel: 1 },
  { key: 'total_desp_op', tipo: 'subtotal', descricao: '(-) Total de Despesas Operacionais', campo: 'despesasOperacionais', negativo: true, nivel: 0 },
  { key: 'sec_res', tipo: 'section', descricao: 'RESULTADO', campo: null },
  { key: 'res_op', tipo: 'subtotal', descricao: '= Resultado Operacional', campo: 'resultadoOperacional', nivel: 0 },
  { key: 'luc_liq', tipo: 'total', descricao: '= Lucro Líquido', campo: 'lucroLiquido', nivel: 0 },
]

const CHART_COLORS: Record<string, string> = {
  'Receita Bruta': SYN_COLORS.success,
  'Deduções/Impostos': SYN_COLORS.danger,
  'Custo Serviços': '#F97316',
  'Desp. Administrativas': '#6366F1',
  'Desp. Marketing': '#8B5CF6',
  'Outras Despesas': '#A78BFA',
}

const DADOS_VAZIOS: DRELinha = {
  receitaBruta: 0,
  deducoesImpostos: 0,
  receitaLiquida: 0,
  custosServicos: 0,
  lucroBruto: 0,
  despesasAdministrativas: 0,
  despesasMarketing: 0,
  outrasDespesas: 0,
  despesasOperacionais: 0,
  resultadoOperacional: 0,
  lucroLiquido: 0,
}

const PERIODO_VAZIO: DREPeriodo = {
  id: 'vazio',
  label: 'Sem dados',
  tipo: 'mensal',
  sortKey: 0,
  dados: DADOS_VAZIOS,
}

const drePeriodos: DREPeriodo[] = []


export default function DRE() {
  const [filterTipo, setFilterTipo] = useState<FilterTipo>('mensal')
  const [selectedId, setSelectedId] = useState('vazio')
  const [customRange, setCustomRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null)

  const periodsForTipo = useMemo(() =>
    drePeriodos
      .filter(p => p.tipo === (filterTipo === 'personalizado' ? 'mensal' : filterTipo))
      .sort((a, b) => b.sortKey - a.sortKey),
    [filterTipo],
  )

  const currentPeriodo = useMemo((): DREPeriodo => {
    if (filterTipo === 'personalizado') {
      if (customRange) {
        const endKey = customRange[1].year() * 100 + (customRange[1].month() + 1)
        const sorted = drePeriodos
          .filter(p => p.tipo === 'mensal')
          .sort((a, b) => Math.abs(a.sortKey - endKey) - Math.abs(b.sortKey - endKey))
        if (sorted[0]) return sorted[0]
      }
      return PERIODO_VAZIO
    }
    return drePeriodos.find(p => p.id === selectedId) ?? periodsForTipo[0] ?? PERIODO_VAZIO
  }, [filterTipo, selectedId, customRange, periodsForTipo])

  const dados = currentPeriodo.dados

  const chartData = useMemo(() => [
    { name: 'Receita Bruta', valor: dados.receitaBruta },
    { name: 'Deduções/Impostos', valor: dados.deducoesImpostos },
    { name: 'Custo Serviços', valor: dados.custosServicos },
    { name: 'Desp. Administrativas', valor: dados.despesasAdministrativas },
    { name: 'Desp. Marketing', valor: dados.despesasMarketing },
    { name: 'Outras Despesas', valor: dados.outrasDespesas },
  ].sort((a, b) => b.valor - a.valor), [dados])

  function handleTipoChange(tipo: FilterTipo) {
    setFilterTipo(tipo)
    setSelectedId('vazio')
  }

  const colunas = '1fr 130px 70px'

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0, fontWeight: 700 }}>DRE</Title>
        <Text type="secondary">Demonstração do Resultado do Exercício</Text>
      </div>

      {/* Banner informativo */}
      <Alert
        icon={<InfoCircleOutlined />}
        message="Nenhuma movimentação cadastrada"
        description="A DRE será calculada automaticamente após o cadastro de entradas e saídas. Os valores abaixo refletem o estado atual: R$ 0,00."
        type="info"
        showIcon
        style={{ marginBottom: 24, borderRadius: 10 }}
      />

      {/* Filtros */}
      <Card style={{ marginBottom: 24, borderRadius: 12 }} styles={{ body: { padding: '14px 20px' } }}>
        <Space wrap size={16}>
          <div>
            <Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Visualização</Text>
            <Select
              value={filterTipo}
              onChange={handleTipoChange}
              style={{ width: 200 }}
              options={[
                { label: 'Mensal', value: 'mensal' },
                { label: 'Trimestral', value: 'trimestral' },
                { label: 'Anual', value: 'anual' },
                { label: 'Período Personalizado', value: 'personalizado' },
              ]}
            />
          </div>
          {filterTipo !== 'personalizado' && (
            <div>
              <Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Período</Text>
              <Select
                value={selectedId}
                onChange={setSelectedId}
                style={{ width: 240 }}
                disabled
                options={[{ label: 'Sem dados cadastrados', value: 'vazio' }]}
              />
            </div>
          )}
          {filterTipo === 'personalizado' && (
            <div>
              <Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Intervalo de Datas</Text>
              <RangePicker
                format="MM/YYYY"
                picker="month"
                onChange={v => setCustomRange(v as [dayjs.Dayjs, dayjs.Dayjs] | null)}
                placeholder={['Mês inicial', 'Mês final']}
              />
            </div>
          )}
        </Space>
      </Card>

      {/* Cards de resumo */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        {[
          { label: 'Receita Bruta', campo: 'receitaBruta' as keyof DRELinha, color: SYN_COLORS.info },
          { label: 'Lucro Bruto', campo: 'lucroBruto' as keyof DRELinha, color: SYN_COLORS.success },
          { label: 'Desp. Operacionais', campo: 'despesasOperacionais' as keyof DRELinha, color: SYN_COLORS.warning },
          { label: 'Lucro Líquido', campo: 'lucroLiquido' as keyof DRELinha, color: SYN_COLORS.primary },
        ].map(card => {
          const val = dados[card.campo]
          return (
            <Col xs={24} sm={12} lg={6} key={card.label}>
              <Card style={{ borderRadius: 12, height: '100%' }} styles={{ body: { padding: '16px 20px' } }}>
                <Text type="secondary" style={{ fontSize: 12 }}>{card.label}</Text>
                <div style={{ marginTop: 4 }}>
                  <Text style={{ fontSize: 20, fontWeight: 700, color: card.color }}>
                    {formatBRL(val)}
                  </Text>
                </div>
              </Card>
            </Col>
          )
        })}
      </Row>

      <Row gutter={24}>
        {/* Tabela DRE */}
        <Col xs={24} xl={15}>
          <Card
            title={<Title level={5} style={{ margin: 0 }}>Estrutura do Resultado</Title>}
            style={{ borderRadius: 12 }}
          >
            <div style={{ overflowX: 'auto' }}>
              {/* Cabeçalho */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: colunas,
                gap: 8,
                padding: '8px 12px',
                background: '#F9FAFB',
                borderRadius: 8,
                marginBottom: 4,
                minWidth: 480,
              }}>
                <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Descrição</Text>
                <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, textAlign: 'right' }}>Valor</Text>
                <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, textAlign: 'right' }}>% RB</Text>
              </div>

              {DRE_LINHAS.map(row => {
                const campo = row.campo
                const val = campo !== null ? dados[campo] : 0
                const pct = dados.receitaBruta > 0 ? (val / dados.receitaBruta) * 100 : 0

                if (row.tipo === 'section') {
                  return (
                    <div key={row.key} style={{ padding: '10px 12px 2px', minWidth: 480 }}>
                      <Text style={{
                        fontSize: 10, fontWeight: 700,
                        textTransform: 'uppercase', letterSpacing: '1px',
                        color: SYN_COLORS.textSecondary,
                      }}>
                        {row.descricao}
                      </Text>
                      <Divider style={{ margin: '4px 0' }} />
                    </div>
                  )
                }

                const isTotal = row.tipo === 'total'
                const isSubtotal = row.tipo === 'subtotal'
                const bg = isTotal ? '#ECFDF5' : isSubtotal ? '#F9FAFB' : 'transparent'
                const fw = isTotal ? 700 : isSubtotal ? 600 : 400
                const fs = isTotal ? 15 : 14
                const valueColor = row.negativo
                  ? SYN_COLORS.danger
                  : isTotal
                    ? SYN_COLORS.success
                    : SYN_COLORS.textPrimary

                return (
                  <div key={row.key} style={{
                    display: 'grid',
                    gridTemplateColumns: colunas,
                    gap: 8,
                    padding: '7px 12px',
                    paddingLeft: ((row.nivel ?? 0) * 16) + 12,
                    background: bg,
                    borderRadius: 6,
                    marginBottom: 2,
                    alignItems: 'center',
                    minWidth: 480,
                  }}>
                    <Text style={{ fontSize: fs, fontWeight: fw }}>{row.descricao}</Text>
                    <Text style={{ fontSize: fs, fontWeight: fw, textAlign: 'right', color: valueColor }}>
                      {row.negativo ? `(${formatBRL(val)})` : formatBRL(val)}
                    </Text>
                    <Text style={{ fontSize: 12, textAlign: 'right', color: SYN_COLORS.textSecondary }}>
                      {pct.toFixed(1).replace('.', ',')}%
                    </Text>
                  </div>
                )
              })}
            </div>
          </Card>
        </Col>

        {/* Gráfico horizontal */}
        <Col xs={24} xl={9}>
          <Card
            title={<Title level={5} style={{ margin: 0 }}>Distribuição por Categoria</Title>}
            style={{ borderRadius: 12, height: '100%' }}
          >
            <ResponsiveContainer width="100%" height={350}>
              <BarChart
                data={chartData.filter(d => d.valor > 0)}
                layout="vertical"
                margin={{ top: 4, right: 20, left: 12, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F3F4F6" />
                <XAxis
                  type="number"
                  tickFormatter={v => `R$${(Number(v) / 1000).toFixed(0)}K`}
                  tick={{ fontSize: 11, fill: SYN_COLORS.textSecondary }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11, fill: SYN_COLORS.textPrimary }}
                  axisLine={false}
                  tickLine={false}
                  width={140}
                />
                <ReTooltip
                  formatter={(v) => [formatBRL(Number(v)), 'Valor']}
                  contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB' }}
                />
                <Bar dataKey="valor" radius={[0, 4, 4, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={CHART_COLORS[entry.name] ?? SYN_COLORS.primary} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            {chartData.every(d => d.valor === 0) && (
              <div style={{ textAlign: 'center', marginTop: -200, paddingBottom: 40 }}>
                <Text type="secondary" style={{ fontSize: 13 }}>Nenhuma despesa registrada</Text>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  )
}
