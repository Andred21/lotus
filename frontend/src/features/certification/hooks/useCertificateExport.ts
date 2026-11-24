import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useBlobDownload, useMutationErrors } from '@shared/hooks'
import {
  useCertificateExportDownload,
  useCertificateExportSummary,
} from '../api/certificatesApi'
import type { CertificateExportFilters, CertificateExportFormat } from '../api/certificatesApi'

/** 429 (limitador) e 503 (conversor do ZIP fora): o pedido está certo, é a hora
 * que não é — o diálogo diz "tente de novo", não "revise o pedido". */
const RETRYABLE_STATUS = new Set([429, 503])

/**
 * Estado do diálogo de exportação do Historial (spec §5.3): qual formato está
 * aberto, o resumo (N e revogados) buscado com os filtros da tabela, e o
 * download. A query e a mutation moram aqui, não nos componentes
 * (`no-restricted-syntax` sob `features/*\/components/**`).
 *
 * O botão do ZIP sem cotação é conveniência; a regra é do servidor (422 em
 * `errors.quote_id`) — por isso `open`/`confirm` também recusam, em vez de
 * confiar no `disabled` do botão.
 */
export function useCertificateExport(filters: CertificateExportFilters) {
  const { t } = useTranslation()
  const [format, setFormat] = useState<CertificateExportFormat | null>(null)
  const summaryQuery = useCertificateExportSummary(filters, format !== null)
  const download = useCertificateExportDownload()
  const save = useBlobDownload()
  const { message } = useMutationErrors([download.error, summaryQuery.error])

  const zipDisabledReason = filters.quote_id == null ? t('certificate.exportZipNeedsQuote') : null
  const blockedFor = (f: CertificateExportFormat) => f === 'zip' && zipDisabledReason !== null

  const open = (next: CertificateExportFormat) => {
    if (blockedFor(next)) return
    download.reset()
    setFormat(next)
  }

  const close = () => {
    if (download.isPending) return
    setFormat(null)
  }

  const summary = summaryQuery.data ?? null

  const confirm = () => {
    if (format === null || download.isPending || summary === null || summary.total === 0) return
    if (blockedFor(format)) return
    download.mutate(
      { format, filters },
      {
        onSuccess: ({ blob, filename }) => {
          save(blob, filename)
          setFormat(null)
        },
      },
    )
  }

  const error = download.error ?? summaryQuery.error ?? null

  return {
    format,
    open,
    close,
    summary,
    summaryLoading: summaryQuery.isFetching,
    confirm,
    pending: download.isPending,
    error,
    errorMessage: message,
    retryable: error !== null && RETRYABLE_STATUS.has(error.status),
    zipDisabledReason,
  }
}
