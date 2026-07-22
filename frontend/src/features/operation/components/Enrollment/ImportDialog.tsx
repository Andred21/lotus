import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppDialog, AppButton, AppFileUpload } from '@shared/ui'
import type { FileUploadHandlerEvent } from '@shared/ui'
import type { ImportResultData } from '@shared/types/generated'
import { useMutationErrors } from '@shared/hooks'
import { useImportStudents } from '../../api/useImportStudents'
import { ImportResultSummary } from './ImportResultSummary'

type Props = {
  turmaId: number
  visible: boolean
  onHide: () => void
}

export function ImportDialog({ turmaId, visible, onHide }: Props) {
  const { t } = useTranslation()
  const importMutation = useImportStudents()
  const { message } = useMutationErrors([importMutation.error])
  const [result, setResult] = useState<ImportResultData | null>(null)

  const upload = (e: FileUploadHandlerEvent) => {
    const file = e.files[0]
    if (!file) return
    importMutation.mutate({ turmaId, file }, { onSuccess: (r) => setResult(r) })
  }

  const close = () => {
    if (importMutation.isPending) return
    setResult(null)
    importMutation.reset()
    onHide()
  }

  return (
    <AppDialog
      visible={visible}
      header={t('operation.enrollment.import.title')}
      onHide={close}
      closable={!importMutation.isPending}
      closeOnEscape={!importMutation.isPending}
      dismissableMask={false}
    >
      <div className="space-y-4">
        {!result && (
          <>
            <p className="text-sm text-slate-500">{t('operation.enrollment.import.help')}</p>
            <AppFileUpload
              accept=".xlsx,.csv"
              chooseLabel={t('operation.enrollment.import.choose')}
              uploadHandler={upload}
              disabled={importMutation.isPending}
            />
            {importMutation.isPending && (
              <p className="text-sm text-slate-500">{t('operation.enrollment.import.uploading')}</p>
            )}
          </>
        )}

        {result && (
          <>
            <ImportResultSummary result={result} />
            <div className="flex justify-end">
              <AppButton label={t('operation.enrollment.import.close')} onClick={close} />
            </div>
          </>
        )}

        {message && <p className="text-sm text-red-600">{message}</p>}
      </div>
    </AppDialog>
  )
}
