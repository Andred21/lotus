import { useTranslation } from 'react-i18next'
import { AppSignatureSlot } from '@shared/ui'
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
  /** `true` = o servidor aceitou. Só nesse caso a prévia é descartada. */
  onUpload: (file: File) => Promise<boolean>
  onRemoveDoc?: (docId: number) => void
  onPreview: (doc: RedatorDocumentData) => void
}

/**
 * A `FIRMA` do redator (spec D2 do bloco 40). Não é documento de compliance:
 * sem tag de status e sem validade — por isso não reusa `RedatorDocumentSlot`.
 * É o `AppSignatureSlot` do produto: o arquivo só sobe, ou vai para o stage, já
 * limpo.
 */
export function RedatorSignatureSlot({
  mode, doc, staged, uploading, onStage, onUnstage, onUpload, onRemoveDoc, onPreview,
}: RedatorSignatureSlotProps) {
  const { t } = useTranslation()

  // Criação: escolher é pôr em stage, e com o arquivo em stage só se tira.
  const canPick = mode === 'edit' || (mode === 'create' && !staged)

  // Em criação o stage aceita na hora; em edição quem decide é o servidor.
  const confirm = (file: File) => {
    if (mode !== 'create') return onUpload(file)
    onStage(file)
    return true
  }

  return (
    <AppSignatureSlot
      title={t('documentType.FIRMA')}
      file={mode === 'create' ? null : doc}
      staged={staged}
      onUnstage={onUnstage}
      onPreview={onPreview}
      onConfirm={canPick ? confirm : undefined}
      uploadLabel={t('redator.signatureChoose')}
      replaceLabel={t('redator.signatureReplace')}
      uploading={uploading}
      onRemove={mode === 'edit' && doc && onRemoveDoc ? () => onRemoveDoc(doc.id) : undefined}
      removeLabel={t('common.deleteNamed', { tipo: t('documentType.FIRMA') })}
    />
  )
}
