import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ProblemDetails } from '@shared/api/axios'
import { problemMessage } from '@shared/api/problemMessage'
import { useArchiveToasts } from './useArchiveToasts'

/** O mínimo que o hook exige da mutation de arquivar — estrutural, como o
 * `ArchivableResource`: `coursesApi.useRemove()` satisfaz, e o `useArchiveTurma`
 * artesanal também. */
interface ArchiveMutation {
  mutate: (
    id: number,
    options?: { onSuccess?: () => void; onError?: (problem: ProblemDetails) => void },
  ) => void
  isPending: boolean
}

/**
 * Arquivar com os toasts dos dois lados. Par do `useArchivedPage`, e separado
 * dele de propósito: `Budget`, `Quote` e `Enrollment` têm visão de arquivados
 * SEM botão de arquivar próprio (o deles vive no detalhe do pai), e um parâmetro
 * opcional deixaria `archive` chamável onde não há mutation nenhuma por trás.
 *
 * `onSuccess` do chamador fecha o ConfirmDialog — ele só fecha no sucesso, para
 * o 403/422 ter onde pousar. E é no DIÁLOGO que pousam (C-6): o erro volta em
 * `archiveError`, para o `error` do `ArchiveConfirmDialog`, e não vai a toast —
 * um toast de 8s ao lado de um diálogo parado separava o motivo da ação.
 * (O restore não tem diálogo, e o `useRestoreAction` segue com o toast.)
 *
 * O nome é `archiveError`, e não `error`, porque os hooks de página espalham este
 * retorno por cima do `listSource`, e o `error` dele é a falha de CARGA da lista.
 *
 * `resetArchiveError` é de quem fecha o diálogo (o erro era de outra tentativa);
 * `archive` também o zera ao começar, para o retry não mostrar o erro velho.
 */
export function useArchiveAction(mutation: ArchiveMutation) {
  const toasts = useArchiveToasts()
  const { t } = useTranslation()
  const [archiveError, setArchiveError] = useState<string | null>(null)

  return {
    archive: (id: number, options?: { onSuccess?: () => void }) => {
      setArchiveError(null)
      mutation.mutate(id, {
        onSuccess: () => {
          toasts.archived()
          options?.onSuccess?.()
        },
        // Sem mensagem exibível, o diálogo aberto e mudo seria pior que o genérico.
        onError: (problem) => setArchiveError(problemMessage(problem) ?? t('common.unexpectedError')),
      })
    },
    archiving: mutation.isPending,
    archiveError,
    resetArchiveError: () => setArchiveError(null),
  }
}
