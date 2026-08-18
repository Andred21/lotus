import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { AppButton, AppCard, AppCardHeader, AppErrorState } from '@shared/ui'
import type { PendingQuoteData } from '@shared/types/generated'
import { screenDetail } from '@shared/lib'

export function PendingQuotesPanel({
  items, error, onRetry,
}: {
  items: PendingQuoteData[]
  error?: { detail?: string | null } | null
  /** Repassa o refetch da página: é a promise que mantém o Reintentar do
   * AppErrorState em `loading` (Q-14). Tipar `() => void` aqui compilaria e
   * faria a camada do meio mentir sobre o contrato. */
  onRetry?: () => void | Promise<unknown>
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  // O erro vem antes do vazio: sem essa guarda, um GET falho caía no `null` de
  // lista vazia e a fila de cotizações pendentes simplesmente sumia da tela —
  // o operador leria "não há nada para configurar" sobre uma falha de rede.
  if (error)
    return (
      <AppCard tone="info">
        <AppErrorState
          title={t('common.loadError')}
          detail={screenDetail(error) ?? t('common.loadErrorHint')}
          retryLabel={onRetry ? t('common.retry') : undefined}
          onRetry={onRetry}
        />
      </AppCard>
    )

  if (items.length === 0) return null

  return (
    <AppCard tone="info">
      <AppCardHeader title={t('operation.pending.title')} count={items.length} />
      <ul>
        {items.map((q) => (
          <li
            key={q.quote_id}
            className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 last:border-b-0"
            style={{ borderColor: 'var(--surface-border)' }}
          >
            <span className="text-sm" style={{ color: 'var(--text-color)' }}>
              <i className="pi pi-file mr-2" style={{ color: 'var(--text-color-secondary)' }} aria-hidden="true" />
              <strong>{q.client_name}</strong> · {q.course_name} ·{' '}
              <span style={{ color: 'var(--text-color-secondary)' }}>
                {t('operation.pending.students', { count: q.student_count })}
              </span>
            </span>
            <AppButton
              variant="brandIcon"
              label={t('operation.pending.configure')}
              icon="pi pi-cog"
              onClick={() => navigate(`/operacion/turmas/nueva/${q.quote_id}`)}
            />
          </li>
        ))}
      </ul>
    </AppCard>
  )
}
