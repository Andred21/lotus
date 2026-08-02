import { useState } from 'react'

/**
 * Estado do diálogo de pré-visualização de arquivo.
 *
 * Existe porque o trio `useState<T | null>` + `visible={preview !== null}` +
 * `onHide={() => setPreview(null)}` estava repetido, idêntico, em três features
 * (`RedatorDialog`, `DocumentTypeCard`, `FileList`).
 *
 * Genérico sem constraint de propósito: quem restringe é o `AppFilePreviewDialog`,
 * que só aceita `PreviewableFile | null`. Assim o hook serve a qualquer DTO de
 * arquivo sem o `shared/hooks` depender do `shared/ui`.
 */
export function useFilePreview<T>() {
  const [file, setFile] = useState<T | null>(null)

  return {
    file,
    visible: file !== null,
    open: (f: T) => setFile(f),
    close: () => setFile(null),
  }
}
