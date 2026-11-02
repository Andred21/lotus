import { useTranslation } from 'react-i18next'
import {
  AppFileSlot,
  SIGNATURE_ACCEPT,
  SIGNATURE_MAX_ORIGINAL_BYTES,
  SignaturePreview,
  useSignatureCleaner,
} from '@shared/ui'
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
 * É o `AppFileSlot` do produto com a limpeza de D16 no meio: o enviar escolhe a
 * imagem, `useSignatureCleaner` a limpa e o `SignaturePreview` pede a decisão
 * abaixo da linha. O arquivo só sobe, ou vai para o stage, já limpo.
 */
export function RedatorSignatureSlot({
  mode, doc, staged, uploading, onStage, onUnstage, onUpload, onRemoveDoc, onPreview,
}: RedatorSignatureSlotProps) {
  const { t } = useTranslation()
  const cleaner = useSignatureCleaner()

  // Criação: escolher é pôr em stage, e com o arquivo em stage só se tira.
  // Sem nada a mostrar não há corpo: o slot não abre um vão vazio abaixo da linha.
  const showing = cleaner.processing || cleaner.preview !== null || cleaner.error !== null
  const canPick = mode === 'edit' || (mode === 'create' && !staged)

  const confirm = (file: File) => {
    if (mode === 'create') {
      onStage(file)
      cleaner.reset()
      return
    }
    // A prévia ficaria na tela, a um clique de reenviar a mesma imagem: só sai
    // quando o servidor aceita; se recusar, fica para tentar de novo.
    void onUpload(file).then((ok) => ok && cleaner.reset())
  }

  return (
    <AppFileSlot
      title={t('documentType.FIRMA')}
      file={mode === 'create' ? null : doc}
      staged={staged}
      onUnstage={onUnstage}
      onPreview={onPreview}
      onUpload={canPick ? cleaner.pick : undefined}
      uploadLabel={t('redator.signatureChoose')}
      replaceLabel={t('redator.signatureReplace')}
      accept={SIGNATURE_ACCEPT}
      maxBytes={SIGNATURE_MAX_ORIGINAL_BYTES}
      uploading={uploading || cleaner.processing}
      onSizeReject={cleaner.reject}
      onRemove={mode === 'edit' && doc && onRemoveDoc ? () => onRemoveDoc(doc.id) : undefined}
    >
      {showing && <SignaturePreview cleaner={cleaner} onConfirm={confirm} busy={uploading} disabled={uploading} />}
    </AppFileSlot>
  )
}
