import { Card, Typography, Row, Col } from 'antd'
import type { ComponentType } from 'react'
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  UserAddOutlined,
  CreditCardOutlined,
  WalletOutlined,
  BarChartOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { SYN_COLORS } from '@/styles/theme'

const { Title, Text } = Typography

interface QuickAction {
  label: string
  description: string
  icon: ComponentType
  path: string
  color: string
  bg: string
}

const ACTIONS: QuickAction[] = [
  {
    label: 'Nova Entrada',
    description: 'Registrar receita',
    icon: ArrowUpOutlined,
    path: '/entradas',
    color: SYN_COLORS.success,
    bg: SYN_COLORS.successLight,
  },
  {
    label: 'Nova Saída',
    description: 'Registrar despesa',
    icon: ArrowDownOutlined,
    path: '/saidas',
    color: SYN_COLORS.danger,
    bg: SYN_COLORS.dangerLight,
  },
  {
    label: 'Novo Cliente',
    description: 'Cadastrar cliente',
    icon: UserAddOutlined,
    path: '/clientes',
    color: SYN_COLORS.info,
    bg: SYN_COLORS.infoLight,
  },
  {
    label: 'Conta a Pagar',
    description: 'Nova obrigação',
    icon: CreditCardOutlined,
    path: '/contas-pagar',
    color: SYN_COLORS.warning,
    bg: SYN_COLORS.warningLight,
  },
  {
    label: 'Conta a Receber',
    description: 'Novo crédito',
    icon: WalletOutlined,
    path: '/contas-receber',
    color: SYN_COLORS.primary,
    bg: SYN_COLORS.primaryLight,
  },
  {
    label: 'Relatórios',
    description: 'Ver análises',
    icon: BarChartOutlined,
    path: '/relatorios',
    color: '#6B7280',
    bg: '#F3F4F6',
  },
]

export default function QuickActions() {
  const navigate = useNavigate()

  return (
    <Card
      style={{ borderRadius: 12, border: '1px solid #E5E7EB' }}
      styles={{ body: { padding: '20px 24px' } }}
    >
      <div style={{ marginBottom: 16 }}>
        <Title level={5} style={{ margin: 0, fontWeight: 600 }}>
          Atalhos Rápidos
        </Title>
        <Text type="secondary" style={{ fontSize: 13 }}>
          Acesso direto às principais ações do sistema
        </Text>
      </div>

      <Row gutter={[12, 12]}>
        {ACTIONS.map((action) => {
          const Icon = action.icon
          return (
            <Col key={action.path} xs={12} sm={8} lg={4}>
              <ActionCard action={action} Icon={Icon} onNavigate={navigate} />
            </Col>
          )
        })}
      </Row>
    </Card>
  )
}

interface ActionCardProps {
  action: QuickAction
  Icon: ComponentType
  onNavigate: (path: string) => void
}

function ActionCard({ action, Icon, onNavigate }: ActionCardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onNavigate(action.path)}
      onKeyDown={(e) => e.key === 'Enter' && onNavigate(action.path)}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLDivElement
        el.style.borderColor = action.color
        el.style.background = action.bg
        el.style.transform = 'translateY(-2px)'
        el.style.boxShadow = '0 6px 16px rgba(0,0,0,0.08)'
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLDivElement
        el.style.borderColor = '#E5E7EB'
        el.style.background = '#FAFAFA'
        el.style.transform = 'translateY(0)'
        el.style.boxShadow = 'none'
      }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '18px 8px 14px',
        borderRadius: 10,
        border: '1px solid #E5E7EB',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        background: '#FAFAFA',
        gap: 10,
        userSelect: 'none',
        outline: 'none',
      }}
    >
      <div
        style={{
          width: 46,
          height: 46,
          borderRadius: 12,
          background: action.bg,
          border: `1.5px solid ${action.color}22`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 20,
          color: action.color,
          flexShrink: 0,
        }}
      >
        <Icon />
      </div>
      <div style={{ textAlign: 'center' }}>
        <Text
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: '#1F2937',
            display: 'block',
            lineHeight: 1.3,
          }}
        >
          {action.label}
        </Text>
        <Text
          style={{
            fontSize: 11,
            color: '#9CA3AF',
            display: 'block',
            marginTop: 2,
            lineHeight: 1.3,
          }}
        >
          {action.description}
        </Text>
      </div>
    </div>
  )
}
