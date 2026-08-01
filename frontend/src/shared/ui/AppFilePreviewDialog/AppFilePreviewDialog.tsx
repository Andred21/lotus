import { useTranslation } from 'react-i18next'
import { AppDialog } from '../AppDialog'
import { AppButton } from '../AppButton'
import { AppFileRow } from '../AppFileRow'
import { isPreviewable } from '@shared/lib/upload'

export type PreviewableFile = {
  original_name: string
  mime?: string | null
  size?: number
  download_url: string
}

export type AppFilePreviewDialogProps = {
  file: PreviewableFile | null
  visible: boolean
  onHide: () => void
}

/** Pré-visualização de documento de `files`. Imagem e PDF renderizam inline
 * pela URL pré-assinada; formato sem preview mostra a linha do arquivo e o
 * botão de baixar (spec D9) — a ação NÃO some conforme o tipo, porque ação que
 * desaparece é falha escondida. */
export function AppFilePreviewDialog({ file, visible, onHide }: AppFilePreviewDialogProps) {
  const { t } = useTranslation()
  if (!file) return null

  const kind = isPreviewable(file.mime, file.original_name)

  return (
    <AppDialog visible={visible} onHide={onHide} header={file.original_name} style={{ width: '70vw' }}>
      {kind === 'image' && (
        <img
          src={file.download_url}
          alt={file.original_name}
          className="mx-auto max-h-[70vh] max-w-full object-contain"
        />
      )}

      {kind === 'pdf' && (
        <iframe
          src={file.download_url}
          title={file.original_name}
          className="h-[70vh] w-full"
          style={{ border: 'none' }}
        />
      )}

      {kind === null && (
        <div className="flex flex-col gap-4 p-2">
          <AppFileRow name={file.original_name} mime={file.mime} size={file.size} />
          <p className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>
            {t('common.previewUnavailable')}
          </p>
          <a href={file.download_url} target="_blank" rel="noreferrer" className="self-start">
            <AppButton icon="pi pi-download" label={t('common.download')} />
          </a>
        </div>
      )}
    </AppDialog>
  )
}
