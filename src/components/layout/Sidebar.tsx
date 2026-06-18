import { useState } from 'react'
import { Layout, Menu } from 'antd'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  DashboardOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  WalletOutlined,
  CreditCardOutlined,
  TeamOutlined,
  AppstoreOutlined,
  BarChartOutlined,
  RiseOutlined,
  FundOutlined,
  AccountBookOutlined,
  FileTextOutlined,
  SettingOutlined,
} from '@ant-design/icons'
import type { MenuProps } from 'antd'

const { Sider } = Layout

const menuItems: MenuProps['items'] = [
  {
    key: '/dashboard',
    icon: <DashboardOutlined />,
    label: 'Dashboard',
  },
  {
    key: 'financeiro',
    label: 'Financeiro',
    type: 'group',
    children: [
      { key: '/entradas', icon: <ArrowUpOutlined />, label: 'Entradas' },
      { key: '/saidas', icon: <ArrowDownOutlined />, label: 'Saídas' },
      { key: '/contas-receber', icon: <WalletOutlined />, label: 'Contas a Receber' },
      { key: '/contas-pagar', icon: <CreditCardOutlined />, label: 'Contas a Pagar' },
      { key: '/fluxo-caixa', icon: <FundOutlined />, label: 'Fluxo de Caixa' },
    ],
  },
  {
    key: 'crm',
    label: 'CRM',
    type: 'group',
    children: [
      { key: '/clientes', icon: <TeamOutlined />, label: 'Clientes' },
      { key: '/servicos', icon: <AppstoreOutlined />, label: 'Serviços' },
    ],
  },
  {
    key: 'relatorios',
    label: 'Relatórios',
    type: 'group',
    children: [
      { key: '/dre', icon: <BarChartOutlined />, label: 'DRE' },
      { key: '/roi', icon: <RiseOutlined />, label: 'ROI' },
      { key: '/balanco', icon: <AccountBookOutlined />, label: 'Balanço' },
      { key: '/relatorios', icon: <FileTextOutlined />, label: 'Relatórios' },
    ],
  },
  {
    key: 'sistema',
    label: 'Sistema',
    type: 'group',
    children: [
      { key: '/configuracoes', icon: <SettingOutlined />, label: 'Configurações' },
    ],
  },
]

interface SidebarProps {
  collapsed: boolean
  onCollapse: (value: boolean) => void
}

export default function Sidebar({ collapsed, onCollapse }: SidebarProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [openKeys, setOpenKeys] = useState<string[]>([])

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    navigate(key)
  }

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      onCollapse={onCollapse}
      width={240}
      collapsedWidth={64}
      style={{
        background: '#1A1033',
        overflow: 'auto',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        zIndex: 100,
      }}
      trigger={null}
    >
      <div
        style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          padding: collapsed ? '0' : '0 20px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          transition: 'all 0.2s',
        }}
      >
        {collapsed ? (
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: '#7C3AED',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 700,
              fontSize: 16,
            }}
          >
            S
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: '#7C3AED',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 700,
                fontSize: 16,
                flexShrink: 0,
              }}
            >
              S
            </div>
            <div>
              <div style={{ color: '#FFFFFF', fontWeight: 600, fontSize: 15, lineHeight: 1.2 }}>
                Syn Gestão
              </div>
              <div style={{ color: '#A78BFA', fontSize: 11 }}>Administrativo</div>
            </div>
          </div>
        )}
      </div>

      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[location.pathname]}
        openKeys={openKeys}
        onOpenChange={setOpenKeys}
        onClick={handleMenuClick}
        items={menuItems}
        inlineCollapsed={collapsed}
        style={{
          background: '#1A1033',
          border: 'none',
          paddingTop: 8,
        }}
      />
    </Sider>
  )
}
