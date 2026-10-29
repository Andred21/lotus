import { useTranslation } from 'react-i18next'
import { AppButton, AppCard, AppCardHeader, FormErrorBanner } from '@shared/ui'
import type { FileData } from '@shared/types/generated'
import { useBudgetDocumentUpload } from '../../hooks/useBudgetDocumentUpload'
import { BudgetDocumentUploadDialog } from './BudgetDocumentUploadDialog'
import { FileList } from './FileList'

/** Card de documentos do orçamento: o botão de subir, o erro de remoção e a
 * lista com a tag do tipo. Subir é um diálogo (bloco 43), cujo estado mora no
 * `useBudgetDocumentUpload`; este componente só consome. */
export function BudgetDocumentsCard({
  budgetId, files, onRemove, fileError,
}: {
  budgetId: number
  files: FileData[]
  onRemove: (fileId: number) => void
  /** Erro de REMOÇÃO de anexo; o do upload aparece dentro do diálogo. */
  fileError: string | null
}) {
  const { t } = useTranslation()
  const upload = useBudgetDocumentUpload(budgetId)

  return (
    <AppCard>
      <AppCardHeader
        title={t('budget.documents')}
        count={files.length}
        actions={
          <AppButton variant="compact" icon="pi pi-upload" label={t('budget.uploadDocument')} onClick={upload.open} />
        }
      />
      <div className="mx-4 mt-4 empty:m-0">
        <FormErrorBanner message={fileError} />
      </div>
      <FileList files={files} onRemove={onRemove} showType />
      <BudgetDocumentUploadDialog u={upload} />
    </AppCard>
  )
}
