import { useState } from 'react'
import type { DialogMode } from '@shared/lib'
import type { ProblemDetails } from '@shared/api/axios'
import { listSource } from './listSource'

/** Opções de query que a PÁGINA pode pedir. Estreito de propósito: quem precisa
 * de `enabled`, `select` ou `queryKey` está usando o recurso direto, não a
 * página, e alargar isto transformaria o hook em porta aberta para o TanStack. */
export interface CrudPageQueryOptions {
  staleTime?: number
}

/** Contrato mínimo que `createCrudResource<T>` satisfaz. Tipado por estrutura
 * para o hook não depender da fábrica inteira. */
interface ListableResource<T> {
  useList: (options?: CrudPageQueryOptions) => {
    data?: T[]
    isLoading: boolean
    isError: boolean
    error: ProblemDetails | null
    /** `Promise`, não `unknown`: é o refetch do TanStack Query, e a promise é o
     * que o `AppErrorState` aguarda para manter o Reintentar em `loading`
     * (Q-14). Com `() => unknown` aqui, TODA a cadeia acima ficava impedida de
     * declarar o contrato — o tipo do consumidor não pode ser mais preciso que
     * o da fonte (review do BD-3, Q-2). */
    refetch: () => Promise<unknown>
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
export function useCrudPage<T extends { id?: number }>(
  resource: ListableResource<T>,
  options?: CrudPageQueryOptions,
) {
  const query = resource.useList(options)
  const [dialog, setDialog] = useState<{ mode: DialogMode; id: number | null } | null>(null)

  const items = query.data ?? []
  const entity = dialog?.id != null ? (items.find((i) => i.id === dialog.id) ?? null) : null

  return {
    ...listSource(query),
    dialog: dialog ? { mode: dialog.mode, entity } : null,
    openCreate: () => setDialog({ mode: 'create', id: null }),
    openView: (item: T) => setDialog({ mode: 'view', id: item.id ?? null }),
    /** Abre `view` a partir de um id solto (deep link vindo de outro módulo).
     * A entidade continua derivada da lista viva, então ela chega sozinha
     * quando o GET terminar — não há objeto para congelar aqui. */
    openViewById: (id: number) => setDialog({ mode: 'view', id }),
    /** view -> edit, preservando a entidade aberta. Nunca entra em edit sem
     * entidade — a guarda é a ENTIDADE, não o id. Guardando por id, um deep
     * link (`openViewById`) cujo GET ainda não voltou entrava em edit com
     * `entity` nula; quem segurava era cada página, checando `dialog.entity`
     * antes de renderizar o diálogo (review de 2026-08-04, Q-7). */
    startEdit: () => setDialog((d) => (d && entity ? { ...d, mode: 'edit' } : d)),
    close: () => setDialog(null),
  }
}
