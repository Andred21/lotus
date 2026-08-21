import { useTranslation } from 'react-i18next'
import { ArchiveSwitch, FormErrorBanner, InlineLoadState } from '@shared/ui'
import { loadMessage } from '@shared/lib'
import type { ArchiveMode } from '@shared/hooks'
import type { QuoteData } from '@shared/types/generated'
import { useQuoteFiles } from '../../hooks/useQuoteFiles'
import { useQuotesListCourses } from '../../hooks/useQuotesListCourses'
import { QuoteRow } from './QuoteRow'
import { ArchivedQuotesList, type QuoteRow as ArchivedRow } from './ArchivedQuotesList'

export function QuotesList({
  quotes, onEdit, onRemove, onApprove, onReject,
  mode, onModeChange, archived, onRestore,
}: {
  quotes: QuoteData[]
  onEdit?: (q: QuoteData) => void
  onRemove?: (q: QuoteData) => void
  onApprove?: (q: QuoteData) => void
  onReject?: (q: QuoteData) => void
  /** Arquivados da cotação é visão LOCAL desta lista, não da página (spec D5). */
  mode: ArchiveMode
  onModeChange: (mode: ArchiveMode) => void
  archived: {
    items: ArchivedRow[]
    loading: boolean
    error: { detail?: string | null } | null
    refetch: () => void | Promise<unknown>
    restoring: boolean
  }
  onRestore: (id: number) => void
}) {
  const { t } = useTranslation()
  const courses = useQuotesListCourses()
  const files = useQuoteFiles()
  const arquivados = mode === 'archived'

  // A lista VISÍVEL, não a ativa: o aviso de nome perdido vale nos dois modos, e
  // gatear por `quotes` deixava a tela de arquivados pintar `—` em silêncio
  // quando o GET de cursos falha — justamente onde o nome é o que o operador tem
  // para RECONHECER a cotação antes de restaurar (Q-2 do review de 2026-08-19).
  const visiveis = mode === 'archived' ? archived.items : quotes
  const nameLost = courses.isError && visiveis.some((q) => !courses.hasCourse(q.course_id))

  const cabecalho = (
    <div className="flex justify-end px-4 pt-4">
      <ArchiveSwitch value={mode} onChange={onModeChange} />
    </div>
  )

  /* Falha do GET de cursos NÃO esconde as cotações (D2): o que ela explica é o
   * `—` no lugar do nome. Erro de mutação de arquivo é outra categoria e vive
   * nos banners da lista ativa.
   *
   * O aviso só sai quando a falha CUSTOU algum nome: com o cache resolvendo
   * todos os ids, gatear por `isError` cru anunciava uma falha que ninguém
   * consegue ver na tela — a tese do bloco, invertida (review do BD-6, Q-1b). */
  const avisoDeNome = (
    <InlineLoadState
      error={nameLost ? loadMessage(courses, t) : null}
      retryLabel={t('common.retry')}
      onRetry={courses.refetch}
    />
  )

  if (arquivados) {
    return (
      <div>
        {cabecalho}
        <div className="m-4 empty:m-0">{avisoDeNome}</div>
        <ArchivedQuotesList
          quotes={archived.items}
          courseName={courses.courseName}
          loading={archived.loading}
          error={archived.error}
          onRetry={archived.refetch}
          onRestore={onRestore}
          restoring={archived.restoring}
        />
      </div>
    )
  }

  if (quotes.length === 0) {
    return (
      <div>
        {cabecalho}
        <p className="p-4 text-sm" style={{ color: 'var(--text-color-secondary)' }}>{t('budget.noQuotes')}</p>
      </div>
    )
  }

  return (
    <div>
      {cabecalho}
      <div className="m-4 empty:m-0">
        <FormErrorBanner message={files.fileError} />
        {files.sizeError && <FormErrorBanner message={files.sizeError} />}
        {avisoDeNome}
      </div>
      {/* Contêiner próprio: `first:border-t-0` mira o primeiro filho DESTA div,
       * não o primeiro filho do wrapper de cima (que sempre existe por causa do
       * banner de erro, mesmo vazio). */}
      <div>
        {quotes.map((q, i) => (
          <QuoteRow
            key={q.id}
            quote={q}
            striped={i % 2 === 1}
            courseName={courses.courseName(q.course_id)}
            uploading={files.isUploading(q.id!)}
            onEdit={onEdit ? () => onEdit(q) : undefined}
            onRemove={onRemove ? () => onRemove(q) : undefined}
            onApprove={onApprove ? () => onApprove(q) : undefined}
            onReject={onReject ? () => onReject(q) : undefined}
            onUpload={(e) => files.upload(q.id!, e)}
            onRemoveFile={(fileId) => files.remove(q.id!, fileId)}
            onSizeReject={files.setSizeError}
          />
        ))}
      </div>
    </div>
  )
}
