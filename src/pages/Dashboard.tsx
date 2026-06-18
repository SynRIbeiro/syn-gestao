import { Row, Col, Typography, Tag, Card, Empty } from 'antd'
import { useNavigate } from 'react-router-dom'
import {
  BankOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  DollarOutlined,
  WalletOutlined,
  CreditCardOutlined,
  RiseOutlined,
  PercentageOutlined,
  CalendarOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons'
import KpiCard from '@/components/dashboard/KpiCard'
import FinancialLineChart from '@/components/dashboard/FinancialLineChart'
import ExpensePieChart from '@/components/dashboard/ExpensePieChart'
import RevenueBarChart from '@/components/dashboard/RevenueBarChart'
import RecentTransactions from '@/components/dashboard/RecentTransactions'
import UpcomingBills from '@/components/dashboard/UpcomingBills'
import QuickActions from '@/components/dashboard/QuickActions'
import { dayjs } from '@/utils/dateHelpers'
import { SYN_COLORS } from '@/styles/theme'

const { Title, Text } = Typography

const mesMesAtual = dayjs().locale('pt-br').format('MMMM YYYY')
const mesMesAtualCapitalizado = mesMesAtual.charAt(0).toUpperCase() + mesMesAtual.slice(1)

export default function Dashboard() {
  const navigate = useNavigate()

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      {/* Cabeçalho */}
      <div
        style={{
          marginBottom: 24,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <div>
          <Title level={4} style={{ margin: 0, fontWeight: 700 }}>
            Dashboard
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Visão geral do desempenho financeiro
          </Text>
        </div>
        <Tag
          icon={<CalendarOutlined />}
          color="purple"
          style={{ borderRadius: 8, padding: '4px 10px', fontSize: 13, height: 'auto' }}
        >
          {mesMesAtualCapitalizado}
        </Tag>
      </div>

      {/* KPIs — linha 1 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <KpiCard
            label="Saldo Atual"
            value={0}
            icon={<BankOutlined />}
            iconBg={SYN_COLORS.primaryLight}
            onClick={() => navigate('/fluxo-caixa')}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <KpiCard
            label="Total de Entradas"
            value={0}
            icon={<ArrowUpOutlined />}
            iconBg={SYN_COLORS.successLight}
            onClick={() => navigate('/entradas')}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <KpiCard
            label="Total de Saídas"
            value={0}
            icon={<ArrowDownOutlined />}
            iconBg={SYN_COLORS.dangerLight}
            onClick={() => navigate('/saidas')}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <KpiCard
            label="Lucro Líquido"
            value={0}
            icon={<DollarOutlined />}
            iconBg={SYN_COLORS.successLight}
            onClick={() => navigate('/dre')}
          />
        </Col>
      </Row>

      {/* KPIs — linha 2 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <KpiCard
            label="Contas a Receber"
            value={0}
            icon={<WalletOutlined />}
            iconBg={SYN_COLORS.infoLight}
            onClick={() => navigate('/contas-receber')}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <KpiCard
            label="Contas a Pagar"
            value={0}
            icon={<CreditCardOutlined />}
            iconBg={SYN_COLORS.warningLight}
            onClick={() => navigate('/contas-pagar')}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <KpiCard
            label="Receita Recorrente (MRR)"
            value={0}
            icon={<RiseOutlined />}
            iconBg={SYN_COLORS.primaryLight}
            onClick={() => navigate('/relatorios')}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <KpiCard
            label="ROI Geral"
            value={0}
            format="percent"
            icon={<PercentageOutlined />}
            iconBg={SYN_COLORS.successLight}
            onClick={() => navigate('/roi')}
          />
        </Col>
      </Row>

      {/* Atalhos rápidos */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24}>
          <QuickActions />
        </Col>
      </Row>

      {/* Gráficos principais */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} xl={16}>
          <FinancialLineChart data={[]} />
        </Col>
        <Col xs={24} xl={8}>
          <ExpensePieChart data={[]} />
        </Col>
      </Row>

      {/* Fontes de receita + Estado vazio comparativo */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={12}>
          <RevenueBarChart data={[]} />
        </Col>
        <Col xs={24} lg={12}>
          <Card
            style={{ borderRadius: 12, border: '1px solid #E5E7EB', height: '100%' }}
            styles={{ body: { padding: '20px 24px' } }}
          >
            <div style={{ marginBottom: 16 }}>
              <Title level={5} style={{ margin: 0, fontWeight: 600 }}>
                Comparativo Mensal
              </Title>
              <Text type="secondary" style={{ fontSize: 13 }}>
                Evolução em relação ao mês anterior
              </Text>
            </div>
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Nenhuma movimentação cadastrada.
                  <br />
                  Cadastre entradas e saídas para visualizar os comparativos.
                </Text>
              }
            />
          </Card>
        </Col>
      </Row>

      {/* Últimas movimentações + Próximos vencimentos */}
      <Row gutter={[16, 16]}>
        <Col xs={24} xl={16}>
          <RecentTransactions data={[]} />
        </Col>
        <Col xs={24} xl={8}>
          <UpcomingBills data={[]} />
        </Col>
      </Row>

      {/* Banner informativo */}
      <div
        style={{
          marginTop: 24,
          padding: '12px 20px',
          background: '#EFF6FF',
          borderRadius: 10,
          border: '1px solid #BFDBFE',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <InfoCircleOutlined style={{ color: SYN_COLORS.info, fontSize: 16, flexShrink: 0 }} />
        <Text style={{ fontSize: 13, color: SYN_COLORS.info }}>
          O dashboard será preenchido automaticamente conforme você cadastrar entradas, saídas, clientes e serviços.
        </Text>
      </div>
    </div>
  )
}
