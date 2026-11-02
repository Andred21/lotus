/**
 * Salva um blob em disco com o nome dado.
 *
 * Cria um object URL e um `<a download>` temporário, clica, remove o elemento
 * e revoga o URL no mesmo tick. Não guarda estado: devolve a mesma função a
 * cada render, então o chamador pode usá-la em handlers e `onSuccess` sem
 * dependências extras.
 */
function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

export function useBlobDownload(): (blob: Blob, filename: string) => void {
  return saveBlob
}
