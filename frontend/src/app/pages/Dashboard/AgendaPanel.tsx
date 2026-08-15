import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AppCard, AppCardHeader, AppEmptyState } from '@shared/ui'
import { formatDate } from '@shared/lib'
import type { AgendaData, AgendaTurmaData } from '@shared/types/generated'

/** As 4 janelas na ordem em que a operação as lê: o que está atrasado primeiro,
 * o que termina em seguida, e só então o que está em curso e o que começa. */
const JANELAS: { key: keyof AgendaData; labelKey: string }[] = [
  { key: 'overdue', labelKey: 'dashboard.agenda.overdue' },
  { key: 'ending_soon', labelKey: 'dashboard.agenda.endingSoon' },
  { key: 'in_progress', labelKey: 'dashboard.agenda.inProgress' },
  { key: 'starting_soon', labelKey: 'dashboard.agenda.startingSoon' },
]

/** Ancorado ao meio-dia: data ISO pura é lida como UTC e volta um dia num fuso
 * a oeste (mesma razão do `formatMonthYear`). */
function dia(iso: string): string {
  return formatDate(new Date(`${iso}T12:00:00`))
}

function TurmaLinha({ turma }: { turma: AgendaTurmaData }) {
  const { t } = useTranslation()

  return (
    <li className="border-b px-4 py-2 last:border-b-0" style={{ borderColor: 'var(--surface-border)' }}>
      <Link
        to={`/operacion/turmas/${turma.turma_id}`}
        className="flex items-center gap-3 no-underline"
        style={{ color: 'var(--text-color)' }}
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{turma.course_name}</span>
          {turma.client_name && (
            <span className="block truncate text-xs" style={{ color: 'var(--text-color-secondary)' }}>
              {turma.client_name}
            </span>
          )}
        </span>
        <span className="shrink-0 font-mono text-xs" style={{ color: 'var(--text-color-secondary)' }}>
          {t('dashboard.agenda.range', { start: dia(turma.start_date), end: dia(turma.end_date) })}
        </span>
      </Link>
    </li>
  )
}

export function AgendaPanel({ agenda }: { agenda: AgendaData }) {
  const { t } = useTranslation()
  const total = JANELAS.reduce((soma, janela) => soma + agenda[janela.key].length, 0)

  return (
    <AppCard>
      <AppCardHeader title={t('dashboard.agenda.title')} count={total} />
      {total === 0 ? (
        <AppEmptyState icon="pi pi-calendar" title={t('dashboard.agenda.empty')} />
      ) : (
        <div className="grid gap-0 sm:grid-cols-2">
          {JANELAS.filter((janela) => agenda[janela.key].length > 0).map((janela) => (
            <section key={janela.key}>
              <h4
                className="px-4 pt-3 pb-1 text-xs font-semibold tracking-wider uppercase"
                style={{ color: 'var(--text-color-secondary)' }}
              >
                {t(janela.labelKey)}
              </h4>
              <ul className="m-0 list-none p-0">
                {agenda[janela.key].map((turma) => (
                  <TurmaLinha key={turma.turma_id} turma={turma} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </AppCard>
  )
}
