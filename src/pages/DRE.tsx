import { useState, useMemo, useEffect } from 'react'
import {
  Select, Row, Col, Card, Typography, Space, DatePicker, Divider, Spin,
} from 'antd'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip as ReTooltip, Cell,
} from 'recharts'
import type { DREPeriodo, DRELinha } from '@/types'
import { formatBRL } from '@/utils/formatters'
import { dayjs } from '@/utils/dateHelpers'
import { SYN_COLORS } from '@/styles/theme'
import { supabase } from '@/lib/supabase'
import { EMPRESA_ID } from '@/lib/constants'

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
  receitaBruta: 0, deducoesImpostos: 0, receitaLiquida: 0,
  custosServicos: 0, lucroBruto: 0, despesasAdministrativas: 0,
  despesasMarketing: 0, outrasDespesas: 0, despesasOperacionais: 0,
  resultadoOperacional: 0, lucroLiquido: 0,
}

const PERIODO_VAZIO: DREPeriodo = { id: 'vazio', label: 'Sem dados', tipo: 'mensal', sortKey: 0, dados: DADOS_VAZIOS }

function categorizarSaida(nomeCategoria: string): 'admin' | 'marketing' | 'outra' {
  const n = nomeCategoria.toLowerCase()
  if (n.includes('marketing') || n.includes('publicidade') || n.includes('propaganda') || n.includes('anuncio') || n.includes('anúncio')) return 'marketing'
  if (n.includes('admin') || n.includes('operacional') || n.includes('escritorio') || n.includes('escritório') || n.includes('aluguel') || n.includes('salario') || n.includes('salário') || n.includes('folha')) return 'admin'
  return 'outra'
}

interface EntradaRow { valor: number; data_vencimento: string | null }
interface SaidaRow { valor: number; data_vencimento: string | null; categorias: { nome: string } | null }

