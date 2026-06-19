import { Routes, Route, Navigate } from 'react-router-dom'
import { Spin } from 'antd'
import AppLayout from '@/components/layout/AppLayout'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import Entradas from '@/pages/Entradas'
import Saidas from '@/pages/Saidas'
import ContasReceber from '@/pages/ContasReceber'
import ContasPagar from '@/pages/ContasPagar'
import FluxoCaixa from '@/pages/FluxoCaixa'
import Clientes from '@/pages/Clientes'
import Servicos from '@/pages/Servicos'
import DRE from '@/pages/DRE'
import ROI from '@/pages/ROI'
import Balanco from '@/pages/Balanco'
import Relatorios from '@/pages/Relatorios'
import Configuracoes from '@/pages/Configuracoes'
import { useAuth } from '@/hooks/useAuth'

function PrivateRoute() {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return <AppLayout />
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<PrivateRoute />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/entradas" element={<Entradas />} />
        <Route path="/saidas" element={<Saidas />} />
        <Route path="/contas-receber" element={<ContasReceber />} />
        <Route path="/contas-pagar" element={<ContasPagar />} />
        <Route path="/fluxo-caixa" element={<FluxoCaixa />} />
        <Route path="/clientes" element={<Clientes />} />
        <Route path="/servicos" element={<Servicos />} />
        <Route path="/dre" element={<DRE />} />
        <Route path="/roi" element={<ROI />} />
        <Route path="/balanco" element={<Balanco />} />
        <Route path="/relatorios" element={<Relatorios />} />
        <Route path="/configuracoes" element={<Configuracoes />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
