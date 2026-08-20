import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ModulePage, AppCard, ArchiveConfirmDialog } from '@shared/ui'
import { usePermissions } from '@shared/hooks'
import type { TurmaData } from '@shared/types/generated'
import { usePendingQuotesPage, useTurmasPage } from '../hooks/useTurmasPage'
import { archivableSource } from '@shared/lib'
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
  const turmas = useTurmasPage()
  const pending = usePendingQuotesPage()
  const turmasArchived = useTurmasArchived()
  const [toArchive, setToArchive] = useState<TurmaData | null>(null)
  const canCreate = can('operation.turma.create')
  // A fonte da tela é uma escolha só, não quatro — e aqui o quarto era um
  // ternário ANINHADO dentro da prop, derivando `loadError` à mão porque
  // `useTurmas()` devolvia a query crua (D-52, pior caso).
  const fonte = archivableSource(turmas, turmasArchived)

  return (
    <ModulePage title={t('module.operacion.title')} description={t('module.operacion.description')}>
      <div className="space-y-6">
        {canCreate && (
          <PendingQuotesPanel items={pending.items} error={pending.error} onRetry={pending.refetch} />
        )}
        <AppCard>
          <TurmasTable
            turmas={fonte.items}
            loading={fonte.loading}
            error={fonte.error}
            onRetry={fonte.refetch}
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
