import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useSessionStore } from '@shared/stores/sessionStore'
import { LoginPage } from '@features/identity/components/Login/LoginPage'
import { ProtectedRoute } from './ProtectedRoute'
import { AppLayout } from '@app/layouts/AppLayout'
import { DashboardPage } from '@app/pages/DashboardPage'
import { ModulePlaceholder } from '@app/pages/ModulePlaceholder'
import { CommercialPage } from '@features/commercial/components/CommercialPage'
import { PeoplePage } from '@features/identity/components/PeoplePage'
import { CatalogPage } from '@features/catalog/components/CatalogPage'

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
          <Route path="/comercial" element={<CommercialPage />} />
          <Route path="/operacion" element={<ModulePlaceholder titleKey="nav.operacion" />} />
          <Route path="/cursos" element={<CatalogPage />} />
          <Route path="/certificados" element={<ModulePlaceholder titleKey="nav.certificados" />} />
          <Route path="/personas" element={<PeoplePage />} />
          <Route path="/administracion" element={<ModulePlaceholder titleKey="nav.administracion" />} />
          <Route path="/perfil" element={<ModulePlaceholder titleKey="userMenu.profile" />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
