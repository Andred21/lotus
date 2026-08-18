import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { AppButton } from '../AppButton'
import { AppDownloadButton } from '../AppDownloadButton'
import type { PreviewableFile } from '../AppFilePreviewDialog'

export type AppFileActionsProps<T extends PreviewableFile> = {
  file: T
  onPreview: (file: T) => void
  /** Ausente = sem botão de excluir. */
  onRemove?: () => void
  removing?: boolean
  /** Rótulo acessível da lixeira. Default `common.delete`; a tela sobrescreve
   * quando tem verbo próprio (ex.: `operation.documents.remove`). */
  removeLabel?: string
  /** Ações da própria tela, entre baixar e excluir (ex.: substituir, no redator). */
  children?: ReactNode
}

/**
 * Conjunto padrão de ações da linha de arquivo: ver → baixar → extras → excluir.
 *
 * Nasce de 4 blocos repetidos em 3 features, que divergiam no `aria-label`: dois
 * punham, um não. Padroniza o CONJUNTO sem tirar a escolha do chamador — `onRemove`
 * ausente significa sem lixeira, `children` são as ações da tela — que é exatamente
 * o contrato que o `AppFileRow.actions` já estabelecia ("o chamador decide quais
 * existem").
 *
 * NÃO absorve a estrutura da lista nem do slot: o D8 da spec de upload de
 * 2026-07-31 avaliou e rejeitou um `AppFileList`/`AppDocumentSlot`, e segue em vigor.
 * Arquivo sem `download_url` (em stage, ainda não subiu) não usa este componente —
 * não há o que pré-visualizar nem baixar.
 */
export function AppFileActions<T extends PreviewableFile>({
  file,
  onPreview,
  onRemove,
  removing,
  removeLabel,
  children,
}: AppFileActionsProps<T>) {
  const { t } = useTranslation()

  return (
    <>
      <AppButton
        icon="pi pi-eye"
        text
        rounded
        aria-label={t('common.preview')}
        onClick={() => onPreview(file)}
      />
      <AppDownloadButton href={file.download_url} />
      {children}
      {onRemove && (
        <AppButton
          icon="pi pi-trash"
          text
          rounded
          severity="danger"
          aria-label={removeLabel ?? t('common.delete')}
          disabled={removing}
          onClick={onRemove}
        />
      )}
    </>
  )
}
