import { useState, useMemo } from 'react'
import { Row, Col, Card, Typography, Select, Tag, Space, Divider, Alert } from 'antd'
import { ArrowUpOutlined, ArrowDownOutlined, MinusOutlined, InfoCircleOutlined } from '@ant-design/icons'
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip as ReTooltip, Legend,
} from 'recharts'
import type { BalancoPeriodo } from '@/types'
import { formatBRL } from '@/utils/formatters'
import { SYN_COLORS } from '@/styles/theme'

const { Title, Text } = Typography

const ATIVO_CORES = ['#7C3AED', '#10B981', '#3B82F6', '#F59E0B', '#6B7280']
const PASSIVO_CORES = ['#EF4444', '#F97316', '#8B5CF6', '#06B6D4', '#9CA3AF']

function varPct(current: number, previous: number): number {
  if (previous === 0) return 0
  return ((current - previous) / Math.abs(previous)) * 100
}

interface ItemTableRowProps {
  label: string
  valor: number
  valorAnt?: number
  color?: string
}

function ItemRow({ label, valor, valorAnt, color }: ItemTableRowProps) {
  const vp = valorAnt != null ? varPct(valor, valorAnt) : null
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: valorAnt != null ? '1fr 110px 90px 70px' : '1fr 120px',
      gap: 8,
      padding: '7px 0',
      borderBottom: `1px solid ${SYN_COLORS.border}`,
      alignItems: 'center',
    }}>
      <Text style={{ fontSize: 13 }}>{label}</Text>
      <Text style={{ fontSize: 13, fontWeight: 600, textAlign: 'right', color: color ?? SYN_COLORS.textPrimary }}>
        {formatBRL(valor)}
      </Text>
      {valorAnt != null && (
        <>
          <Text style={{ fontSize: 12, textAlign: 'right', color: SYN_COLORS.textSecondary }}>
            {formatBRL(valorAnt)}
          </Text>
          <Text style={{
            fontSize: 12, textAlign: 'right',
            color: vp != null ? (vp >= 0 ? SYN_COLORS.success : SYN_COLORS.danger) : SYN_COLORS.textSecondary,
          }}>
            {vp != null && vp !== 0
              ? <>{vp > 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />} {Math.abs(vp).toFixed(1).replace('.', ',')}%</>
              : <MinusOutlined />}
          </Text>
        </>
      )}
    </div>
  )
}

function TotalRow({ label, valor, valorAnt, bg, textColor }: ItemTableRowProps & { bg: string; textColor: string }) {
  const vp = valorAnt != null ? varPct(valor, valorAnt) : null
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: valorAnt != null ? '1fr 110px 90px 70px' : '1fr 120px',
      gap: 8,
      padding: '10px 8px',
      background: bg,
      borderRadius: 8,
      marginTop: 8,
      alignItems: 'center',
    }}>
      <Text style={{ fontSize: 14, fontWeight: 700, color: textColor }}>{label}</Text>
      <Text style={{ fontSize: 15, fontWeight: 700, textAlign: 'right', color: textColor }}>
        {formatBRL(valor)}
      </Text>
      {valorAnt != null && (
        <>
          <Text style={{ fontSize: 13, textAlign: 'right', color: textColor, opacity: 0.75 }}>
            {formatBRL(valorAnt)}
          </Text>
          <Text style={{
            fontSize: 12, textAlign: 'right',
            color: vp != null ? (vp >= 0 ? '#16A34A' : '#DC2626') : textColor,
          }}>
            {vp != null && vp !== 0
              ? <>{vp > 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />} {Math.abs(vp).toFixed(1).replace('.', ',')}%</>
              : <MinusOutlined />}
          </Text>
        </>
      )}
    </div>
  )
}

const BALANCO_VAZIO: BalancoPeriodo = {
  id: 'vazio',
  label: 'Sem dados',
  ano: new Date().getFullYear(),
  mes: new Date().getMonth() + 1,
  ativos: {
    dinheiroCaixa: 0,
    contasBancarias: 0,
    contasReceber: 0,
    equipamentos: 0,
    outrosAtivos: 0,
    total: 0,
  },
  passivos: {
    contasPagar: 0,
    emprestimos: 0,
    impostosPendentes: 0,
    obrigacoesTrabalistas: 0,
    outrosPassivos: 0,
    total: 0,
  },
  patrimonioLiquido: 0,
}

const balancoPeriodos: BalancoPeriodo[] = []

