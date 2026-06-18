import { BrowserRouter } from 'react-router-dom'
import { ConfigProvider, App as AntApp } from 'antd'
import ptBR from 'antd/locale/pt_BR'
import { synTheme } from '@/styles/theme'
import AppRoutes from '@/routes/AppRoutes'
import { AuthProvider } from '@/contexts/AuthContext'

export default function App() {
  return (
    <ConfigProvider theme={synTheme} locale={ptBR}>
      <AntApp>
        <AuthProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </AuthProvider>
      </AntApp>
    </ConfigProvider>
  )
}
