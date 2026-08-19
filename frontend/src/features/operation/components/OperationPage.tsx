import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ModulePage, AppCard, ArchiveConfirmDialog } from '@shared/ui'
import { usePermissions } from '@shared/hooks'
import type { TurmaData } from '@shared/types/generated'
import { useTurmas, usePendingQuotes } from '../api/useTurmas'
import { useTurmasArchived } from '../hooks/useTurmasArchived'
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
  const turmasArchived = useTurmasArchived()
  const [toArchive, setToArchive] = useState<TurmaData | null>(null)
  const canCreate = can('operation.turma.create')
  const archived = turmasArchived.mode === 'archived'

  return (
    <ModulePage title={t('module.operacion.title')} description={t('module.operacion.description')}>
      <div className="space-y-6">
        {canCreate && (
          <PendingQuotesPanel
            items={pending.data ?? []}
            error={pending.isError ? (pending.error ?? {}) : null}
            onRetry={pending.refetch}
          />
        )}
        <AppCard>
          <TurmasTable
            turmas={archived ? turmasArchived.items : (turmas.data ?? [])}
            loading={archived ? turmasArchived.loading : turmas.isLoading}
            error={archived ? turmasArchived.error : turmas.isError ? (turmas.error ?? {}) : null}
            onRetry={archived ? turmasArchived.refetch : turmas.refetch}
            mode={turmasArchived.mode}
            onModeChange={turmasArchived.setMode}
            onArchive={setToArchive}
            onRestore={(turma) => turma.id != null && turmasArchived.restore(turma.id)}
            busy={turmasArchived.restoring || turmasArchived.archiving}
          />
        </AppCard>
      </div>

      {/* Restaurar NÃO pede confirmação: não é destrutivo (molde D9). */}
      <ArchiveConfirmDialog
        target={toArchive}
        pending={turmasArchived.archiving}
        onArchive={turmasArchived.archive}
        onCancel={() => setToArchive(null)}
      />
    </ModulePage>
  )
}