export default function Balanco() {
  const [selectedId, setSelectedId] = useState('vazio')

  const periodos = [...balancoPeriodos].sort((a, b) => {
    if (a.ano !== b.ano) return b.ano - a.ano
    return b.mes - a.mes
  })

  const currentPeriodo = useMemo((): BalancoPeriodo =>
    periodos.find(p => p.id === selectedId) ?? periodos[0] ?? BALANCO_VAZIO,
    [selectedId, periodos],
  )

  const previousPeriodo = useMemo((): BalancoPeriodo | null => {
    const idx = periodos.findIndex(p => p.id === selectedId)
    return idx >= 0 && idx < periodos.length - 1 ? periodos[idx + 1] : null
  }, [selectedId, periodos])

  const { ativos, passivos, patrimonioLiquido } = currentPeriodo
  const antAtivos = previousPeriodo?.ativos
  const antPassivos = previousPeriodo?.passivos
  const antPL = previousPeriodo?.patrimonioLiquido

  const indiceEndividamento = ativos.total > 0 ? (passivos.total / ativos.total) * 100 : 0

  const ativosChartData = [
    { name: 'Dinheiro em Caixa', value: ativos.dinheiroCaixa },
    { name: 'Contas Bancárias', value: ativos.contasBancarias },
    { name: 'Contas a Receber', value: ativos.contasReceber },
    { name: 'Equipamentos', value: ativos.equipamentos },
    { name: 'Outros Ativos', value: ativos.outrosAtivos },
  ]

  const passivosChartData = [
    { name: 'Contas a Pagar', value: passivos.contasPagar },
    { name: 'Empréstimos', value: passivos.emprestimos },
    { name: 'Impostos Pend.', value: passivos.impostosPendentes },
    { name: 'Obrig. Trabalhistas', value: passivos.obrigacoesTrabalistas },
    { name: 'Outros Passivos', value: passivos.outrosPassivos },
  ]

  const hasAnt = previousPeriodo != null
  const hasData = periodos.length > 0

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0, fontWeight: 700 }}>Balanço Financeiro</Title>
        <Text type="secondary">Posição patrimonial e financeira da empresa</Text>
      </div>

      {/* Banner informativo */}
      <Alert
        icon={<InfoCircleOutlined />}
        message="Nenhum balanço cadastrado"
        description="O balanço financeiro será gerado automaticamente conforme os dados forem registrados no sistema."
        type="info"
        showIcon
        style={{ marginBottom: 24, borderRadius: 10 }}
      />

      {/* Filtros */}
      <Card style={{ marginBottom: 24, borderRadius: 12 }} styles={{ body: { padding: '14px 20px' } }}>
        <Space wrap size={16}>
          <div>
            <Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Período</Text>
            <Select
              value={selectedId}
              onChange={setSelectedId}
              style={{ width: 220 }}
              disabled={!hasData}
              options={
                hasData
                  ? periodos.map(p => ({ label: p.label, value: p.id }))
                  : [{ label: 'Sem dados cadastrados', value: 'vazio' }]
              }
            />
          </div>
          {hasAnt && (
            <div style={{ paddingTop: 20 }}>
              <Tag color="default" style={{ borderRadius: 6 }}>
                Comparação com: {previousPeriodo!.label}
              </Tag>
            </div>
          )}
        </Space>
      </Card>

      {/* Cards de resumo */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        {[
          { label: 'Total de Ativos', numVal: ativos.total, display: formatBRL(ativos.total), antVal: antAtivos?.total, color: SYN_COLORS.info },
          { label: 'Total de Passivos', numVal: passivos.total, display: formatBRL(passivos.total), antVal: antPassivos?.total, color: SYN_COLORS.danger },
          { label: 'Patrimônio Líquido', numVal: patrimonioLiquido, display: formatBRL(patrimonioLiquido), antVal: antPL, color: patrimonioLiquido >= 0 ? SYN_COLORS.success : SYN_COLORS.danger },
          { label: 'Índice de Endividamento', numVal: indiceEndividamento, display: `${indiceEndividamento.toFixed(1).replace('.', ',')}%`, antVal: undefined as number | undefined, color: SYN_COLORS.success },
        ].map(card => {
          const vp = card.antVal != null ? varPct(card.numVal, card.antVal) : null
          return (
            <Col xs={24} sm={12} lg={6} key={card.label}>
              <Card style={{ borderRadius: 12, height: '100%' }} styles={{ body: { padding: '16px 20px' } }}>
                <Text type="secondary" style={{ fontSize: 12 }}>{card.label}</Text>
                <div style={{ marginTop: 4 }}>
                  <Text style={{ fontSize: 20, fontWeight: 700, color: card.color }}>
                    {card.display}
                  </Text>
                </div>
                {card.antVal != null && vp != null && (
                  <Text style={{ fontSize: 12, color: vp >= 0 ? SYN_COLORS.success : SYN_COLORS.danger }}>
                    {vp >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                    {' '}{Math.abs(vp).toFixed(1).replace('.', ',')}% vs anterior
                  </Text>
                )}
              </Card>
            </Col>
          )
        })}
      </Row>

      {/* Tabelas de Ativos e Passivos */}
      <Row gutter={24} style={{ marginBottom: 24 }}>
        {/* ATIVOS */}
        <Col xs={24} lg={12}>
          <Card style={{ borderRadius: 12, height: '100%' }}>
            <div style={{ marginBottom: 12 }}>
              <Title level={5} style={{ margin: 0, color: SYN_COLORS.info }}>ATIVOS</Title>
            </div>
            <ItemRow label="Dinheiro em Caixa" valor={ativos.dinheiroCaixa} valorAnt={antAtivos?.dinheiroCaixa} />
            <ItemRow label="Contas Bancárias" valor={ativos.contasBancarias} valorAnt={antAtivos?.contasBancarias} />
            <ItemRow label="Contas a Receber" valor={ativos.contasReceber} valorAnt={antAtivos?.contasReceber} />
            <ItemRow label="Equipamentos" valor={ativos.equipamentos} valorAnt={antAtivos?.equipamentos} />
            <ItemRow label="Outros Ativos" valor={ativos.outrosAtivos} valorAnt={antAtivos?.outrosAtivos} />
            <TotalRow
              label="TOTAL DE ATIVOS"
              valor={ativos.total}
              valorAnt={antAtivos?.total}
              bg="#EFF6FF"
              textColor={SYN_COLORS.info}
            />
          </Card>
        </Col>

        {/* PASSIVOS */}
        <Col xs={24} lg={12}>
          <Card style={{ borderRadius: 12, height: '100%' }}>
            <div style={{ marginBottom: 12 }}>
              <Title level={5} style={{ margin: 0, color: SYN_COLORS.danger }}>PASSIVOS</Title>
            </div>
            <ItemRow label="Contas a Pagar" valor={passivos.contasPagar} valorAnt={antPassivos?.contasPagar} color={SYN_COLORS.danger} />
            <ItemRow label="Empréstimos" valor={passivos.emprestimos} valorAnt={antPassivos?.emprestimos} color={SYN_COLORS.danger} />
            <ItemRow label="Impostos Pendentes" valor={passivos.impostosPendentes} valorAnt={antPassivos?.impostosPendentes} color={SYN_COLORS.danger} />
            <ItemRow label="Obrigações Trabalhistas" valor={passivos.obrigacoesTrabalistas} valorAnt={antPassivos?.obrigacoesTrabalistas} color={SYN_COLORS.danger} />
            <ItemRow label="Outros Passivos" valor={passivos.outrosPassivos} valorAnt={antPassivos?.outrosPassivos} color={SYN_COLORS.danger} />
            <TotalRow
              label="TOTAL DE PASSIVOS"
              valor={passivos.total}
              valorAnt={antPassivos?.total}
              bg="#FEF2F2"
              textColor={SYN_COLORS.danger}
            />

            <Divider />

            {/* Patrimônio Líquido */}
            <div style={{
              background: '#ECFDF5',
              borderRadius: 10,
              padding: '12px 16px',
              border: `2px solid ${SYN_COLORS.success}`,
            }}>
              <Row justify="space-between" align="middle">
                <Col>
                  <Text style={{ fontWeight: 700, fontSize: 14, color: SYN_COLORS.success }}>
                    PATRIMÔNIO LÍQUIDO
                  </Text>
                  <div>
                    <Text type="secondary" style={{ fontSize: 11 }}>Total Ativos − Total Passivos</Text>
                  </div>
                </Col>
                <Col>
                  <Text style={{ fontWeight: 700, fontSize: 18, color: SYN_COLORS.success }}>
                    {formatBRL(patrimonioLiquido)}
                  </Text>
                  {antPL != null && (
                    <div style={{ textAlign: 'right' }}>
                      <Text style={{ fontSize: 12, color: patrimonioLiquido >= antPL ? SYN_COLORS.success : SYN_COLORS.danger }}>
                        {patrimonioLiquido >= antPL ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                        {' '}{Math.abs(varPct(patrimonioLiquido, antPL)).toFixed(1).replace('.', ',')}%
                      </Text>
                    </div>
                  )}
                </Col>
              </Row>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Gráficos de composição */}
      <Row gutter={24}>
        <Col xs={24} lg={12}>
          <Card
            title={<Title level={5} style={{ margin: 0 }}>Composição de Ativos</Title>}
            style={{ borderRadius: 12 }}
          >
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={ativosChartData.filter(d => d.value > 0)}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={95}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {ativosChartData.map((_, i) => (
                    <Cell key={i} fill={ATIVO_CORES[i % ATIVO_CORES.length]} />
                  ))}
                </Pie>
                <ReTooltip
                  formatter={(v) => [formatBRL(Number(v)), 'Valor']}
                  contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB' }}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            {ativosChartData.every(d => d.value === 0) && (
              <div style={{ textAlign: 'center', marginTop: -150, paddingBottom: 20 }}>
                <Text type="secondary" style={{ fontSize: 13 }}>Nenhum ativo cadastrado</Text>
              </div>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            title={<Title level={5} style={{ margin: 0 }}>Composição de Passivos</Title>}
            style={{ borderRadius: 12 }}
          >
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={passivosChartData.filter(d => d.value > 0)}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={95}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {passivosChartData.map((_, i) => (
                    <Cell key={i} fill={PASSIVO_CORES[i % PASSIVO_CORES.length]} />
                  ))}
                </Pie>
                <ReTooltip
                  formatter={(v) => [formatBRL(Number(v)), 'Valor']}
                  contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB' }}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            {passivosChartData.every(d => d.value === 0) && (
              <div style={{ textAlign: 'center', marginTop: -150, paddingBottom: 20 }}>
                <Text type="secondary" style={{ fontSize: 13 }}>Nenhum passivo cadastrado</Text>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  )
}
