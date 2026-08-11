import { useTranslation } from 'react-i18next'
import { AppButton } from '@shared/ui'
import { useTurmaManualOpener } from '../../hooks/useTurmaManualOpener'

export function ManualButton({ turmaId }: { turmaId: number }) {
  const { t } = useTranslation()
  const manual = useTurmaManualOpener(turmaId)

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap gap-2">
        <AppButton
          label={t('operation.documents.manualPdf')}
          icon="pi pi-file-pdf"
          outlined
          loading={manual.pdfPending}
          onClick={manual.openPdf}
        />
        <AppButton
          label={t('operation.documents.manualDocx')}
          icon="pi pi-file-word"
          outlined
          loading={manual.docxPending}
          onClick={manual.downloadDocx}
        />
      </div>
      {(manual.popupBlocked || manual.pdfError || manual.docxError) && (
        <p className="text-sm text-red-600">
          {manual.popupBlocked
            ? t('operation.documents.popupBlocked')
            : (manual.pdfError ?? manual.docxError)}
        </p>
      )}
    </div>
  )
}
