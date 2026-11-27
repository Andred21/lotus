import type { TurmaData, TurmaDocumentData, TurmaDocumentType } from '@shared/types/generated'
import { problemMessage } from '@shared/api/problemMessage'
import { loadFailure, useMutationErrors, usePermissions } from '@shared/hooks'
import { retryFor } from '@shared/lib'
import { useToast } from '@shared/ui'
import { useTranslation } from 'react-i18next'
import {
  useRemoveTurmaDocument,
  useTurmaDocuments,
  useUploadTurmaDocument,
} from '../api/useTurmaDocuments'
import { TURMA_DOCUMENT_TYPES } from '../lib/turmaDocuments'
import { podeAnexar, podeRemover } from '../lib/evaluacionGate'
import { registroAcademicoBloqueado } from '../lib/turmaStatus'

/** Os tipos que habilitam a turma. Só para o PROGRESSO da aba: quem decide o que
 * falta é o backend (`missing_document_types`). Cliente e Alumnos são opcionais
 * e aparecem no aviso do cartão de evaluaciones, não nesta contagem. */
const TIPOS_BLOQUEANTES: TurmaDocumentType[] = ['MANUAL', 'EVALUACION_REDATOR']

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
  // legal — "0 de 2 entregados" não pode ser lido como confirmado quando a
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
  const concluida = registroAcademicoBloqueado(turma)
  const status = turma.status ?? 'em_andamento'
  // `can()` é conveniência de interface; a autorização real é da API (ADR-07).
  // A matriz por tipo e por status mora em `evaluacionGate` e espelha o gate do
  // backend: o admin com `submit_client_evaluation` anexa Cliente, o redator em
  // turma concluída ainda anexa Alumnos, e só `manage_concluded_docs` mexe no
  // resto da turma concluída.
  const canUpload = (type: TurmaDocumentType) => podeAnexar(type, status, can)
  const canRemove = (type: TurmaDocumentType) => podeRemover(type, status, can)
  // A conclusão saiu daqui como MOTIVO exibido: ela tranca a página inteira, não
  // só esta aba, e o cartão que a explica passou a ser da `TurmaDetailPage`
  // (UI-01) — mantê-lo aqui diria o mesmo motivo duas vezes na mesma tela. Falta
  // de permissão continua, porque é específico desta aba e não aparece em lugar
  // nenhum: vale quando o ator não anexa tipo nenhum.
  const lockReason: 'permission' | null = TURMA_DOCUMENT_TYPES.some(canUpload) ? null : 'permission'
  const faltamBloqueantes = turma.missing_document_types ?? TIPOS_BLOQUEANTES

  return {
    turmaId,
    loading: list.isLoading,
    loadError: loadFailure(list),
    reload: retryFor(list.error, (): Promise<unknown> => list.refetch()),
    error,
    byType,
    deliveredCount: TIPOS_BLOQUEANTES.length - faltamBloqueantes.length,
    totalTypes: TIPOS_BLOQUEANTES.length,
    missingOptional: turma.missing_optional_document_types ?? [],
    habilitada: turma.habilitada === true,
    concluida,
    canUpload,
    canRemove,
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
    // O diálogo de confirmação é do `AppFileActions`, e ele fecha só no sucesso
    // (`onSuccess` do caller, que resolve a Promise dele): com a mutation em voo
    // ele trava ESC/X/Cancelar para o 403/422 ter onde pousar (`onError`).
    remove: (fileId: number, options?: { onSuccess?: () => void; onError?: () => void }) =>
      removeMutation.mutate({ turmaId, fileId }, options),
    removing: removeMutation.isPending,
    // O erro só aparece no diálogo depois de uma tentativa rejeitada NELE
    // (`AppFileActions`), então reabrir para outro arquivo não mostra o erro
    // fantasma de uma tentativa que nunca ocorreu para ele.
    removeError,
  }
}
