import { useTranslation } from 'react-i18next'
import { AppTag } from '@shared/ui'
import { docStatus, DOC_STATUS_SEVERITY } from '@shared/lib'
import { SlotBody, type SlotBodyProps } from './SlotBody'

/**
 * Um tipo de documento do redator, nos três modos do diálogo. O cabeçalho
 * (rótulo + tag de status) é comum aos três; o corpo é `SlotBody`.
 *
 * `preview` e `sizeError` NÃO moram aqui (D6): são únicos para os quatro tipos e
 * vivem em `RedatorDocumentsSection` — descê-los montaria quatro diálogos de
 * preview e moveria a mensagem de erro para dentro do slot.
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
