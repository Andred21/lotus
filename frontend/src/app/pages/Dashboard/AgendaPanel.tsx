import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AppCard, AppCardHeader, AppEmptyState } from '@shared/ui'
import { formatIsoDate } from '@shared/lib'
import { dangerText, infoText, neutralInk, warningText } from '@shared/styles/tokens'
/**
 * A linha mínima que o painel sabe desenhar. `client_name` é OPCIONAL, e é o
 * único campo em que `AgendaTurmaData` e `RedatorAgendaTurmaData` divergem
 * (`generated.ts:29-35` × `:370-375`): o Redator não pode ver cliente.
 *
 * Genérico e não condicional de tela: assim o ownership é consequência do
 * TIPO — passar o payload do Redator não dá acesso a um campo que ele não tem,
 * e nenhum `if` de papel mora no render (D13).
 */
export type AgendaLinha = {
  turma_id: number
  course_name: string
  start_date: string
  end_date: string
  client_name?: string | null
}

export type AgendaJanelas<L extends AgendaLinha> = {
  starting_soon: L[]
  ending_soon: L[]
  in_progress: L[]
  overdue: L[]
}

/** As 4 janelas na ordem em que a operação as lê: o que está atrasado primeiro,
 * o que termina em seguida, e só então o que está em curso e o que começa.
 *
 * A `ink` diz a mesma coisa que a ordem, em cor: só as janelas COM item
 * aparecem, então a ordem sozinha não distingue "a primeira coluna é a mais
 * urgente" de "a primeira coluna é a única que sobrou". É a mesma gramática do
 * trilho do card de KPI — tom em marca, nunca em texto. */
const JANELAS: { key: keyof AgendaJanelas<AgendaLinha>; labelKey: string; ink: string }[] = [
  { key: 'overdue', labelKey: 'dashboard.agenda.overdue', ink: dangerText },
  { key: 'ending_soon', labelKey: 'dashboard.agenda.endingSoon', ink: warningText },
  { key: 'in_progress', labelKey: 'dashboard.agenda.inProgress', ink: infoText },
  { key: 'starting_soon', labelKey: 'dashboard.agenda.startingSoon', ink: neutralInk },
]

function TurmaLinha({ turma }: { turma: AgendaLinha }) {
  const { t } = useTranslation()

  return (
    <li className="border-b px-4 py-2 last:border-b-0" style={{ borderColor: 'var(--surface-border)' }}>
      {/* Abaixo de `sm` o intervalo desce para a linha de baixo (`basis-full` no
        * nome do curso). Na mesma linha ele era `shrink-0` e não cabia: vazava
        * 19px (es-CL) a 55px (EN) além da viewport de 390px e era cortado, sem
        * scroll horizontal que recuperasse (UI-02 da revisão de 2026-08-16). */}
      <Link
        to={`/operacion/turmas/${turma.turma_id}`}
        className="flex flex-wrap items-center gap-x-3 gap-y-0.5 no-underline sm:flex-nowrap"
        style={{ color: 'var(--text-color)' }}
      >
        <span className="min-w-0 basis-full sm:flex-1 sm:basis-0">
          <span className="block truncate text-sm font-medium" title={turma.course_name}>
            {turma.course_name}
          </span>
          {turma.client_name && (
            <span className="block truncate text-xs" title={turma.client_name} style={{ color: 'var(--text-color-secondary)' }}>
              {turma.client_name}
            </span>
          )}
        </span>
        <span className="shrink-0 font-mono text-xs" style={{ color: 'var(--text-color-secondary)' }}>
          {t('dashboard.agenda.range', {
            start: formatIsoDate(turma.start_date),
            end: formatIsoDate(turma.end_date),
          })}
        </span>
      </Link>
    </li>
  )
}

export function AgendaPanel<L extends AgendaLinha>({ agenda }: { agenda: AgendaJanelas<L> }) {
  const { t } = useTranslation()
  const total = JANELAS.reduce((soma, janela) => soma + agenda[janela.key].length, 0)
  const preenchidas = JANELAS.filter((janela) => agenda[janela.key].length > 0)

  return (
    <AppCard>
      <AppCardHeader title={t('dashboard.agenda.title')} count={total} />
      {total === 0 ? (
        <AppEmptyState icon="pi pi-calendar" title={t('dashboard.agenda.empty')} />
      ) : (
        // A contagem de colunas segue as janelas PREENCHIDAS, não as quatro
        // possíveis. Com só uma janela com turma, a grade fixa de duas colunas
        // deixava 351,5px vazios enquanto, ao lado, o nome do curso truncava
        // numa caixa de 142px contra 255px de texto — e o `title` só se recupera
        // por hover, que não existe em toque (UI-01 do review de 2026-08-17).
        <div className={`grid gap-0 ${preenchidas.length > 1 ? 'sm:grid-cols-2' : ''}`}>
          {preenchidas.map((janela) => (
            <section key={janela.key}>
              <h4
                className="flex items-center gap-2 px-4 pt-3 pb-1 text-xs font-semibold tracking-wider uppercase"
                style={{ color: 'var(--text-color-secondary)' }}
              >
                <span
                  aria-hidden="true"
                  className="size-1.5 shrink-0 rounded-full"
                  style={{ background: janela.ink }}
                />
                {t(janela.labelKey)}
                <span className="font-mono font-normal tabular-nums">{agenda[janela.key].length}</span>
              </h4>
              <ul>
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
