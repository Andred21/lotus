import { useState } from 'react'
import type { DialogMode } from '@shared/lib'
import type { ProblemDetails } from '@shared/api/axios'

/** Contrato mínimo que `createCrudResource<T>` satisfaz. Tipado por estrutura
 * para o hook não depender da fábrica inteira. */
interface ListableResource<T> {
  useList: () => {
    data?: T[]
    isLoading: boolean
    isError: boolean
    error: ProblemDetails | null
    refetch: () => unknown
  }
}

/**
 * Estado de uma página de módulo CRUD: a lista e o dialog unificado.
 *
 * O dialog guarda o **id**, não o objeto. A entidade é derivada de `items` a cada
 * render, então uma invalidação de query (upload de documento, edição de nested)
 * chega ao dialog aberto. Guardar o objeto congelava um snapshot obsoleto — foi
 * exatamente esse o bug que a task 4.2.2 escondeu.
 *
 * `error` sobe junto com `items` porque sem ele a página não distingue "não há
 * registros" de "não deu para perguntar" (spec D16): o GET falhava e a tabela
 * exibia o empty state que convida a cadastrar.
 */
export function useCrudPage<T extends { id?: number }>(resource: ListableResource<T>) {
  const query = resource.useList()
  const [dialog, setDialog] = useState<{ mode: DialogMode; id: number | null } | null>(null)

  const items = query.data ?? []
  const entity = dialog?.id != null ? (items.find((i) => i.id === dialog.id) ?? null) : null

  return {
    items,
    loading: query.isLoading,
    /** Truthy só quando a listagem falhou. `null` em sucesso, inclusive com
     * lista vazia — vazio não é erro. O cast cobre o erro de rede que não passa
     * pelo interceptor: `isError` sem `ProblemDetails`. Sem ele o tipo vira
     * `ProblemDetails | {}` e qualquer `.detail` no consumidor não compila. */
    error: query.isError ? (query.error ?? ({} as ProblemDetails)) : null,
    refetch: () => { void query.refetch() },
    dialog: dialog ? { mode: dialog.mode, entity } : null,
    openCreate: () => setDialog({ mode: 'create', id: null }),
    openView: (item: T) => setDialog({ mode: 'view', id: item.id ?? null }),
    /** view -> edit, preservando a entidade aberta. Nunca entra em edit sem entidade. */
    startEdit: () => setDialog((d) => (d && d.id != null ? { ...d, mode: 'edit' } : d)),
    close: () => setDialog(null),
  }
}
