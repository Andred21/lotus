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

type SlotBodyProps = {
  type: DocType
  mode: DialogMode
  doc: RedatorDocumentData | undefined
  staged: File | undefined
  uploading: boolean
  onStage: (type: DocType, e: FileUploadHandlerEvent) => void
  onUnstage: (type: DocType) => void
  onUpload: (type: DocType, e: FileUploadHandlerEvent) => void
  /** Ausente = sem exclusão (mesmo contrato do `AppFileActions.onRemove`).
   * Quem monta a prop é quem sabe se há redator com id para o endpoint. */
  onRemoveDoc?: (docId: number) => void
  onPreview: (doc: RedatorDocumentData) => void
  onSizeReject: (message: string) => void
}

/** Linha de "nada carregado ainda" + o botão de escolher arquivo. Idêntica em
 * `create` (stage local) e `edit` (upload imediato); só muda o handler. */
function EmptySlot({
  uploading,
  onPick,
  onSizeReject,
}: {
  uploading?: boolean
  onPick: (e: FileUploadHandlerEvent) => void
  onSizeReject: (message: string) => void
}) {
  const { t } = useTranslation()

  return (
    <div className="flex items-center justify-between gap-2">
      <p className="text-xs" style={{ color: 'var(--text-color-secondary)' }}>{t('common.notLoaded')}</p>
      <AppFileUpload
        chooseOptions={UPLOAD_CHOOSE_OPTIONS}
        chooseLabel=""
        disabled={uploading}
        onSizeReject={onSizeReject}
        uploadHandler={onPick}
      />
    </div>
  )
}

/** Os três modos como guardas sequenciais, não como ternário aninhado (D5). */
function SlotBody({
  type,
  mode,
  doc,
  staged,
  uploading,
  onStage,
  onUnstage,
  onUpload,
  onRemoveDoc,
  onPreview,
  onSizeReject,
}: SlotBodyProps) {
  const { t } = useTranslation()

  if (mode === 'create') {
    // Arquivo em stage é um `File` do browser, sem `download_url` — não há o que
    // pré-visualizar nem baixar, então a linha traz só a remoção do stage (por
    // isso não usa `AppFileActions`).
    if (!staged) {
      return <EmptySlot onPick={(e) => onStage(type, e)} onSizeReject={onSizeReject} />
    }
    return (
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
    )
  }

  if (mode === 'view') {
    // Documento é imutável aqui: só ver e baixar.
    if (!doc) return <p className="text-xs" style={{ color: 'var(--text-color-secondary)' }}>{t('common.notLoaded')}</p>
    return (
      <AppFileRow
        name={doc.original_name}
        mime={doc.mime}
        size={doc.size}
        createdAt={doc.created_at}
        actions={<AppFileActions file={doc} onPreview={onPreview} />}
      />
    )
  }

  // edit: ver, baixar, substituir (upload imediato pelo endpoint aninhado) e excluir.
  if (!doc) {
    return (
      <EmptySlot
        uploading={uploading}
        onPick={(e) => onUpload(type, e)}
        onSizeReject={onSizeReject}
      />
    )
  }
  return (
    <AppFileRow
      name={doc.original_name}
      mime={doc.mime}
      size={doc.size}
      createdAt={doc.created_at}
      actions={
        <AppFileActions
          file={doc}
          onPreview={onPreview}
          onRemove={onRemoveDoc ? () => onRemoveDoc(doc.id) : undefined}
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
  )
}

/**
 * Um tipo de documento do redator, nos três modos do diálogo. O cabeçalho
 * (rótulo + tag de status) é comum aos três; o corpo é `SlotBody`.
 *
 * `preview` e `sizeError` NÃO moram aqui (D6): são únicos para os quatro tipos e
 * vivem no diálogo — descê-los montaria quatro diálogos de preview e moveria a
 * mensagem de erro para dentro do slot.
 */
export function RedatorDocumentSlot({ type, mode, doc, ...body }: SlotBodyProps) {
  const { t } = useTranslation()
  const status = doc ? docStatus(doc.valid_until) : null

  // D7: a borda vem da variável do tema, não de um par Tailwind hardcoded
  // claro/escuro fixando a cor da borda — que era o débito do D18.
  return (
    <div className="rounded border p-2" style={{ borderColor: 'var(--surface-border)' }}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">{t(`documentType.${type}`)}</p>
        {mode !== 'create' && status && (
          <AppTag value={t(`documentStatus.${status}`)} severity={DOC_STATUS_SEVERITY[status]} />
        )}
      </div>

      <div className="mt-2">
        <SlotBody type={type} mode={mode} doc={doc} {...body} />
      </div>
    </div>
  )
}
