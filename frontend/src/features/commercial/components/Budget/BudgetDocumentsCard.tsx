import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AppCard, AppCardHeader, AppFilePreviewDialog, AppFileSlot, AppTag, FormErrorBanner,
  SectionLabel, type FileUploadHandlerEvent,
} from '@shared/ui'
import { useFilePreview, useMutationErrors } from '@shared/hooks'
import type { BudgetDocumentType, FileData } from '@shared/types/generated'
import { useUploadBudgetFile } from '../../api/useCommercialFiles'
import { BUDGET_DOCUMENT_TYPES, budgetDocumentTag } from '../../lib/budgetDocumentType'
import { latestFile } from '../../lib/latestFile'
import { FileList } from './FileList'

/** Card de documentos do orçamento (bloco 47): um slot fixo por tipo, na ordem
 * do ciclo, cada um com o arquivo mais recente do tipo. Enviar de novo
 * substitui (o backend guarda um por tipo). Arquivo de tipo fora do enum, dado
 * antigo, fica numa lista abaixo dos slots. */
export function BudgetDocumentsCard({
  budgetId, files, onRemove, fileError,
}: {
  budgetId: number
  files: FileData[]
  onRemove: (fileId: number) => void
  /** Erro de REMOÇÃO de anexo; o de envio e o de tamanho o cartão junta a ele. */
  fileError: string | null
}) {
  const { t } = useTranslation()
  const upload = useUploadBudgetFile()
  const preview = useFilePreview<FileData>()
  // Rejeição por tamanho é local: o AppFileUpload barra o arquivo antes de
  // qualquer request, então não vira erro de mutação.
  const [sizeError, setSizeError] = useState<string | null>(null)
  // `message` sai tipado `string`, mas é `null` sem erro (o `?? null` final some
  // no tipo); alargar aqui é o tipo dizer a verdade.
  const uploadError = useMutationErrors([upload.error]).message as string | null

  const send = (type: BudgetDocumentType, e: FileUploadHandlerEvent) => {
    setSizeError(null)
    const file = e.files[0]
    if (!file) return
    // Limpa ANTES da mutação, como os demais slots: no modo básico o Prime só
    // renderiza o `<input>` com o estado de arquivos vazio, e limpar só no
    // sucesso deixava o slot sem seletor depois de um 422.
    e.options.clear()
    upload.mutate({ budgetId, type, file })
  }

  // O erro de envio anterior é do arquivo anterior: não fica à frente do tamanho.
  const rejectSize = (message: string) => {
    upload.reset()
    setSizeError(message)
  }

  const others = files.filter((f) => budgetDocumentTag(f.type) === null)

  return (
    <AppCard>
      <AppCardHeader title={t('budget.documents')} count={files.length} />
      <div className="mx-4 mt-4 empty:m-0">
        <FormErrorBanner message={fileError ?? uploadError ?? sizeError} />
      </div>
      <div className="space-y-3 p-4">
        {BUDGET_DOCUMENT_TYPES.map((type) => {
          const tag = budgetDocumentTag(type)
          const label = t(`budget.documentType.${type}`)
          const current = latestFile(files.filter((f) => f.type === type))
          return (
            <AppFileSlot
              key={type}
              title={
                <AppTag
                  value={label}
                  severity={tag?.severity}
                  tone={tag?.tone}
                  icon={tag?.icon}
                  className="text-sm px-3 py-1"
                />
              }
              file={current}
              onPreview={preview.open}
              onUpload={(e) => send(type, e)}
              uploadLabel={t('common.uploadNamed', { tipo: label })}
              replaceLabel={t('common.replaceNamed', { tipo: label })}
              removeLabel={t('common.deleteNamed', { tipo: label })}
              uploading={upload.isPending && upload.variables?.type === type}
              onSizeReject={rejectSize}
              onRemove={current ? () => onRemove(current.id) : undefined}
            />
          )
        })}
      </div>
      {others.length > 0 && (
        <div className="pb-2">
          <SectionLabel as="h3" rule={false} className="px-4">{t('budget.otherDocuments')}</SectionLabel>
          <FileList files={others} onRemove={onRemove} showType />
        </div>
      )}
      <AppFilePreviewDialog file={preview.file} visible={preview.visible} onHide={preview.close} />
    </AppCard>
  )
}
