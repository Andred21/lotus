import { useTranslation } from 'react-i18next'
import { AppCard, AppEmptyState, AppTag, RecordCode } from '@shared/ui'
import { formatIsoDate } from '@shared/lib'
import type { EmissionPanelTurmaData } from '@shared/types/generated'
import { countsFor } from '../../hooks/useEmissionPanelState'

/**
 * Sem turma escolhida, um card por turma da resposta com ao menos um aluno
 * "por emitir" (spec 5.1). Clicar chama `onSelect` — o MESMO caminho do combo,
 * então a tabela aberta é a de sempre.
 *
 * A turma bloqueada também entra, com a tag do motivo: `rowCertKind` não olha o
 * bloqueio, e esconder a turma esconderia justamente a pendência que o usuário
 * precisa destravar. A ordem é a da resposta (`end_date` desc, `id` desc).
 */
export function PendingTurmaCards({
  turmas,
  onSelect,
}: {
  turmas: EmissionPanelTurmaData[]
  onSelect: (turmaId: number) => void
}) {
  const { t } = useTranslation()
  const pendentes = turmas.flatMap((turma) => {
    const counts = countsFor(turma)
    return counts.pendientes > 0 ? [{ turma, counts }] : []
  })

  if (pendentes.length === 0) {
    return (
      <AppEmptyState
        icon="pi pi-verified"
        title={t('certificate.noPendingTurmas')}
        description={t('certificate.noPendingTurmasHint')}
      />
    )
  }

  return (
    <ul role="list" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {pendentes.map(({ turma, counts }) => (
        <li key={turma.turma_id}>
          <AppCard>
            <button
              type="button"
              className="block w-full cursor-pointer rounded-surface border-0 bg-transparent p-4 text-left"
              style={{ color: 'var(--text-color)' }}
              onClick={() => onSelect(turma.turma_id)}
            >
              <span className="flex items-start justify-between gap-2">
                <RecordCode>{turma.quote_code}</RecordCode>
                {turma.emission_blocked !== null && (
                  <AppTag severity="warning" value={t(`certificate.blocked.${turma.emission_blocked}`)} />
                )}
              </span>
              <span className="mt-1 block text-sm font-medium">{turma.course_name}</span>
              <span className="block text-sm" style={{ color: 'var(--text-color-secondary)' }}>
                {turma.client_name}
              </span>
              <span className="block text-sm" style={{ color: 'var(--text-color-secondary)' }}>
                {t('certificate.concludedAt', { date: formatIsoDate(turma.end_date) })}
              </span>
              <span className="mt-2 block text-sm font-medium">
                {t('certificate.cardPending', { pending: counts.pendientes, issued: counts.emitidos })}
              </span>
            </button>
          </AppCard>
        </li>
      ))}
    </ul>
  )
}
