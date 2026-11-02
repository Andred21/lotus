import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { AppButton } from '../AppButton'
import { AppFileActions, type AppFileActionsProps } from '../AppFileActions'
import type { PreviewableFile } from '../AppFilePreviewDialog'
import { AppFileRow } from '../AppFileRow'
import { AppFileUpload, type FileUploadHandlerEvent } from '../AppFileUpload'

/** Enviar e substituir são o mesmo ícone, só-ícone: o rótulo é a dica e o nome
 * acessível (`AppFileUpload`). */
const UPLOAD_CHOOSE_OPTIONS = {
  icon: 'pi pi-upload',
  className: 'p-button-text p-button-rounded',
}

type RemovalProps<T extends PreviewableFile> = Pick<
  AppFileActionsProps<T>,
  'onRemove' | 'removing' | 'removeLabel' | 'confirmTitle' | 'confirmMessage' | 'confirmLabel' | 'removeError'
>

export type AppFileSlotProps<T extends PreviewableFile> = RemovalProps<T> & {
  /** Cabeçalho do cartão: texto (vira o rótulo) ou nó (texto + tag de estado, que
   * ficam nas pontas). Ausente = cartão sem cabeçalho. */
  title?: ReactNode
  file: T | null | undefined
  onPreview: (file: T) => void
  /** Ausente = sem enviar nem substituir (só leitura). */
  onUpload?: (e: FileUploadHandlerEvent) => void
  /** Nome acessível e dica do enviar. Default `common.upload`. */
  uploadLabel?: string
  /** Nome acessível e dica do substituir. Default `common.replace`. Onde a tela
   * repete o verbo para vários documentos, o nome leva o tipo (D-23). */
  replaceLabel?: string
  accept?: string
  maxBytes?: number
  uploading?: boolean
  onSizeReject?: (message: string) => void
  /** Arquivo escolhido e ainda não enviado (criação: sem id para o endpoint). É
   * um `File` do browser, sem `download_url`: a linha traz só o tirar do stage. */
  staged?: File
  onUnstage?: () => void
  /** Corpo extra abaixo da linha (prévia da assinatura, aviso). */
  children?: ReactNode
}

/**
 * Slot de arquivo: cartão com título, a linha do arquivo e as ações só-ícone, na
 * ordem ver, baixar, substituir, excluir. Vazio mostra "não carregado" e o enviar.
 *
 * Nasce do cartão de documentos do redator e vale para o produto inteiro
 * (bloco 47). Reverte a D8 da spec de upload de 2026-07-31, que rejeitou um slot
 * compartilhado, por decisão do João (2026-11-01).
 *
 * A tela passa só o que tem: sem `onUpload` não há enviar nem substituir; sem
 * `onRemove`, sem lixeira. Excluir confirma sempre (`AppFileActions`).
 */
export function AppFileSlot<T extends PreviewableFile>({
  title,
  file,
  onPreview,
  onUpload,
  uploadLabel,
  replaceLabel,
  accept,
  maxBytes,
  uploading,
  onSizeReject,
  staged,
  onUnstage,
  children,
  ...removal
}: AppFileSlotProps<T>) {
  const { t } = useTranslation()

  const picker = (label: string) =>
    onUpload && (
      <AppFileUpload
        chooseOptions={UPLOAD_CHOOSE_OPTIONS}
        chooseLabel=""
        accessibleName={label}
        accept={accept}
        maxBytes={maxBytes}
        disabled={uploading}
        onSizeReject={onSizeReject}
        uploadHandler={onUpload}
      />
    )

  let body: ReactNode
  if (staged) {
    body = (
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
            tooltip={t('common.delete')}
            tooltipOptions={{ position: 'left' }}
            onClick={onUnstage}
          />
        }
      />
    )
  } else if (file) {
    body = (
      <AppFileRow
        name={file.original_name}
        mime={file.mime}
        size={file.size}
        createdAt={(file as { created_at?: string | null }).created_at}
        actions={
          <AppFileActions file={file} onPreview={onPreview} {...removal}>
            {picker(replaceLabel ?? t('common.replace'))}
          </AppFileActions>
        }
      />
    )
  } else {
    body = (
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs" style={{ color: 'var(--text-color-secondary)' }}>{t('common.notLoaded')}</p>
        {picker(uploadLabel ?? t('common.upload'))}
      </div>
    )
  }

  // A borda vem da variável do tema, não de um par Tailwind claro/escuro (D7/D18
  // do redator, de onde o cartão veio).
  return (
    <div className="rounded-surface border p-2" style={{ borderColor: 'var(--surface-border)' }}>
      {title != null && (
        <div className="flex items-center justify-between gap-2">
          {typeof title === 'string' ? <p className="text-sm font-medium">{title}</p> : title}
        </div>
      )}
      <div className={title != null ? 'mt-2' : undefined}>{body}</div>
      {children && <div className="mt-2">{children}</div>}
    </div>
  )
}
