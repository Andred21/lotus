import type { ReactNode } from 'react'
import { AppFileSlot } from '@shared/ui'
import type { FileUploadHandlerEvent } from '@shared/ui'
import type { RedatorDocumentData } from '@shared/types/generated'
import type { DialogMode, DocType } from '@shared/lib'

export type SlotBodyProps = {
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
  /** Cabeçalho do cartão (rótulo + tag de status), que só o slot do documento sabe montar. */
  title?: ReactNode
}

/** Os três modos do diálogo, sobre o `AppFileSlot` compartilhado (bloco 47).
 * O que muda de um modo para outro é só o que se PASSA à peça (D5):
 * - `create`: ainda não há redator, então enviar é pôr em stage (`onStage`) e o
 *   arquivo em stage só se tira;
 * - `view`: documento imutável, só ver e baixar;
 * - `edit`: ver, baixar, substituir (upload imediato pelo endpoint aninhado) e
 *   excluir — a exclusão confirma, na peça. */
export function SlotBody({
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
  title,
}: SlotBodyProps) {
  const common = { title, onPreview, onSizeReject }

  if (mode === 'create') {
    return (
      <AppFileSlot
        {...common}
        file={null}
        staged={staged}
        onUnstage={() => onUnstage(type)}
        onUpload={(e) => onStage(type, e)}
      />
    )
  }

  if (mode === 'view') return <AppFileSlot {...common} file={doc} />

  return (
    <AppFileSlot
      {...common}
      file={doc}
      uploading={uploading}
      onUpload={(e) => onUpload(type, e)}
      onRemove={doc && onRemoveDoc ? () => onRemoveDoc(doc.id) : undefined}
    />
  )
}
