import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AppCard, AppCardHeader, AppEmptyState, AppButton } from '@shared/ui'
import { formatDate } from '@shared/lib'
import { warningText } from '@shared/styles/tokens'
import type { RedatorTurmaPendenciaData } from '@shared/types/generated'

const dia = (iso: string) => formatDate(new Date(`${iso}T12:00:00`))

/**
 * Turmas do próprio Redator com documento faltando. Sem cliente, sem UF, sem
 * turma alheia — o payload `view=redator` já chega filtrado da API, e esta tela
 * não tem como pedir mais do que ele traz.
 *
 * A ação leva ao Meu Perfil e não a um formulário local: o Redator anexa
 * documento POR LÁ, e este bloco é read-only. Botão fora do `<li>` para o
 * ponteiro não competir com nada dentro da linha.
 */
export function PendenciasList({ items }: { items: RedatorTurmaPendenciaData[] }) {
  const { t } = useTranslation()

  return (
    <AppCard>
      <AppCardHeader
        title={t('dashboard.redator.pendencias.title')}
        count={items.length}
        actions={
          items.length > 0 ? (
            // `/perfil` — o path que o `AppRouter` registra. Não é `/mi-perfil`.
            <Link to="/perfil" className="no-underline">
              <AppButton label={t('dashboard.redator.pendencias.goToProfile')} text />
            </Link>
          ) : undefined
        }
      />
      {items.length === 0 ? (
        <AppEmptyState
          icon="pi pi-check-circle"
          title={t('dashboard.redator.pendencias.empty')}
          description={t('dashboard.redator.pendencias.emptyHint')}
        />
      ) : (
        <ul className="m-0 list-none p-0">
          {items.map((item) => (
            <li
              key={item.turma_id}
              className="border-b px-4 py-2 last:border-b-0"
              style={{ borderColor: 'var(--surface-border)' }}
            >
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                <span className="min-w-0 basis-full sm:flex-1 sm:basis-0">
                  <span className="block truncate text-sm font-medium" title={item.course_name}>
                    {item.course_name}
                  </span>
                  <span className="block truncate text-xs" style={{ color: warningText }}>
                    {t('dashboard.redator.pendencias.missing', { types: item.missing_types.join(', ') })}
                  </span>
                </span>
                <span className="shrink-0 font-mono text-xs" style={{ color: 'var(--text-color-secondary)' }}>
                  {t('dashboard.redator.pendencias.until', { date: dia(item.end_date) })}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </AppCard>
  )
}
