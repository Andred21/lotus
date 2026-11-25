import { useTranslation } from 'react-i18next'
import { AppEmptyState, AppTag, RecordCode, cardTitleClass } from '@shared/ui'
import { infoText } from '@shared/styles/tokens'
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
          {/* O próprio botão é a superfície: card clicável com `--surface-card`,
            * borda e raio de superfície do app, hover em `--surface-hover` (por
            * classe, para vencer o fundo — estilo inline não perderia) e foco
            * visível herdado do `:focus-visible` global do tema. Antes era um
            * botão transparente dentro de um `AppCard`: duas caixas e nenhum
            * estado de hover. */}
          <button
            type="button"
            className="flex h-full w-full cursor-pointer flex-col gap-3 rounded-surface border p-4 text-left transition-colors [background:var(--surface-card)] hover:[background:var(--surface-hover)]"
            style={{ borderColor: 'var(--surface-border)', color: 'var(--text-color)' }}
            onClick={() => onSelect(turma.turma_id)}
          >
            <span className="flex items-start justify-between gap-2">
              <RecordCode>{turma.quote_code}</RecordCode>
              {turma.emission_blocked !== null && (
                <AppTag severity="warning" value={t(`certificate.blocked.${turma.emission_blocked}`)} />
              )}
            </span>
            <span className="block">
              <span className={`block ${cardTitleClass}`}>{turma.course_name}</span>
              <span className="mt-0.5 block text-sm" style={{ color: 'var(--text-color-secondary)' }}>
                {turma.client_name} · {t('certificate.concludedAt', { date: formatIsoDate(turma.end_date) })}
              </span>
            </span>
            {/* Os números são dado: `tabular-nums` para o dígito não mudar de
              * largura entre cards. O "por emitir" é o que o card existe para
              * dizer e leva a tinta de tom; o "emitidos" é contexto. */}
            <span
              className="mt-auto flex flex-wrap items-baseline gap-x-2 border-t pt-3 text-sm tabular-nums"
              style={{ borderColor: 'var(--surface-border)' }}
            >
              <span className="font-semibold" style={{ color: infoText }}>
                {t('certificate.cardToIssue', { count: counts.pendientes })}
              </span>
              <span aria-hidden="true" style={{ color: 'var(--text-color-secondary)' }}>·</span>
              <span style={{ color: 'var(--text-color-secondary)' }}>
                {t('certificate.cardIssued', { count: counts.emitidos })}
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}
