import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ModulePage, AppCard, ArchiveConfirmDialog } from '@shared/ui'
import { usePermissions, useTableUrlState } from '@shared/hooks'
import type { TurmaData } from '@shared/types/generated'
import type { TurmaDisplayStatus } from '../lib/turmaStatus'
import { useTurmasPage } from '../hooks/useTurmasPage'
import { usePendingQuotesPage } from '../hooks/usePendingQuotesPage'
import { useTurmasArchived } from '../hooks/useTurmasArchived'
import { PendingQuotesPanel } from './Turma/PendingQuotesPanel'
import { TurmasTable } from './Turma/TurmasTable'

const TURMA_STATUSES: readonly TurmaDisplayStatus[] = ['em_andamento', 'habilitada', 'concluida']

export function OperationPage() {
  // `usePendingQuotesPage` dispara sempre; sem `operation.turma.create` o backend
  // responde 403 e o painel simplesmente não é renderizado (o `can()` é RBAC de
  // UI — a API é a fronteira). Query condicional por permissão quebraria a regra
  // de hooks; guarda-se no render.
  const { t } = useTranslation()
  const { can } = usePermissions()
  const pending = usePendingQuotesPage()
  const turmasArchived = useTurmasArchived()
  // O filtro de estado sobe para a página porque é PARÂMETRO da query: vive
  // ao lado do modo, que é o outro parâmetro, e desce pronto para a tabela.
  // Mora na URL (`status`, C-3); valor que não é um estado conhecido é "todos".
  const url = useTableUrlState({ enabled: true })
  const status = TURMA_STATUSES.find((s) => s === url.read('status')) ?? null
  const setStatus = (next: TurmaDisplayStatus | null) => url.write({ status: next })
  // Uma fonte só, escolhida pelo modo dentro do hook — `archivableSource`
  // fundia duas listas inteiras; com página, a fonte É a URL.
  const turmas = useTurmasPage(turmasArchived.mode, status)
  const [toArchive, setToArchive] = useState<TurmaData | null>(null)
  const canCreate = can('operation.turma.create')

  return (
    <ModulePage title={t('module.operacion.title')} description={t('module.operacion.description')}>
      <div className="space-y-6">
        {canCreate && (
          <PendingQuotesPanel items={pending.items} error={pending.error} onRetry={pending.refetch} />
        )}
        <AppCard>
          <TurmasTable
            table={turmas}
            status={status}
            onStatusChange={setStatus}
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
        name={toArchive ? toArchive.quote_code ?? toArchive.course_name ?? '—' : ''}
        pending={turmasArchived.archiving}
        error={turmasArchived.archiveError}
        onArchive={turmasArchived.archive}
        onCancel={() => {
          turmasArchived.resetArchiveError()
          setToArchive(null)
        }}
      />
    </ModulePage>
  )
}
