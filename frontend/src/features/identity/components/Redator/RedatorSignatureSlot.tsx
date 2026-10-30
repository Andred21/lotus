import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppButton, AppFileActions, AppFileRow, AppSignatureUpload } from '@shared/ui'
import type { RedatorDocumentData } from '@shared/types/generated'
import type { DialogMode } from '@shared/lib'

export type RedatorSignatureSlotProps = {
  mode: DialogMode
  doc: RedatorDocumentData | undefined
  staged: File | undefined
  uploading: boolean
  /** Em criação ainda não há redator: o PNG limpo fica em stage até o submit. */
  onStage: (file: File) => void
  onUnstage: () => void
  /** `true` = o servidor aceitou. Só nesse caso o seletor é remontado. */
  onUpload: (file: File) => Promise<boolean>
  onRemoveDoc?: (docId: number) => void
  onPreview: (doc: RedatorDocumentData) => void
}

/**
 * A `FIRMA` do redator (spec D2 do bloco 40). Não é documento de compliance:
 * sem tag de status e sem validade — por isso não reusa `RedatorDocumentSlot`.
 * O arquivo sobe já limpo pelo `AppSignatureUpload` (D16).
 */
export function RedatorSignatureSlot({
  mode, doc, staged, uploading, onStage, onUnstage, onUpload, onRemoveDoc, onPreview,
}: RedatorSignatureSlotProps) {
  const { t } = useTranslation()
  // O `AppSignatureUpload` não se reseta depois do `onConfirm`: a prévia ficaria
  // na tela com o botão ativo, a um clique de reenviar a mesma imagem. Trocar a
  // `key` o remonta do zero.
  const [uploadKey, setUploadKey] = useState(0)

  const empty = (
    <p className="text-xs" style={{ color: 'var(--text-color-secondary)' }}>{t('common.notLoaded')}</p>
  )

  let current = null
  if (mode === 'create') {
    current = staged ? (
      <AppFileRow
        name={staged.name}
        mime={staged.type}
        size={staged.size}
        actions={
          <AppButton icon="pi pi-times" text rounded severity="danger" aria-label={t('common.delete')} onClick={onUnstage} />
        }
      />
    ) : null
  } else if (doc) {
    current = (
      <AppFileRow
        name={doc.original_name}
        mime={doc.mime}
        size={doc.size}
        createdAt={doc.created_at}
        actions={
          <AppFileActions
            file={doc}
            onPreview={onPreview}
            onRemove={mode === 'edit' && onRemoveDoc ? () => onRemoveDoc(doc.id) : undefined}
          />
        }
      />
    )
  }

  const canPick = mode === 'create' ? !staged : mode === 'edit'

  return (
    <div className="rounded-surface border p-2" style={{ borderColor: 'var(--surface-border)' }}>
      <p className="text-sm font-medium">{t('documentType.FIRMA')}</p>

      <div className="mt-2 flex flex-col gap-3">
        {current ?? (!canPick && empty)}
        {canPick && (
          <AppSignatureUpload
            key={uploadKey}
            label={t(doc ? 'redator.signatureReplace' : 'redator.signatureChoose')}
            busy={uploading}
            disabled={uploading}
            onConfirm={(file) => {
              if (mode === 'create') return onStage(file)
              void onUpload(file).then((ok) => ok && setUploadKey((k) => k + 1))
            }}
          />
        )}
      </div>
    </div>
  )
}
