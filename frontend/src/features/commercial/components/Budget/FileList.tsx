import { useTranslation } from 'react-i18next'
import { AppButton } from '@shared/ui'
import type { FileData } from '@shared/types/generated'

const KB = 1024

/** Ícone e cor por extensão. O protótipo mostra o PDF em quadrado arredondado
 * vermelho; os outros tipos seguem a mesma forma com a cor da família. Cor por
 * palette var do Lara, composta com --surface-card no fundo para funcionar nos
 * dois temas (os palette vars não invertem). */
function fileIcon(name: string): { icon: string; hue: string } {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  if (ext === 'pdf') return { icon: 'pi pi-file-pdf', hue: 'var(--red-500)' }
  if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') return { icon: 'pi pi-file-excel', hue: 'var(--green-500)' }
  if (ext === 'png' || ext === 'jpg' || ext === 'jpeg') return { icon: 'pi pi-image', hue: 'var(--blue-500)' }
  return { icon: 'pi pi-file', hue: 'var(--text-color-secondary)' }
}

export function FileList({ files, onRemove }: { files: FileData[]; onRemove?: (fileId: number) => void }) {
  const { t } = useTranslation()

  if (files.length === 0) {
    return <p className="px-4 pb-4 text-sm" style={{ color: 'var(--text-color-secondary)' }}>{t('budget.noDocuments')}</p>
  }

  return (
    <ul>
      {files.map((f) => {
        const { icon, hue } = fileIcon(f.original_name)
        return (
          <li
            key={f.id}
            className="flex items-center gap-3 border-t px-4 py-3 first:border-t-0"
            style={{ borderColor: 'var(--surface-border)' }}
          >
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
              style={{ background: `color-mix(in srgb, ${hue} 12%, var(--surface-card))`, color: hue }}
            >
              <i className={icon} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{f.original_name}</p>
              <p className="text-xs" style={{ color: 'var(--text-color-secondary)' }}>
                {f.created_at ? new Date(f.created_at).toLocaleDateString() : ''}
                {' · '}
                {Math.round(f.size / KB)} KB
              </p>
            </div>
            <a href={f.download_url} target="_blank" rel="noreferrer">
              <AppButton icon="pi pi-download" text rounded aria-label={t('common.download')} />
            </a>
            {onRemove && (
              <AppButton icon="pi pi-trash" text rounded severity="danger" aria-label={t('common.delete')} onClick={() => onRemove(f.id)} />
            )}
          </li>
        )
      })}
    </ul>
  )
}
