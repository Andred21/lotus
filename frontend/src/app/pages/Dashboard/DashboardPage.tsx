import { useTranslation } from 'react-i18next'
import { PageHeader, AppErrorState, AppEmptyState, InlineLoadState } from '@shared/ui'
import { useSessionStore } from '@shared/stores/sessionStore'
import { useDashboard } from './useDashboard'
import { DashboardSkeleton } from './DashboardSkeleton'
import { AdminView } from './admin/AdminView'

/**
 * Roteador de `kind` do Dashboard, e só isso (D3/D4). A query e a política de
 * estado moram em `useDashboard`; cada view compõe a própria pasta.
 */
export function DashboardPage() {
  const { t } = useTranslation()
  const user = useSessionStore((s) => s.user)
  const state = useDashboard()

  const header = (
    <PageHeader title={t('dashboard.welcome', { name: user?.name })} description={t('dashboard.subtitle')} />
  )

  if (state.kind === 'loading') {
    return (
      <div>
        {header}
        <DashboardSkeleton />
      </div>
    )
  }

  // Falhou E não há nada em mão, de nenhuma janela: é o único caso em que o
  // erro SUBSTITUI a tela.
  if (state.kind === 'error') {
    return (
      <div>
        {header}
        <AppErrorState
          title={t('common.loadError')}
          detail={state.error.detail ?? t('common.loadErrorHint')}
          retryLabel={t('common.retry')}
          onRetry={state.retry}
        />
      </div>
    )
  }

  // O caso-limite do §4 do B1: esconder cada seção nula, uma a uma, deixaria a
  // página em branco para quem não tem módulo nenhum — indistinguível de falha
  // silenciosa. A tela diz o que está acontecendo em vez de não dizer nada.
  // Só o admin tem este ramo: as 6 chaves do Redator são não-anuláveis.
  if (state.kind === 'unauthorized') {
    return (
      <div>
        {header}
        <AppEmptyState
          icon="pi pi-lock"
          title={t('dashboard.noAccess.title')}
          description={t('dashboard.noAccess.description')}
        />
      </div>
    )
  }

  // A view do Redator chega na Task 10.
  if (state.kind === 'ready-redator') return <div>{header}</div>

  return (
    <div>
      {header}
      {/* Falha COM dado em mão: aviso ao lado, a tela permanece utilizável (BD-6). */}
      <InlineLoadState error={state.staleError} retryLabel={t('common.retry')} onRetry={state.retry} />
      <AdminView data={state.data} />
    </div>
  )
}
