import { useTranslation } from 'react-i18next'
import { usePermissions } from '@shared/hooks'
import { AppButton, InlineLoadState } from '@shared/ui'
import { formatDate, formatUf, type ArchivableRow } from '@shared/lib'
import type { QuoteData } from '@shared/types/generated'

/** A mesma forma achatada pelo `useArchivedPage`. O par de campos do rastreio vive
 * em `ArchivableRow` — estava declarado à mão em 8 arquivos (D-53). */
export type QuoteRow = ArchivableRow<QuoteData>

/**
 * Cotações arquivadas do orçamento. Componente próprio, e não um modo do
 * `QuoteRow`: a linha ativa carrega aprovar/rejeitar/editar/excluir e um input de
 * upload por linha, nada disso aplicável a um registro fora da lista. Ramificar o
 * `QuoteRow` por modo deixaria sete `onX` opcionais mortos na metade dos casos.
 *
 * A linha mostra o que o operador precisa para RECONHECER a cotação antes de
 * restaurá-la (Q-8): código, curso, valor e o rastreio de quem arquivou quando.
 */
export function ArchivedQuotesList({
  quotes,
  courseName,
  loading,
  error,
  onRetry,
  onRestore,
  restoring,
}: {
  quotes: QuoteRow[]
  courseName: (id: number) => string
  loading: boolean
  error?: { detail?: string | null } | null
  onRetry: () => void | Promise<unknown>
  onRestore: (id: number) => void
  /** Restore em voo — trava os botões (Q-2). */
  restoring: boolean
}) {
  const { t } = useTranslation()
  const { can } = usePermissions()

  if (loading || error) {
    return (
      <div className="m-4">
        <InlineLoadState
          error={error ? (error.detail ?? t('common.loadErrorHint')) : null}
          retryLabel={t('common.retry')}
          onRetry={onRetry}
        />
        {loading && !error && (
          <p className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>{t('common.loading')}</p>
        )}
      </div>
    )
  }

  if (quotes.length === 0) {
    return (
      <p className="p-4 text-sm" style={{ color: 'var(--text-color-secondary)' }}>{t('archive.empty')}</p>
    )
  }

  return (
    <div>
      {quotes.map((q, i) => (
        <div
          key={q.id}
          className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t p-4 first:border-t-0"
          style={{
            borderColor: 'var(--surface-border)',
            background: i % 2 === 1 ? 'var(--surface-section)' : 'transparent',
          }}
        >
          <div className="min-w-64 flex-1">
            <span className="font-medium">{courseName(q.course_id)}</span>
            <p className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>{q.code}</p>
          </div>
          <span className="font-semibold">{formatUf(q.value_uf ?? '0')} UF</span>
          <span className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>
            {/* `toLocaleDateString()` sem locale cai no idioma do NAVEGADOR, não no
                da interface (D-51/D-18). Layout flex, não tabela: é o único dos 8
                sítios que não some dentro do `archivedColumns`. */}
            {t('archive.archivedAt')}: {q.archived_at ? formatDate(new Date(q.archived_at)) : '—'}
          </span>
          <span className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>
            {t('archive.archivedBy')}: {q.archived_by ?? t('archive.unknownAuthor')}
          </span>
          {can('commercial.quote.restore') && (
            <AppButton
              label={t('archive.restoreAction')}
              icon="pi pi-undo"
              text
              size="small"
              disabled={restoring}
              onClick={() => q.id != null && onRestore(q.id)}
            />
          )}
        </div>
      ))}
    </div>
  )
}
