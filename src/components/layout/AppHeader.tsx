import { Layout, Button, Avatar, Dropdown, Typography, Space, Breadcrumb } from 'antd'
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BellOutlined,
  UserOutlined,
  LogoutOutlined,
  SettingOutlined,
} from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'
import type { MenuProps } from 'antd'

const { Header } = Layout
const { Text } = Typography

const routeLabels: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/entradas': 'Entradas',
  '/saidas': 'Saídas',
  '/contas-receber': 'Contas a Receber',
  '/contas-pagar': 'Contas a Pagar',
  '/clientes': 'Clientes',
  '/servicos': 'Serviços',
  '/dre': 'DRE',
  '/roi': 'ROI',
  '/fluxo-caixa': 'Fluxo de Caixa',
  '/balanco': 'Balanço Financeiro',
  '/relatorios': 'Relatórios',
  '/configuracoes': 'Configurações',
}

const userMenuItems: MenuProps['items'] = [
  {
    key: 'profile',
    icon: <UserOutlined />,
    label: 'Meu Perfil',
  },
  {
    key: 'settings',
    icon: <SettingOutlined />,
    label: 'Configurações',
  },
  { type: 'divider' },
  {
    key: 'logout',
    icon: <LogoutOutlined />,
    label: 'Sair',
    danger: true,
  },
]

interface AppHeaderProps {
  collapsed: boolean
  onToggle: () => void
}

export default function AppHeader({ collapsed, onToggle }: AppHeaderProps) {
  const navigate = useNavigate()
  const location = useLocation()

  const currentLabel = routeLabels[location.pathname] ?? 'Syn Gestão'

  const handleUserMenu: MenuProps['onClick'] = ({ key }) => {
    if (key === 'logout') navigate('/login')
    if (key === 'settings') navigate('/configuracoes')
    if (key === 'profile') navigate('/configuracoes')
  }

  return (
    <Header
      style={{
        background: '#FFFFFF',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #E5E7EB',
        height: 64,
        position: 'sticky',
        top: 0,
        zIndex: 99,
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      <Space align="center" size={16}>
        <Button
          type="text"
          icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          onClick={onToggle}
          style={{ fontSize: 16, color: '#6B7280' }}
        />
        <Breadcrumb
          items={[
            { title: 'Syn Gestão' },
            { title: currentLabel },
          ]}
          style={{ fontSize: 13 }}
        />
      </Space>

      <Space align="center" size={8}>
        <Button
          type="text"
          icon={<BellOutlined style={{ fontSize: 18 }} />}
          style={{ color: '#6B7280' }}
        />
        <Dropdown
          menu={{ items: userMenuItems, onClick: handleUserMenu }}
          placement="bottomRight"
          trigger={['click']}
        >
          <Space
            style={{ cursor: 'pointer', padding: '4px 8px', borderRadius: 8 }}
            className="user-dropdown-trigger"
          >
            <Avatar
              size={32}
              style={{ background: '#7C3AED', fontSize: 13, fontWeight: 600 }}
            >
              SY
            </Avatar>
            <div style={{ lineHeight: 1 }}>
              <Text strong style={{ fontSize: 13, display: 'block' }}>
                Administrador
              </Text>
              <Text type="secondary" style={{ fontSize: 11 }}>
                admin@syngestao.com.br
              </Text>
            </div>
          </Space>
        </Dropdown>
      </Space>
    </Header>
  )
}
