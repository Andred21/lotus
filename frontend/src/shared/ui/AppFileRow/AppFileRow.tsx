import type { ReactNode } from 'react'
import { formatFileSize } from '@shared/lib/upload'

/** Ícone e cor por tipo. Decide por mime (spec D7); extensão é fallback quando
 * o mime é null. Cor por palette var do Lara, composta com --surface-card no
 * fundo para funcionar nos dois temas (os palette vars não invertem). */
function fileIcon(mime: string | null | undefined, name: string): { icon: string; hue: string } {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  const is = (m: string, ...exts: string[]) => mime === m || (!mime && exts.includes(ext))

  if (mime?.startsWith('image/') || (!mime && ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext))) {
    return { icon: 'pi pi-image', hue: 'var(--blue-500)' }
  }
  if (is('application/pdf', 'pdf')) return { icon: 'pi pi-file-pdf', hue: 'var(--red-500)' }
  if (
    mime?.includes('spreadsheet') || mime === 'text/csv' ||
    (!mime && ['xlsx', 'xls', 'csv'].includes(ext))
  ) {
    return { icon: 'pi pi-file-excel', hue: 'var(--green-500)' }
  }
  if (mime?.includes('word') || (!mime && ['doc', 'docx'].includes(ext))) {
    return { icon: 'pi pi-file-word', hue: 'var(--indigo-500)' }
  }
  return { icon: 'pi pi-file', hue: 'var(--text-color-secondary)' }
}

export type AppFileRowProps = {
  name: string
  mime?: string | null
  size?: number
  createdAt?: string | null
  /** Botões da linha (ver, baixar, excluir). O chamador decide quais existem. */
  actions?: ReactNode
}

/** Linha de arquivo compartilhada pelos consumidores de `files`: comercial,
 * turma e redator. Absorve o ícone e a formatação que viviam em três cópias
 * divergentes (spec D8). A ESTRUTURA de cada tela continua com a tela. */
export function AppFileRow({ name, mime, size, createdAt, actions }: AppFileRowProps) {
  const { icon, hue } = fileIcon(mime, name)
  const meta = [
    createdAt ? new Date(createdAt).toLocaleDateString() : null,
    size !== undefined ? formatFileSize(size) : null,
  ].filter(Boolean).join(' · ')

  return (
    <div className="flex items-center gap-3">
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
        style={{ background: `color-mix(in srgb, ${hue} 12%, var(--surface-card))`, color: hue }}
      >
        <i className={icon} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{name}</p>
        {meta && <p className="text-xs" style={{ color: 'var(--text-color-secondary)' }}>{meta}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
    </div>
  )
}
