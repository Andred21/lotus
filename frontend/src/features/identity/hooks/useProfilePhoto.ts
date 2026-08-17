import { useState } from 'react'
import { useMutationErrors } from '@shared/hooks'
import { useRemoveProfilePhoto, useUploadProfilePhoto } from '../api/useProfile'

/**
 * Foto do próprio perfil, no formato de props do `AppPhotoField`.
 *
 * Não reusa `useEntityPhoto` (spec D7): aquele monta `/api/<recurso>/<id>/photo`
 * a partir de um id e carrega o buffer de criação — segurar o arquivo até a
 * entidade existir. As rotas daqui são singulares e sem id, e não há criação a
 * bufferizar. O que se reusa é o componente apresentacional, inteiro.
 */
export function useProfilePhoto(url: string | null) {
  const upload = useUploadProfilePhoto()
  const remove = useRemoveProfilePhoto()
  const [sizeError, setSizeError] = useState<string | null>(null)
  // Último arquivo tentado, para o "Reintentar" reenviar o MESMO arquivo e não
  // o que estiver na tela no momento do clique.
  const [lastTried, setLastTried] = useState<File | null>(null)

  const { message } = useMutationErrors([upload.error, remove.error])

  // Cada `useMutation` guarda o próprio `error` até o PRÓXIMO `mutate` dela ou
  // um `reset`. São duas instâncias e `useMutationErrors` devolve o primeiro
  // truthy da lista: sem zerar a irmã, remover a foto depois de um upload que
  // falhou deixava o erro do upload na tela — anunciando falha de uma ação que
  // já não existe, sobre uma remoção que deu certo. Vale nos dois sentidos.
  function enviar(file: File) {
    remove.reset()
    upload.mutate(file, { onSuccess: () => setLastTried(null) })
  }

  function onSelect(file: File) {
    setSizeError(null)
    setLastTried(file)
    enviar(file)
  }

  function onRemove() {
    setSizeError(null)
    setLastTried(null)
    upload.reset()
    remove.mutate()
  }

  return {
    url,
    pending: upload.isPending || remove.isPending,
    // Teto tem precedência: é o erro do arquivo que o usuário acabou de
    // escolher, não o da tentativa anterior.
    error: sizeError ?? message,
    onSelect,
    onRemove,
    onSizeReject: (m: string) => setSizeError(m),
    // `undefined` apaga o botão "Reintentar" no `AppPhotoField`. Com
    // `sizeError` na tela o botão mentiria: reenviaria o arquivo ANTERIOR,
    // não o que acabou de ser recusado pelo teto.
    onRetry: sizeError === null && lastTried !== null ? () => enviar(lastTried) : undefined,
  }
}
