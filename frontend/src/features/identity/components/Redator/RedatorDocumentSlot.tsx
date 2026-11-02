import { useTranslation } from 'react-i18next'
import { AppTag } from '@shared/ui'
import { docStatus, DOC_STATUS_SEVERITY } from '@shared/lib'
import { SlotBody, type SlotBodyProps } from './SlotBody'

/**
 * Um tipo de documento do redator, nos três modos do diálogo. O cabeçalho
 * (rótulo + tag de status) é comum aos três; o cartão e o corpo são o
 * `AppFileSlot`, por `SlotBody`.
 *
 * `preview` e `sizeError` NÃO moram aqui (D6): são únicos para os quatro tipos e
 * vivem em `RedatorDocumentsSection` — descê-los montaria quatro diálogos de
 * preview e moveria a mensagem de erro para dentro do slot.
 */
export function RedatorDocumentSlot({ type, mode, doc, ...body }: SlotBodyProps) {
  const { t } = useTranslation()
  const status = doc ? docStatus(doc.valid_until) : null

  // O cartão (a borda do tema, D7) é do `AppFileSlot`; aqui sobra o cabeçalho:
  // rótulo à esquerda e, fora da criação, a tag de status à direita.
  const title = (
    <>
      <p className="text-sm font-medium">{t(`documentType.${type}`)}</p>
      {mode !== 'create' && status && (
        <AppTag value={t(`documentStatus.${status}`)} severity={DOC_STATUS_SEVERITY[status]} />
      )}
    </>
  )

  return <SlotBody type={type} mode={mode} doc={doc} {...body} title={title} />
}
