import { useTranslation } from 'react-i18next'
import { ModulePage, AppCard } from '@shared/ui'
import { usePermissions } from '@shared/hooks'
import { useTurmas, usePendingQuotes } from '../api/useTurmas'
import { PendingQuotesPanel } from './Turma/PendingQuotesPanel'
import { TurmasTable } from './Turma/TurmasTable'

export function OperationPage() {
  // `usePendingQuotes` dispara sempre; sem `operation.turma.create` o backend
  // responde 403 e o painel simplesmente não é renderizado (o `can()` é RBAC de
  // UI — a API é a fronteira). Query condicional por permissão quebraria a regra
  // de hooks; guarda-se no render.
  const { t } = useTranslation()
  const { can } = usePermissions()
  const turmas = useTurmas()
  const pending = usePendingQuotes()
  const canCreate = can('operation.turma.create')

  return (
    <ModulePage title={t('module.operacion.title')} description={t('module.operacion.description')}>
      <div className="space-y-6">
        {canCreate && (
          <PendingQuotesPanel
            items={pending.data ?? []}
            error={pending.isError ? (pending.error ?? {}) : null}
            onRetry={() => { void pending.refetch() }}
          />
        )}
        <AppCard>
          <TurmasTable
            turmas={turmas.data ?? []}
            loading={turmas.isLoading}
            error={turmas.isError ? (turmas.error ?? {}) : null}
            onRetry={() => { void turmas.refetch() }}
          />
        </AppCard>
      </div>
    </ModulePage>
  )
}
