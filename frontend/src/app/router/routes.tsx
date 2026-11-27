import type { ComponentType } from 'react'
import { Outlet, type RouteObject } from 'react-router-dom'
import { NAV_MODULES } from '@shared/config/navigation'
import { ProtectedRoute } from './ProtectedRoute'
import { ModuleGuard } from './ModuleGuard'
import { LoginRoute } from './LoginRoute'
import { PageFallback, RouteError } from './RouteError'
import { lazyPage } from './chunkReload'
import { SessionBootstrap } from '@app/SessionBootstrap'
import { AppLayout } from '@app/layouts/AppLayout'
import { NotFoundPage } from '@app/pages/Errors/NotFoundPage'

/**
 * O que cada rota declara em `handle`: `titleKey` é lido por `useDocumentTitle`
 * (o match mais profundo que o declara vence). A permissão do módulo não viaja
 * aqui: `guarded()` a entrega ao `ModuleGuard` por prop, a partir do mesmo
 * `NAV_MODULES` que o `Sidebar` filtra.
 */
export type RouteHandle = { titleKey?: string }

function page(path: string, load: () => Promise<ComponentType>, handle?: RouteHandle): RouteObject {
  return { path, lazy: lazyPage(load), errorElement: <RouteError />, HydrateFallback: PageFallback, handle }
}

/**
 * Agrupa as páginas de um módulo do `NAV_MODULES` sob um guard de permissão. O
 * título e a permissão vêm do próprio módulo, então o Sidebar e a rota nunca
 * divergem; o detalhe (`/operacion/turmas/:id`) herda ambos do grupo. A rota-guard
 * é sem `path`. O guard decide o que RENDERIZA, não o que baixa: no data router o
 * `lazy` das rotas casadas resolve na navegação, antes do guard montar, então o chunk de
 * um módulo proibido é baixado mesmo assim (e descartado sem renderizar).
 */
function guarded(key: string, children: RouteObject[]): RouteObject {
  const mod = NAV_MODULES.find((m) => m.key === key)
  if (!mod) throw new Error(`Módulo desconhecido em NAV_MODULES: ${key}`)
  const handle: RouteHandle = { titleKey: mod.labelKey }
  return {
    element: (
      <ModuleGuard permission={mod.permission}>
        <Outlet />
      </ModuleGuard>
    ),
    handle,
    children,
  }
}

// Login e recuperação carregam a MESMA página: um `load` só, para o componente ser
// o mesmo tipo nas duas rotas e o react-router reconciliar em vez de remontar.
const loadLogin = () =>
  import('@features/identity/components/Login/LoginPage').then((m) => m.LoginPage)

export const routes: RouteObject[] = [
  /* Primeiro acesso: pública, sem cookie de sessão. O `flow` da query
     decide o endpoint (convite × recuperação). Fora do SessionBootstrap —
     quem define a senha ainda não tem sessão e não deve disparar
     `GET /api/me`. */
  page('/definir-clave/:token', () =>
    import('@features/identity/components/Password/SetPasswordPage').then((m) => m.SetPasswordPage),
  ),

  /* Login e recuperação são a MESMA tela, e por isso o mesmo componente:
     o react-router monta cada match sem `key`, então a troca de rota
     reconcilia em vez de remontar e o e-mail digitado sobrevive.
     As duas seguem sob o bootstrap: o redirect "já autenticado" depende
     do `GET /api/me` já ter resolvido a sessão, e agora vale para as
     duas — quem tem sessão troca a senha no perfil. */
  {
    element: (
      <SessionBootstrap>
        <LoginRoute />
      </SessionBootstrap>
    ),
    children: [page('/login', loadLogin), page('/recuperar-clave', loadLogin)],
  },

  /* Guard por módulo = o mesmo filtro de permissão do Sidebar, para quem chega por
     link direto. É conveniência de interface (RBAC visual, ADR-07): a API segue
     sendo a fronteira de acesso autoritativa. O 404 mora DENTRO do layout, sob o
     `ProtectedRoute`: rota desconhecida sem sessão vai ao login, não ao 404. */
  {
    element: (
      <SessionBootstrap>
        <ProtectedRoute>
          <AppLayout />
        </ProtectedRoute>
      </SessionBootstrap>
    ),
    children: [
      guarded('dashboard', [page('/', () => import('@app/pages/Dashboard').then((m) => m.DashboardPage))]),
      guarded('comercial', [
        page('/comercial', () =>
          import('@features/commercial/components/CommercialPage').then((m) => m.CommercialPage),
        ),
        page('/comercial/presupuestos/:id', () =>
          import('@features/commercial/components/Budget/BudgetDetailPage').then((m) => m.BudgetDetailPage),
        ),
      ]),
      guarded('operacion', [
        page('/operacion', () =>
          import('@features/operation/components/OperationPage').then((m) => m.OperationPage),
        ),
        page('/operacion/turmas/nueva/:quoteId', () =>
          import('@features/operation/components/Turma/TurmaCreatePage').then((m) => m.TurmaCreatePage),
        ),
        page('/operacion/turmas/:id', () =>
          import('@features/operation/components/Turma/TurmaDetailPage').then((m) => m.TurmaDetailPage),
        ),
      ]),
      guarded('cursos', [
        page('/cursos', () => import('@features/catalog/components/CatalogPage').then((m) => m.CatalogPage)),
      ]),
      guarded('certificados', [
        page('/certificados', () =>
          import('@features/certification/components/CertificatesPage').then((m) => m.CertificatesPage),
        ),
      ]),
      guarded('personas', [
        page('/personas', () => import('@features/identity/components/PeoplePage').then((m) => m.PeoplePage)),
      ]),
      guarded('administracion', [
        page('/administracion', () => import('@app/pages/Administracion').then((m) => m.AdministracionRoute)),
      ]),
      page(
        '/perfil',
        () => import('@features/identity/components/Profile/ProfilePage').then((m) => m.ProfilePage),
        { titleKey: 'profile.title' },
      ),
      { path: '*', element: <NotFoundPage />, handle: { titleKey: 'errors.notFoundTitle' } satisfies RouteHandle },
    ],
  },
]
