import { useMemo, useState } from 'react'
import type { ProblemDetails } from '@shared/api/axios'

export type ArchiveMode = 'active' | 'archived'

/** O que o hook exige do DTO composto — os dois campos do arquivamento. O
 * agregado em si (`client`, `course`) é a terceira chave e o hook não precisa
 * conhecê-la. Restringir a `Record<string, unknown>` excluiria toda `interface`,
 * que não tem index signature implícita. */
interface ArchivedRow {
  archived_at: string
  archived_by: string | null
}

/** Contrato mínimo, tipado por estrutura — o hook não depende da fábrica
 * inteira, mesmo molde do `ListableResource` de `useCrudPage`. */
interface ArchivableResource<TArchived> {
  useArchivedList: (enabled: boolean) => {
    data?: TArchived[]
    isLoading: boolean
    isError: boolean
    error: ProblemDetails | null
    refetch: () => Promise<unknown>
  }
  useRestore: () => {
    mutate: (id: number) => void
    isPending: boolean
  }
}

/**
 * Estado da visão de Arquivados: o modo, a lista e o restore.
 *
 * O ACHATAMENTO vive aqui de propósito. O backend devolve o DTO composto
 * (`{ client, archived_at, archived_by }`) porque `ClientData` não muda (spec
 * D8); a tabela, porém, não pode ter duas formas. Achatar na tela obrigaria
 * cada tabela a repetir a mesma desestruturação.
 */
export function useArchivedPage<TArchived extends ArchivedRow>(
  resource: ArchivableResource<TArchived>,
) {
  const [mode, setMode] = useState<ArchiveMode>('active')
  const query = resource.useArchivedList(mode === 'archived')
  const restore = resource.useRestore()

  const items = useMemo(() => {
    return (query.data ?? []).map((row) => {
      const { archived_at, archived_by, ...resto } = row
      // A única chave restante é o agregado (`client` ou `course`): o DTO tem
      // exatamente três campos.
      const agregado = Object.values(resto)[0] as Record<string, unknown>

      return { ...agregado, archived_at, archived_by }
    })
  }, [query.data])

  return {
    mode,
    setMode,
    items,
    loading: query.isLoading,
    /** `null` em sucesso, inclusive com lista vazia — vazio não é erro (D16). */
    error: query.isError ? (query.error ?? ({} as ProblemDetails)) : null,
    /** Devolve a promise: o `AppErrorState` a aguarda para manter o Reintentar
     * em `loading` enquanto o GET está em voo (Q-14). */
    refetch: () => query.refetch(),
    restore: (id: number) => restore.mutate(id),
    restoring: restore.isPending,
  }
}
