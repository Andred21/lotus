import type { TurmaData, TurmaDocumentData, TurmaDocumentType } from '@shared/types/generated'
import { useMutationErrors } from '@shared/hooks'
import {
  useRemoveTurmaDocument,
  useTurmaDocuments,
  useUploadTurmaDocument,
} from '../api/useTurmaDocuments'
import { TURMA_DOCUMENT_TYPES } from '../lib/turmaDocuments'

/** Orquestra a aba Documentación. O componente só consome.
 * `habilitada` NÃO é recalculada aqui: vem derivada do backend em `TurmaData`. */
export function useTurmaDocsSection(turma: TurmaData) {
  const turmaId = turma.id!
  const list = useTurmaDocuments(turmaId)
  const uploadMutation = useUploadTurmaDocument()
  const removeMutation = useRemoveTurmaDocument()
  const { message: error } = useMutationErrors([list.error, uploadMutation.error, removeMutation.error])
  // Escopo próprio para o dialog de remoção: o banner do painel usa o agregado
  // acima (lista + upload + remoção); o dialog usa só o erro da remoção, senão
  // um erro de upload velho aparece dentro da confirmação de remoção.
  const { message: removeError } = useMutationErrors([removeMutation.error])

  const files = list.data ?? []
  const byType = TURMA_DOCUMENT_TYPES.reduce<Record<TurmaDocumentType, TurmaDocumentData[]>>(
    (acc, type) => {
      acc[type] = files.filter((f) => f.type === type)
      return acc
    },
    {} as Record<TurmaDocumentType, TurmaDocumentData[]>,
  )

  return {
    turmaId,
    loading: list.isLoading,
    error,
    byType,
    deliveredCount: TURMA_DOCUMENT_TYPES.filter((type) => byType[type].length > 0).length,
    totalTypes: TURMA_DOCUMENT_TYPES.length,
    habilitada: turma.habilitada === true,
    concluida: turma.status === 'concluida',
    upload: (type: TurmaDocumentType, file: File) =>
      uploadMutation.mutate({ turmaId, type, file }),
    uploading: uploadMutation.isPending,
    // O dialog fecha só no sucesso (onSuccess do caller): com a mutation em voo,
    // o ConfirmDialog trava ESC/X/Cancelar para o 403/422 ter onde pousar.
    remove: (fileId: number, options?: { onSuccess: () => void }) =>
      removeMutation.mutate({ turmaId, fileId }, options),
    removing: removeMutation.isPending,
    removeError,
    // Reseta a mutation ao cancelar: sem isso, reabrir o dialog para outro
    // arquivo mostraria o erro fantasma de uma tentativa que nunca ocorreu para ele.
    resetRemove: () => removeMutation.reset(),
  }
}
