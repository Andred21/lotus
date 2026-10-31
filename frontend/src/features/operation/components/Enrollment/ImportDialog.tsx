import { useTranslation } from 'react-i18next'
import { AppDialog, AppButton, AppFileUpload } from '@shared/ui'
import { dangerText } from '@shared/styles/tokens'
import { useImportStudentsFlow } from '../../hooks/useImportStudentsFlow'
import { ImportCounts } from './ImportCounts'
import { ImportResultSummary } from './ImportResultSummary'
import { ImportTriageTable } from './ImportTriageTable'

type Props = {
  turmaId: number
  visible: boolean
  onHide: () => void
  /** Identifica a turma no cabeçalho ("Importar planilla · 2026-118"). */
  turmaLabel?: string
  /** Empresa da turma: o destino da troca de empresa na triagem. */
  clientName?: string
}

const secondary = { color: 'var(--text-color-secondary)' }

export function ImportDialog({ turmaId, visible, onHide, turmaLabel, clientName }: Props) {
  const { t } = useTranslation()
  const f = useImportStudentsFlow(turmaId)
  const k = (key: string, opts?: Record<string, unknown>) => t(`operation.enrollment.import.${key}`, opts)
  const close = () => {
    if (f.pending) return
    f.close()
    onHide()
  }

  const hasRows = f.rows.length > 0

  const header = (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
      <span>{turmaLabel ? `${k('title')} · ${turmaLabel}` : k('title')}</span>
      {f.step !== 'result' && (
        <AppButton label={k('template')} link disabled={f.pending} onClick={f.downloadTemplate} />
      )}
    </div>
  )

  // Antes da triagem a saída é o X; o Cerrar só existe depois do resultado.
  const footer =
    f.step === 'triage' ? (
      <div className="flex flex-wrap items-center justify-end gap-2">
        {/* Planilha só com cabeçalho: não há o que confirmar nem o que explicar. */}
        {hasRows && <span className="mr-auto text-sm" style={secondary}>{k('footerHint')}</span>}
        <AppButton label={t('common.cancel')} text disabled={f.pending} onClick={close} />
        {hasRows && (
          <AppButton
            label={k('confirm', { count: f.sendableCount })}
            variant="primary"
            loading={f.pending}
            disabled={f.sendableCount === 0}
            onClick={f.confirm}
          />
        )}
      </div>
    ) : f.step === 'result' ? (
      <div className="flex justify-end gap-2">
        {(f.result?.errors.length ?? 0) > 0 && (
          <AppButton label={k('reviewRefused')} outlined onClick={f.reviewRefused} />
        )}
        <AppButton label={k('close')} text onClick={close} />
      </div>
    ) : undefined

  return (
    <AppDialog
      size="lg"
      visible={visible}
      header={header}
      onHide={close}
      closable={!f.pending}
      closeOnEscape={!f.pending}
      dismissableMask={false}
      footer={footer}
    >
      <div className="space-y-4">
        {f.step === 'upload' && (
          <>
            <p className="text-sm" style={secondary}>{k('help')}</p>
            <AppFileUpload
              accept=".xlsx,.csv"
              chooseLabel={k('choose')}
              onSizeReject={f.setSizeError}
              uploadHandler={(e) => f.upload(e.files)}
              disabled={f.pending}
            />
            {f.pending && <p className="text-sm" style={secondary}>{k('uploading')}</p>}
          </>
        )}

        {f.step === 'triage' && (
          <>
            <ImportCounts counts={f.counts} />
            <ImportTriageTable
              rows={f.rows}
              canUpdateRegistration={f.canUpdateRegistration}
              clientName={clientName}
              onEdit={f.edit}
              onRemove={f.remove}
              onSetUpdate={f.setUpdate}
            />
          </>
        )}

        {f.step === 'result' && f.result && <ImportResultSummary result={f.result} />}

        {(f.sizeError || f.message) && (
          <p className="text-sm" style={{ color: dangerText }}>
            {f.sizeError || f.message}
          </p>
        )}
      </div>
    </AppDialog>
  )
}
