import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { AppButton } from '@shared/ui'
import type { CertificateExportFilters } from '../../api/certificatesApi'
import { useCertificateExport } from '../../hooks/useCertificateExport'
import { ExportConfirmDialog } from './ExportConfirmDialog'

/** Planilla e ZIP no cabeçalho do Historial (spec §5.3). Exportam o conjunto da
 * listagem — mesmos `q`, estado e cotação —, não a página que está na tela.
 * O ZIP sem cotação fica desabilitado e diz por quê; a regra é do servidor
 * (422), o botão é conveniência. A razão aparece em TEXTO ao lado do botão e o
 * liga por `aria-describedby`: dica só de mouse não chega ao toque nem ao
 * teclado. O `title` no `span` fica como reforço — o apagado não recebe hover
 * (`pointer-events: none`), e o `span` é onde a dica pega. */
export function HistorialExportActions({ filters }: { filters: CertificateExportFilters }) {
  const { t } = useTranslation()
  const reasonId = useId()
  const exportState = useCertificateExport(filters)
  const zipReason = exportState.zipDisabledReason
  const filtered = Boolean(filters.q) || Boolean(filters.display_status) || filters.quote_id != null

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <AppButton
          outlined
          icon="fileSheet"
          label={t('certificate.exportPlanilla')}
          onClick={() => exportState.open('planilha')}
        />
        <span className="inline-flex" title={zipReason ?? undefined}>
          <AppButton
            outlined
            icon="package"
            label={t('certificate.exportZip')}
            disabled={zipReason !== null}
            aria-describedby={zipReason ? reasonId : undefined}
            onClick={() => exportState.open('zip')}
          />
        </span>
        {zipReason && (
          <span id={reasonId} className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>
            {zipReason}
          </span>
        )}
      </div>

      {exportState.format !== null && <ExportConfirmDialog exportState={exportState} filtered={filtered} />}
    </>
  )
}
