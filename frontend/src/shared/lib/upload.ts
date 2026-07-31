/** Teto lógico do upload: 10 MB. É o MESMO valor do `max:10240` (KB) dos 5
 * controllers Laravel — 10240 * 1024. nginx e PHP ficam acima disso de
 * propósito (spec D2), então quem rejeita é sempre o backend. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

/** Tamanho legível para a linha do arquivo (o backend devolve bytes). */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Como o arquivo se pré-visualiza. Decide por `mime`, que é o que ficou
 * gravado em `files` (spec D7); a extensão do nome é fallback só quando o
 * mime vier null — a coluna é nullable. */
export function isPreviewable(
  mime: string | null | undefined,
  name: string,
): 'image' | 'pdf' | null {
  if (mime?.startsWith('image/')) return 'image'
  if (mime === 'application/pdf') return 'pdf'
  if (mime) return null

  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) return 'image'
  if (ext === 'pdf') return 'pdf'
  return null
}
