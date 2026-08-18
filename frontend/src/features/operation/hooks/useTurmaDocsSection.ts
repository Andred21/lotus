import type { TurmaData, TurmaDocumentData, TurmaDocumentType } from '@shared/types/generated'
import type { ProblemDetails } from '@shared/api/axios'
import { problemMessage } from '@shared/api/problemMessage'
import { useMutationErrors, usePermissions } from '@shared/hooks'
import { useToast } from '@shared/ui'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
  const toast = useToast()
  const list = useTurmaDocuments(turmaId)
  const uploadMutation = useUploadTurmaDocument()
  const removeMutation = useRemoveTurmaDocument()
  // Erro de carregamento é distinto de erro de mutação (upload/remoção): o
  // primeiro substitui a aba inteira por AppErrorState com Reintentar (peso
  // legal — "0 de 4 entregados" não pode ser lido como confirmado quando a
  // lista nem carregou); o segundo continua no FormErrorBanner do corpo.
  const { message: error } = useMutationErrors([uploadMutation.error, removeMutation.error])
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

  const { can } = usePermissions()
  const concluida = turma.status === 'concluida'
  // `can()` é conveniência de interface; a autorização real é da API (ADR-07).
  const hasPermission = can('operation.turma.submit_docs')
  const lockReason: 'concluida' | 'permission' | null = concluida
    ? 'concluida'
    : hasPermission
      ? null
      : 'permission'

  return {
    turmaId,
    loading: list.isLoading,
    loadError: list.isError ? (list.error ?? ({} as ProblemDetails)) : null,
    reload: () => { void list.refetch() },
    error,
    byType,
    deliveredCount: TURMA_DOCUMENT_TYPES.filter((type) => byType[type].length > 0).length,
    totalTypes: TURMA_DOCUMENT_TYPES.length,
    habilitada: turma.habilitada === true,
    concluida,
    canSubmit: !concluida && hasPermission,
    lockReason,
    upload: (type: TurmaDocumentType, file: File) =>
      uploadMutation.mutate(
        { turmaId, type, file },
        {
          onSuccess: () => toast.success(t('operation.documents.uploaded')),
          // O banner agregado (`error` acima) fica no topo da aba e pode ficar
          // fora da viewport quando o card do 3º tipo está scrollado — o toast
          // garante que a falha apareça onde o usuário está olhando.
          onError: (err) => {
            const message = problemMessage(err)
            if (message) toast.error(message)
          },
        },
      ),
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
