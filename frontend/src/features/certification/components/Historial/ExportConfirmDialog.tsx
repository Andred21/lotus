import { useTranslation } from 'react-i18next'
import { ConfirmDialog } from '@shared/ui'
import type { useCertificateExport } from '../../hooks/useCertificateExport'

type Props = {
  /** O estado do hook, com um formato aberto. */
  exportState: ReturnType<typeof useCertificateExport>
  /** Algum filtro (busca, estado ou cotação) está ativo: troca "todos" por "según los filtros". */
  filtered: boolean
}

/** A confirmação da exportação (spec §5.3): o N do aviso vem do servidor, da
 * mesma query que exporta. N = 0 desabilita o confirmar e diz por quê. O ZIP
 * renderiza um PDF por certificado (~7 s para 15, até ~1 min no teto), então o
 * estado de espera é texto, e Cancelar/X/ESC ficam travados com a requisição em
 * voo (o `pending` do `ConfirmDialog`). */
export function ExportConfirmDialog({ exportState: e, filtered }: Props) {
  const { t } = useTranslation()
  const isZip = e.format === 'zip'
  const total = e.summary?.total ?? null
  const revocados = e.summary?.revocados ?? 0
  const empty = total === 0

  const message =
    total === null
      ? t('certificate.exportCounting')
      : t(filtered ? 'certificate.exportScopeFiltered' : 'certificate.exportScopeAll', { count: total })

  return (
    <ConfirmDialog
      visible
      title={t(isZip ? 'certificate.exportZipTitle' : 'certificate.exportPlanillaTitle')}
      message={message}
      confirmLabel={t('certificate.exportConfirm')}
      confirmIcon="pi pi-download"
      confirmDisabled={total === null || empty || e.summaryLoading}
      pending={e.pending}
      error={e.errorMessage}
      onConfirm={e.confirm}
      onCancel={e.close}
    >
      <div className="mt-3 space-y-2 text-sm" aria-live="polite">
        {revocados > 0 && (
          <p style={{ color: 'var(--text-color-secondary)' }}>{t('certificate.exportRevoked', { count: revocados })}</p>
        )}
        {empty && <p className="font-medium">{t('certificate.exportEmpty')}</p>}
        {e.retryable && <p className="font-medium">{t('certificate.exportRetryHint')}</p>}
        {e.pending && (
          <p className="font-medium">{t(isZip ? 'certificate.exportZipWorking' : 'certificate.exportPlanillaWorking')}</p>
        )}
      </div>
    </ConfirmDialog>
  )
}