export default function DRE() {
  const [filterTipo, setFilterTipo] = useState<FilterTipo>('mensal')
  const [selectedId, setSelectedId] = useState('vazio')
  const [customRange, setCustomRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null)
  const [loading, setLoading] = useState(true)
  const [entradas, setEntradas] = useState<EntradaRow[]>([])
  const [saidas, setSaidas] = useState<SaidaRow[]>([])

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      const [entradasRes, saidasRes] = await Promise.all([
        supabase.from('entradas').select('valor, data_vencimento').eq('empresa_id', EMPRESA_ID).order('data_vencimento'),
        supabase.from('saidas').select('valor, data_vencimento, categorias!categoria_id(nome)').eq('empresa_id', EMPRESA_ID).order('data_vencimento'),
      ])
      setEntradas((entradasRes.data ?? []) as unknown as EntradaRow[])
      setSaidas((saidasRes.data ?? []) as unknown as SaidaRow[])
      setLoading(false)
    }
    fetchData()
  }, [])

  const drePeriodos: DREPeriodo[] = useMemo(() => {
    const mesesSet = new Set<string>()
    entradas.forEach(e => { if (e.data_vencimento) mesesSet.add(e.data_vencimento.slice(0, 7)) })
    saidas.forEach(s => { if (s.data_vencimento) mesesSet.add(s.data_vencimento.slice(0, 7)) })

    const periodosMap = new Map<string, DRELinha>()

    mesesSet.forEach(mesStr => {
      const [ano, mes] = mesStr.split('-').map(Number)
      const inicio = `${mesStr}-01`
      const fim = dayjs(`${mesStr}-01`).endOf('month').format('YYYY-MM-DD')
      const receitaBruta = entradas.filter(e => e.data_vencimento && e.data_vencimento >= inicio && e.data_vencimento <= fim).reduce((s, e) => s + Number(e.valor), 0)
      const saidasMes = saidas.filter(s => s.data_vencimento && s.data_vencimento >= inicio && s.data_vencimento <= fim)
      let despesasAdministrativas = 0, despesasMarketing = 0, outrasDespesas = 0
      saidasMes.forEach(s => {
        const cat = s.categorias?.nome ?? ''
        const tipo = categorizarSaida(cat)
        if (tipo === 'admin') despesasAdministrativas += Number(s.valor)
        else if (tipo === 'marketing') despesasMarketing += Number(s.valor)
        else outrasDespesas += Number(s.valor)
      })
      const despesasOperacionais = despesasAdministrativas + despesasMarketing + outrasDespesas
      const receitaLiquida = receitaBruta
      const lucroBruto = receitaLiquida
      const resultadoOperacional = lucroBruto - despesasOperacionais
      periodosMap.set(`${ano}-${mes}`, {
        receitaBruta, deducoesImpostos: 0, receitaLiquida, custosServicos: 0,
        lucroBruto, despesasAdministrativas, despesasMarketing, outrasDespesas,
        despesasOperacionais, resultadoOperacional, lucroLiquido: resultadoOperacional,
      })
    })

    const mensal: DREPeriodo[] = []
    periodosMap.forEach((dados, key) => {
      const [ano, mes] = key.split('-').map(Number)
      const label = dayjs(`${ano}-${String(mes).padStart(2, '0')}-01`).locale('pt-br').format('MMMM/YYYY').replace(/^\w/, c => c.toUpperCase())
      mensal.push({ id: `m-${key}`, label, tipo: 'mensal', sortKey: ano * 100 + mes, dados })
    })

    // Trimestral
    const trimMap = new Map<string, DRELinha>()
    periodosMap.forEach((dados, key) => {
      const [ano, mes] = key.split('-').map(Number)
      const tri = Math.ceil(mes / 3)
      const tKey = `${ano}-Q${tri}`
      const prev = trimMap.get(tKey) ?? { ...DADOS_VAZIOS }
      trimMap.set(tKey, {
        receitaBruta: prev.receitaBruta + dados.receitaBruta,
        deducoesImpostos: 0, receitaLiquida: prev.receitaLiquida + dados.receitaLiquida,
        custosServicos: 0, lucroBruto: prev.lucroBruto + dados.lucroBruto,
        despesasAdministrativas: prev.despesasAdministrativas + dados.despesasAdministrativas,
        despesasMarketing: prev.despesasMarketing + dados.despesasMarketing,
        outrasDespesas: prev.outrasDespesas + dados.outrasDespesas,
        despesasOperacionais: prev.despesasOperacionais + dados.despesasOperacionais,
        resultadoOperacional: prev.resultadoOperacional + dados.resultadoOperacional,
        lucroLiquido: prev.lucroLiquido + dados.lucroLiquido,
      })
    })
    const trimestral: DREPeriodo[] = []
    trimMap.forEach((dados, key) => {
      const [ano, q] = key.split('-Q')
      trimestral.push({ id: `t-${key}`, label: `${q}º Trimestre/${ano}`, tipo: 'trimestral', sortKey: Number(ano) * 10 + Number(q), dados })
    })

    // Anual
    const anoMap = new Map<number, DRELinha>()
    periodosMap.forEach((dados, key) => {
      const ano = Number(key.split('-')[0])
      const prev = anoMap.get(ano) ?? { ...DADOS_VAZIOS }
      anoMap.set(ano, {
        receitaBruta: prev.receitaBruta + dados.receitaBruta,
        deducoesImpostos: 0, receitaLiquida: prev.receitaLiquida + dados.receitaLiquida,
        custosServicos: 0, lucroBruto: prev.lucroBruto + dados.lucroBruto,
        despesasAdministrativas: prev.despesasAdministrativas + dados.despesasAdministrativas,
        despesasMarketing: prev.despesasMarketing + dados.despesasMarketing,
        outrasDespesas: prev.outrasDespesas + dados.outrasDespesas,
        despesasOperacionais: prev.despesasOperacionais + dados.despesasOperacionais,
        resultadoOperacional: prev.resultadoOperacional + dados.resultadoOperacional,
        lucroLiquido: prev.lucroLiquido + dados.lucroLiquido,
      })
    })
    const anual: DREPeriodo[] = []
    anoMap.forEach((dados, ano) => {
      anual.push({ id: `a-${ano}`, label: `Ano ${ano}`, tipo: 'anual', sortKey: ano, dados })
    })

    return [...mensal, ...trimestral, ...anual]
  }, [entradas, saidas])

  const periodsForTipo = useMemo(() =>
    drePeriodos.filter(p => p.tipo === (filterTipo === 'personalizado' ? 'mensal' : filterTipo))
      .sort((a, b) => b.sortKey - a.sortKey),
    [filterTipo, drePeriodos],
  )

  const currentPeriodo = useMemo((): DREPeriodo => {
    if (filterTipo === 'personalizado' && customRange) {
      const inicio = customRange[0].format('YYYY-MM-DD')
      const fim = customRange[1].format('YYYY-MM-DD')
      const entradasRange = entradas.filter(e => e.data_vencimento && e.data_vencimento >= inicio && e.data_vencimento <= fim)
      const saidasRange = saidas.filter(s => s.data_vencimento && s.data_vencimento >= inicio && s.data_vencimento <= fim)
      const receitaBruta = entradasRange.reduce((s, e) => s + Number(e.valor), 0)
      let despesasAdministrativas = 0, despesasMarketing = 0, outrasDespesas = 0
      saidasRange.forEach(s => {
        const cat = s.categorias?.nome ?? ''
        const tipo = categorizarSaida(cat)
        if (tipo === 'admin') despesasAdministrativas += Number(s.valor)
        else if (tipo === 'marketing') despesasMarketing += Number(s.valor)
        else outrasDespesas += Number(s.valor)
      })
      const despesasOperacionais = despesasAdministrativas + despesasMarketing + outrasDespesas
      const lucroLiquido = receitaBruta - despesasOperacionais
      return {
        id: 'custom', label: 'Período Personalizado', tipo: 'mensal', sortKey: 0,
        dados: { receitaBruta, deducoesImpostos: 0, receitaLiquida: receitaBruta, custosServicos: 0, lucroBruto: receitaBruta, despesasAdministrativas, despesasMarketing, outrasDespesas, despesasOperacionais, resultadoOperacional: lucroLiquido, lucroLiquido },
      }
    }
    if (filterTipo === 'personalizado') return PERIODO_VAZIO
    return drePeriodos.find(p => p.id === selectedId) ?? periodsForTipo[0] ?? PERIODO_VAZIO
  }, [filterTipo, selectedId, customRange, drePeriodos, periodsForTipo, entradas, saidas])

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

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0, fontWeight: 700 }}>DRE</Title>
        <Text type="secondary">Demonstração do Resultado do Exercício</Text>
      </div>

      {/* Filtros */}
      <Card style={{ marginBottom: 24, borderRadius: 12 }} styles={{ body: { padding: '14px 20px' } }}>
        <Space wrap size={16}>
          <div>
            <Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Visualização</Text>
            <Select
              value={filterTipo} onChange={handleTipoChange} style={{ width: 200 }}
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
                value={selectedId} onChange={setSelectedId} style={{ width: 240 }}
                disabled={periodsForTipo.length === 0}
                options={periodsForTipo.length > 0
                  ? periodsForTipo.map(p => ({ label: p.label, value: p.id }))
                  : [{ label: 'Sem dados cadastrados', value: 'vazio' }]}
              />
            </div>
          )}
          {filterTipo === 'personalizado' && (
            <div>
              <Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Intervalo de Datas</Text>
              <RangePicker format="MM/YYYY" picker="month" onChange={v => setCustomRange(v as [dayjs.Dayjs, dayjs.Dayjs] | null)} placeholder={['Mês inicial', 'Mês final']} />
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
        ].map(card => (
          <Col xs={24} sm={12} lg={6} key={card.label}>
            <Card style={{ borderRadius: 12, height: '100%' }} styles={{ body: { padding: '16px 20px' } }}>
              <Text type="secondary" style={{ fontSize: 12 }}>{card.label}</Text>
              <div style={{ marginTop: 4 }}>
                <Text style={{ fontSize: 20, fontWeight: 700, color: card.color }}>{formatBRL(dados[card.campo])}</Text>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={24}>
        {/* Tabela DRE */}
        <Col xs={24} xl={15}>
          <Card title={<Title level={5} style={{ margin: 0 }}>Estrutura do Resultado</Title>} style={{ borderRadius: 12 }}>
            <div style={{ overflowX: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: colunas, gap: 8, padding: '8px 12px', background: '#F9FAFB', borderRadius: 8, marginBottom: 4, minWidth: 480 }}>
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
                      <Text style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: SYN_COLORS.textSecondary }}>{row.descricao}</Text>
                      <Divider style={{ margin: '4px 0' }} />
                    </div>
                  )
                }
                const isTotal = row.tipo === 'total'
                const isSubtotal = row.tipo === 'subtotal'
                const bg = isTotal ? '#ECFDF5' : isSubtotal ? '#F9FAFB' : 'transparent'
                const fw = isTotal ? 700 : isSubtotal ? 600 : 400
                const fs = isTotal ? 15 : 14
                const valueColor = row.negativo ? SYN_COLORS.danger : isTotal ? SYN_COLORS.success : SYN_COLORS.textPrimary
                return (
                  <div key={row.key} style={{ display: 'grid', gridTemplateColumns: colunas, gap: 8, padding: '7px 12px', paddingLeft: ((row.nivel ?? 0) * 16) + 12, background: bg, borderRadius: 6, marginBottom: 2, alignItems: 'center', minWidth: 480 }}>
                    <Text style={{ fontSize: fs, fontWeight: fw }}>{row.descricao}</Text>
                    <Text style={{ fontSize: fs, fontWeight: fw, textAlign: 'right', color: valueColor }}>{row.negativo ? `(${formatBRL(val)})` : formatBRL(val)}</Text>
                    <Text style={{ fontSize: 12, textAlign: 'right', color: SYN_COLORS.textSecondary }}>{pct.toFixed(1).replace('.', ',')}%</Text>
                  </div>
                )
              })}
            </div>
          </Card>
        </Col>

        {/* Gráfico horizontal */}
        <Col xs={24} xl={9}>
          <Card title={<Title level={5} style={{ margin: 0 }}>Distribuição por Categoria</Title>} style={{ borderRadius: 12, height: '100%' }}>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={chartData.filter(d => d.valor > 0)} layout="vertical" margin={{ top: 4, right: 20, left: 12, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F3F4F6" />
                <XAxis type="number" tickFormatter={v => `R$${(Number(v) / 1000).toFixed(0)}K`} tick={{ fontSize: 11, fill: SYN_COLORS.textSecondary }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: SYN_COLORS.textPrimary }} axisLine={false} tickLine={false} width={140} />
                <ReTooltip formatter={(v) => [formatBRL(Number(v)), 'Valor']} contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB' }} />
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
