import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useSessionStore } from '@features/identity/stores/sessionStore'
import { LoginPage } from '@features/identity/components/LoginPage'
import { ProtectedRoute } from './ProtectedRoute'
import { AppLayout } from '@app/layouts/AppLayout'
import { DashboardPage } from '@app/pages/DashboardPage'
import { ModulePlaceholder } from '@app/pages/ModulePlaceholder'

function LoginRoute() {
  const status = useSessionStore((s) => s.status)
  if (status === 'authenticated') return <Navigate to="/" replace />
  return <LoginPage />
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginRoute />} />

        {/* Filtro de permissão do Sidebar é só de exibição (RBAC visual); a API é a
            fronteira de acesso autoritativa. Guard de rota por módulo é follow-up
            quando páginas reais substituírem os ModulePlaceholder. */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<DashboardPage />} />
          <Route path="/comercial" element={<ModulePlaceholder title="Comercial" />} />
          <Route path="/operacion" element={<ModulePlaceholder title="Operación" />} />
          <Route path="/cursos" element={<ModulePlaceholder title="Cursos" />} />
          <Route path="/certificados" element={<ModulePlaceholder title="Certificados" />} />
          <Route path="/personas" element={<ModulePlaceholder title="Personas" />} />
          <Route path="/administracion" element={<ModulePlaceholder title="Administración" />} />
          <Route path="/perfil" element={<ModulePlaceholder title="Mi perfil" />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
