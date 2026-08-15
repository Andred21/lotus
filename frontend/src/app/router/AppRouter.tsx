import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useSessionStore } from '@shared/stores/sessionStore'
import { LoginPage } from '@features/identity/components/Login/LoginPage'
import { ProtectedRoute } from './ProtectedRoute'
import { SessionBootstrap } from '@app/SessionBootstrap'
import { AppLayout } from '@app/layouts/AppLayout'
import { DashboardPage } from '@app/pages/DashboardPage'
import { CommercialPage } from '@features/commercial/components/CommercialPage'
import { BudgetDetailPage } from '@features/commercial/components/Budget/BudgetDetailPage'
import { PeoplePage } from '@features/identity/components/PeoplePage'
import { AdministracionPage } from '@features/identity/components/AdministracionPage'
import { ProfilePage } from '@features/identity/components/Profile/ProfilePage'
import { CatalogPage } from '@features/catalog/components/CatalogPage'
import { OperationPage } from '@features/operation/components/OperationPage'
import { TurmaDetailPage } from '@features/operation/components/Turma/TurmaDetailPage'
import { TurmaCreatePage } from '@features/operation/components/Turma/TurmaCreatePage'
import { CertificatesPage } from '@features/certification/components/CertificatesPage'
import { ValidationPage } from '@features/certification/components/Validation/ValidationPage'

function LoginRoute() {
  const status = useSessionStore((s) => s.status)
  if (status === 'authenticated') return <Navigate to="/" replace />
  return <LoginPage />
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Validação pública por QR (spec D14/D19): sem conta, sem cookie. Fora do
            SessionBootstrap de propósito — quem escaneia o QR nunca deve disparar
            `GET /api/me`. */}
        <Route path="/validar/:uuid" element={<ValidationPage />} />

        {/* Login segue sob o bootstrap: o redirect "já autenticado" depende do
            `GET /api/me` já ter resolvido a sessão. */}
        <Route
          path="/login"
          element={
            <SessionBootstrap>
              <LoginRoute />
            </SessionBootstrap>
          }
        />

        {/* Filtro de permissão do Sidebar é só de exibição (RBAC visual); a API é a
            fronteira de acesso autoritativa. Guard de rota por módulo é follow-up
            quando páginas reais substituírem os ModulePlaceholder. */}
        <Route
          element={
            <SessionBootstrap>
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            </SessionBootstrap>
          }
        >
          <Route path="/" element={<DashboardPage />} />
          <Route path="/comercial" element={<CommercialPage />} />
          <Route path="/comercial/presupuestos/:id" element={<BudgetDetailPage />} />
          <Route path="/operacion" element={<OperationPage />} />
          <Route path="/operacion/turmas/nueva/:quoteId" element={<TurmaCreatePage />} />
          <Route path="/operacion/turmas/:id" element={<TurmaDetailPage />} />
          <Route path="/cursos" element={<CatalogPage />} />
          <Route path="/certificados" element={<CertificatesPage />} />
          <Route path="/personas" element={<PeoplePage />} />
          <Route path="/administracion" element={<AdministracionPage />} />
          <Route path="/perfil" element={<ProfilePage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
