import { Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from '@/components/layout/AppLayout'
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

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
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

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
