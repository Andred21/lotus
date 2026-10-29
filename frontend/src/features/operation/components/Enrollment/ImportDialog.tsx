import { useTranslation } from 'react-i18next'
import { AppDialog, AppButton, AppFileUpload } from '@shared/ui'
import { useImportStudentsFlow } from '../../hooks/useImportStudentsFlow'
import { ImportResultSummary } from './ImportResultSummary'
import { dangerText } from '@shared/styles/tokens'

type Props = {
  turmaId: number
  visible: boolean
  onHide: () => void
}

export function ImportDialog({ turmaId, visible, onHide }: Props) {
  const { t } = useTranslation()
  const f = useImportStudentsFlow(turmaId, onHide)

  // O Cerrar só existe depois do resultado, como antes; antes dele, a saída é o X.
  const footer = f.result ? (
    <div className="flex justify-end">
      <AppButton label={t('operation.enrollment.import.close')} text onClick={f.close} />
    </div>
  ) : undefined

  return (
    <AppDialog
      size="sm"
      visible={visible}
      header={t('operation.enrollment.import.title')}
      onHide={f.close}
      closable={!f.pending}
      closeOnEscape={!f.pending}
      dismissableMask={false}
      footer={footer}
    >
      <div className="space-y-4">
        {!f.result && (
          <>
            <p className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>{t('operation.enrollment.import.help')}</p>
            <AppFileUpload
              accept=".xlsx,.csv"
              chooseLabel={t('operation.enrollment.import.choose')}
              onSizeReject={f.setSizeError}
              uploadHandler={f.upload}
              disabled={f.pending}
            />
            {f.pending && (
              <p className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>{t('operation.enrollment.import.uploading')}</p>
            )}
          </>
        )}

        {f.result && <ImportResultSummary result={f.result} />}

        {(f.sizeError || f.message) && (
          <p className="text-sm" style={{ color: dangerText }}>
            {f.sizeError || f.message}
          </p>
        )}
      </div>
    </AppDialog>
  )
}
