import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { ProblemDetails } from '@shared/api/axios'
import { photoResource, type PhotoResource } from '@shared/api/photoResource'
import type { DialogMode } from '@shared/lib'

export interface UseEntityPhotoOptions {
  resource: PhotoResource
  /** `null` em `create` — ainda não existe entidade para pendurar a foto. */
  id: number | null
  mode: DialogMode
  /** `photo_url` vindo do DTO. */
  url?: string | null
  /** Query key a invalidar depois de subir/remover (a do recurso pai). */
  invalidateKey: readonly unknown[]
}

/**
 * Orquestra a foto de um diálogo de cadastro.
 *
 * Em `create` não há id, então o arquivo é BUFFERIZADO e mostrado por
 * `URL.createObjectURL` — nenhuma requisição sai. O diálogo chama `flush(id)`
 * no `onSuccess` do create para subir a foto guardada (spec D10).
 *
 * Em `edit`/`view` o upload é imediato e invalida a query do recurso, para que
 * o `photo_url` novo chegue na próxima leitura.
 */
export function useEntityPhoto({ resource, id, mode, url, invalidateKey }: UseEntityPhotoOptions) {
  const qc = useQueryClient()
  const client = photoResource(resource)

  const [buffered, setBuffered] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [sizeError, setSizeError] = useState<string | null>(null)
  const [bufferedFailure, setBufferedFailure] = useState(false)

  // Object URL é recurso do browser: sem o revoke, cada troca de foto no
  // create vaza um blob até o reload da aba.
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  const invalidate = () => qc.invalidateQueries({ queryKey: invalidateKey })

  const upload = useMutation<void, ProblemDetails, { id: number; file: File }>({
    mutationFn: ({ id: entityId, file }) => client.upload(entityId, file),
    onSuccess: invalidate,
  })

  const remove = useMutation<void, ProblemDetails, number>({
    mutationFn: (entityId) => client.remove(entityId),
    onSuccess: invalidate,
  })

  function onSelect(file: File) {
    setSizeError(null)
    setBufferedFailure(false)

    if (id === null) {
      if (preview) URL.revokeObjectURL(preview)
      setBuffered(file)
      setPreview(URL.createObjectURL(file))
      return
    }

    upload.mutate({ id, file })
  }

  function onRemove() {
    setSizeError(null)
    setBufferedFailure(false)

    if (id === null) {
      if (preview) URL.revokeObjectURL(preview)
      setBuffered(null)
      setPreview(null)
      return
    }

    remove.mutate(id)
  }

  /**
   * Sobe a foto bufferizada depois que o create devolveu a entidade. Não
   * lança: a entidade JÁ existe, e propagar o erro faria o diálogo fechar
   * como se tudo tivesse dado certo. O chamador lê `hasBufferedFailure`.
   */
  async function flush(createdId: number): Promise<void> {
    if (!buffered) return

    try {
      await upload.mutateAsync({ id: createdId, file: buffered })
      setBuffered(null)
      if (preview) URL.revokeObjectURL(preview)
      setPreview(null)
    } catch {
      setBufferedFailure(true)
    }
  }

  const mutationError = upload.error?.detail
    ?? Object.values(upload.error?.errors ?? {})[0]?.[0]
    ?? remove.error?.detail
    ?? Object.values(remove.error?.errors ?? {})[0]?.[0]
    ?? null

  return {
    url: mode === 'create' ? preview : (url ?? null),
    pending: upload.isPending || remove.isPending,
    error: sizeError ?? mutationError,
    onSelect,
    onRemove,
    onSizeReject: (message: string) => setSizeError(message),
    onRetry: () => {
      if (id !== null && buffered) upload.mutate({ id, file: buffered })
    },
    flush,
    hasBufferedFailure: bufferedFailure,
  }
}
