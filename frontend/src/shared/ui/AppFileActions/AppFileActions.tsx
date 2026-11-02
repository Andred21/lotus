import { useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { AppButton } from '../AppButton'
import { AppDownloadButton } from '../AppDownloadButton'
import { ConfirmDialog } from '../ConfirmDialog'
import type { PreviewableFile } from '../AppFilePreviewDialog'

export type AppFileActionsProps<T extends PreviewableFile> = {
  file: T
  onPreview: (file: T) => void
  /** Ausente = sem botão de excluir. Chamado SÓ depois do "sim" do diálogo de
   * confirmação, que a peça abre sempre (decisão do João, 2026-11-01). Retorno
   * `void` fecha o diálogo no ato; uma Promise o mantém aberto, em pendência,
   * até resolver — e, se rejeitar, aberto mostrando `removeError`. */
  onRemove?: () => void | Promise<unknown>
  removing?: boolean
  /** Rótulo acessível da lixeira. Default `common.delete`; a tela sobrescreve
   * quando tem verbo próprio (ex.: `operation.documents.remove`). */
  removeLabel?: string
  /** Textos do diálogo. Defaults: `common.deleteFileTitle`,
   * `common.deleteFileMessage` (com `{{name}}` = nome do arquivo) e
   * `common.delete`. Já traduzidos. */
  confirmTitle?: string
  confirmMessage?: string
  confirmLabel?: string
  /** Erro da exclusão (o da mutação da tela). Só aparece depois de uma tentativa
   * REJEITADA neste diálogo, para o erro de um arquivo não vazar para a
   * confirmação de outro. */
  removeError?: string | null
  /** Ações da própria tela, entre baixar e excluir (ex.: substituir). */
  children?: ReactNode
}

/** A dica abre à ESQUERDA (bloco 47), como no `RowActions` do 46: a linha de
 * arquivo mora na borda direita do cartão, e à direita a dica passa da moldura. */
const DICA = { position: 'left' } as const

function isThenable(value: unknown): value is PromiseLike<unknown> {
  return typeof (value as PromiseLike<unknown> | undefined)?.then === 'function'
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
 * Todo botão mostra dica com o próprio `aria-label` e excluir confirma sempre: a
 * confirmação mora AQUI, e não em cada tela, para valer para todos os
 * consumidores de uma vez.
 *
 * A estrutura da lista e do slot NÃO mora aqui, mas já não é rejeitada: o D8 da
 * spec de upload de 2026-07-31 avaliou e rejeitou um `AppFileList`/
 * `AppDocumentSlot`, e o João REVERTEU essa decisão no bloco 47 (2026-11-01) — o
 * cartão com título, linha e ações é o `AppFileSlot`, que consome este componente.
 * Arquivo sem `download_url` (em stage, ainda não subiu) não usa este componente —
 * não há o que pré-visualizar nem baixar.
 */
export function AppFileActions<T extends PreviewableFile>({
  file,
  onPreview,
  onRemove,
  removing,
  removeLabel,
  confirmTitle,
  confirmMessage,
  confirmLabel,
  removeError,
  children,
}: AppFileActionsProps<T>) {
  const { t } = useTranslation()
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  const ask = () => {
    setFailed(false)
    setConfirming(true)
  }
  const close = () => {
    setFailed(false)
    setConfirming(false)
  }
  const confirm = () => {
    if (!onRemove) return
    setFailed(false)
    const result = onRemove()
    if (!isThenable(result)) {
      setConfirming(false)
      return
    }
    setBusy(true)
    result.then(
      () => {
        setBusy(false)
        setConfirming(false)
      },
      () => {
        setBusy(false)
        setFailed(true)
      },
    )
  }

  const removeName = removeLabel ?? t('common.delete')

  return (
    <>
      <AppButton
        icon="pi pi-eye"
        text
        rounded
        aria-label={t('common.preview')}
        tooltip={t('common.preview')}
        tooltipOptions={DICA}
        onClick={() => onPreview(file)}
      />
      <AppDownloadButton href={file.download_url} />
      {children}
      {onRemove && (
        <>
          <AppButton
            icon="pi pi-trash"
            text
            rounded
            severity="danger"
            aria-label={removeName}
            tooltip={removeName}
            tooltipOptions={DICA}
            disabled={removing}
            onClick={ask}
          />
          <ConfirmDialog
            visible={confirming}
            severity="danger"
            title={confirmTitle ?? t('common.deleteFileTitle')}
            message={confirmMessage ?? t('common.deleteFileMessage', { name: file.original_name })}
            confirmLabel={confirmLabel ?? t('common.delete')}
            confirmIcon="pi pi-trash"
            pending={removing || busy}
            error={failed ? removeError : null}
            onConfirm={confirm}
            onCancel={close}
          />
        </>
      )}
    </>
  )
}
