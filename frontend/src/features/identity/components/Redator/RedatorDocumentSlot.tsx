import { useTranslation } from 'react-i18next'
import { AppButton, AppTag, AppFileUpload, AppFileRow, AppFileActions } from '@shared/ui'
import type { FileUploadHandlerEvent } from '@shared/ui'
import type { RedatorDocumentData } from '@shared/types/generated'
import type { DialogMode, DocType } from '@shared/lib'
import { docStatus, DOC_STATUS_SEVERITY } from '@shared/lib'

const UPLOAD_CHOOSE_OPTIONS = {
  icon: 'pi pi-upload',
  className: 'p-button-text p-button-rounded',
}

/**
 * Um tipo de documento do redator, nos três modos do diálogo.
 *
 * - `create`: o arquivo fica em stage no estado local até o submit (não há id de
 *   redator ainda para o endpoint aninhado). Arquivo em stage é um `File` do
 *   browser, sem `download_url` — não há o que pré-visualizar nem baixar, então
 *   a linha traz só a remoção do stage (por isso não usa `AppFileActions`).
 * - `view`: documento é imutável; só ver e baixar.
 * - `edit`: ver, baixar, substituir (upload imediato pelo endpoint aninhado) e excluir.
 *
 * `preview` e `sizeError` NÃO moram aqui (D6): são únicos para os quatro tipos e
 * vivem no diálogo — descê-los montaria quatro diálogos de preview e moveria a
 * mensagem de erro para dentro do slot.
 */
export function RedatorDocumentSlot({
  type,
  mode,
  doc,
  staged,
  canRemove,
  uploading,
  onStage,
  onUnstage,
  onUpload,
  onRemoveDoc,
  onPreview,
  onSizeReject,
}: {
  type: DocType
  mode: DialogMode
  doc: RedatorDocumentData | undefined
  staged: File | undefined
  /** Só há exclusão quando o redator já existe. */
  canRemove: boolean
  uploading: boolean
  onStage: (type: DocType, e: FileUploadHandlerEvent) => void
  onUnstage: (type: DocType) => void
  onUpload: (type: DocType, e: FileUploadHandlerEvent) => void
  onRemoveDoc: (docId: number) => void
  onPreview: (doc: RedatorDocumentData) => void
  onSizeReject: (message: string) => void
}) {
  const { t } = useTranslation()
  const status = doc ? docStatus(doc.valid_until) : null

  // D7: a borda vem da variável do tema, não de par Tailwind hardcoded
  // (`border-slate-200 dark:border-slate-700`), que era o débito do D18.
  return (
    <div className="rounded border p-2" style={{ borderColor: 'var(--surface-border)' }}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">{t(`documentType.${type}`)}</p>
        {mode !== 'create' && status && (
          <AppTag value={t(`documentStatus.${status}`)} severity={DOC_STATUS_SEVERITY[status]} />
        )}
      </div>

      {mode === 'create' &&
        (staged ? (
          <div className="mt-2">
            <AppFileRow
              name={staged.name}
              mime={staged.type}
              size={staged.size}
              actions={
                <AppButton
                  icon="pi pi-times"
                  text
                  rounded
                  severity="danger"
                  aria-label={t('common.delete')}
                  onClick={() => onUnstage(type)}
                />
              }
            />
          </div>
        ) : (
          <div className="mt-2 flex items-center justify-between gap-2">
            <p className="text-xs text-slate-500">{t('common.notLoaded')}</p>
            <AppFileUpload
              chooseOptions={UPLOAD_CHOOSE_OPTIONS}
              chooseLabel=""
              onSizeReject={onSizeReject}
              uploadHandler={(e) => onStage(type, e)}
            />
          </div>
        ))}

      {mode === 'view' &&
        (doc ? (
          <div className="mt-2">
            <AppFileRow
              name={doc.original_name}
              mime={doc.mime}
              size={doc.size}
              createdAt={doc.created_at}
              actions={<AppFileActions file={doc} onPreview={onPreview} />}
            />
          </div>
        ) : (
          <p className="mt-2 text-xs text-slate-500">{t('common.notLoaded')}</p>
        ))}

      {mode === 'edit' &&
        (doc ? (
          <div className="mt-2">
            <AppFileRow
              name={doc.original_name}
              mime={doc.mime}
              size={doc.size}
              createdAt={doc.created_at}
              actions={
                <AppFileActions
                  file={doc}
                  onPreview={onPreview}
                  onRemove={canRemove ? () => onRemoveDoc(doc.id) : undefined}
                >
                  <AppFileUpload
                    chooseOptions={UPLOAD_CHOOSE_OPTIONS}
                    chooseLabel=""
                    disabled={uploading}
                    onSizeReject={onSizeReject}
                    uploadHandler={(e) => onUpload(type, e)}
                  />
                </AppFileActions>
              }
            />
          </div>
        ) : (
          <div className="mt-2 flex items-center justify-between gap-2">
            <p className="text-xs text-slate-500">{t('common.notLoaded')}</p>
            <AppFileUpload
              chooseOptions={UPLOAD_CHOOSE_OPTIONS}
              chooseLabel=""
              disabled={uploading}
              onSizeReject={onSizeReject}
              uploadHandler={(e) => onUpload(type, e)}
            />
          </div>
        ))}
    </div>
  )
}
