import { useState } from 'react'
import { Layout } from 'antd'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import AppHeader from './AppHeader'

const { Content } = Layout

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false)

  const siderWidth = collapsed ? 64 : 240

  return (
    <Layout style={{ minHeight: '100vh', background: '#F3F4F6' }}>
      <Sidebar collapsed={collapsed} onCollapse={setCollapsed} />

      <Layout
        style={{
          marginLeft: siderWidth,
          transition: 'margin-left 0.2s',
          minHeight: '100vh',
          background: '#F3F4F6',
        }}
      >
        <AppHeader collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />

        <Content
          style={{
            padding: 24,
            minHeight: 'calc(100vh - 64px)',
            background: '#F3F4F6',
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
