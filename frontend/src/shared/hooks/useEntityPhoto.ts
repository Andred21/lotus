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
  // Id do último upload direto tentado (edit/view) OU o `createdId` que o
  // `flush` estava tentando quando falhou — não o `id` da prop, que pode
  // mudar de render pra render. `onRetry` usa este valor, nunca a prop.
  const [retryId, setRetryId] = useState<number | null>(null)

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

    // Guarda o arquivo E o id usados nesta tentativa — se o upload falhar,
    // `onRetry` reenvia o MESMO arquivo para o MESMO id, não o que a prop
    // tiver no momento do clique em "Reintentar".
    setBuffered(file)
    setRetryId(id)
    upload.mutate({ id, file }, {
      onSuccess: () => {
        setBuffered(null)
        setRetryId(null)
      },
    })
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

    setBuffered(null)
    setRetryId(null)
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
      setRetryId(null)
      if (preview) URL.revokeObjectURL(preview)
      setPreview(null)
    } catch {
      // Guarda o `createdId` (não o `id` da prop) para que `onRetry` reenvie
      // pro destino certo mesmo que a transição pra edit ainda não tenha
      // propagado a prop `id` no momento do clique.
      setRetryId(createdId)
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
    // Funciona em qualquer modo: reenvia o último arquivo tentado
    // (`buffered`) pro último id tentado (`retryId`) — seja uma falha de
    // upload direto em edit/view, seja uma falha de `flush` pós-create.
    //
    // `undefined` quando não há o que reenviar, porque é isso que apaga o
    // botão "Reintentar" no `AppPhotoField`. O caller não decide quando o
    // retry faz sentido: gatear no chamador foi o que deixou a falha de
    // upload direto sem botão.
    //
    // `sizeError` também apaga o botão, e não por cosmética: o erro exibido
    // passa a ser o de TAMANHO (tem precedência), mas `buffered`/`retryId`
    // ainda guardam a tentativa ANTERIOR. Com o botão visível ali, clicar
    // reenviaria um arquivo que não é o que o usuário acabou de escolher —
    // o botão mentiria sobre o próprio efeito.
    onRetry: sizeError === null && retryId !== null && buffered ? () => {
      upload.mutate({ id: retryId, file: buffered }, {
        onSuccess: () => {
          setBuffered(null)
          setRetryId(null)
          if (preview) URL.revokeObjectURL(preview)
          setPreview(null)
          setBufferedFailure(false)
        },
      })
    } : undefined,
    flush,
    hasBufferedFailure: bufferedFailure,
  }
}
