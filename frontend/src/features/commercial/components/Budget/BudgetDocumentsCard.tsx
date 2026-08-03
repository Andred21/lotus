import { useTranslation } from 'react-i18next'
import {
  AppCard, AppCardHeader, AppDropdown, AppFileUpload, FormErrorBanner,
  type FileUploadHandlerEvent,
} from '@shared/ui'
import type { FileData } from '@shared/types/generated'
import type { BudgetFileType } from '../../api/useCommercialFiles'
import { FileList } from './FileList'

/** Card de documentos do orçamento: tipo, upload, erros e lista. Toda a
 * orquestração continua no `useBudgetDetail` — este componente só consome. */
export function BudgetDocumentsCard({
  files, fileType, onFileTypeChange, uploadPending,
  onUpload, onSizeReject, onRemove, fileError, fileSizeError,
}: {
  files: FileData[]
  fileType: BudgetFileType
  onFileTypeChange: (type: BudgetFileType) => void
  uploadPending: boolean
  onUpload: (e: FileUploadHandlerEvent) => void
  onSizeReject: (message: string) => void
  onRemove: (fileId: number) => void
  fileError: string | null
  fileSizeError: string | null
}) {
  const { t } = useTranslation()

  return (
    <AppCard>
      <AppCardHeader
        title={t('budget.documents')}
        count={files.length}
        actions={
          <>
            <div className="w-44">
              <AppDropdown
                value={fileType}
                options={[
                  { label: t('budget.fileTypeInvoice'), value: 'invoice' },
                  { label: t('budget.fileTypeReceipt'), value: 'receipt' },
                ]}
                onChange={(e) => onFileTypeChange(e.value as BudgetFileType)}
              />
            </div>
            <AppFileUpload
              chooseOptions={{ icon: 'pi pi-upload' }}
              chooseLabel={t('budget.uploadDocument')}
              disabled={uploadPending}
              onSizeReject={onSizeReject}
              uploadHandler={onUpload}
            />
          </>
        }
      />
      <div className="mx-4 mt-4 empty:m-0">
        <FormErrorBanner message={fileError} />
        {fileSizeError && <FormErrorBanner message={fileSizeError} />}
      </div>
      <FileList files={files} onRemove={onRemove} />
    </AppCard>
  )
}
