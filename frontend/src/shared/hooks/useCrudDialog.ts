import { useState } from 'react'
import type { DialogMode } from '@shared/lib'

/** O `useOne` de um recurso (`createCrudResource().useOne`), por estrutura.
 * `undefined` = não busque — é o que a fábrica já faz com `enabled: id != null`. */
export type OneResource<T> = (id: number | undefined) => { data?: T | undefined }

/** O fallback quando o recurso não tem `useOne`: hook que não busca nada. Existe
 * para o hook de baixo poder chamar UM hook, sempre, em vez de `useOne?.()` —
 * chamada condicional de hook, que o `rules-of-hooks` reprova com razão. */
function useSemFallback(): { data?: undefined } {
  return {}
}

/**
 * O dialog unificado de uma página CRUD, por ID (nunca por objeto — a
 * entidade é derivada a cada render, então uma invalidação chega ao dialog
 * aberto; era o bug que a task 4.2.2 escondeu).
 *
 * Extraído de `useCrudPage` quando a lista de alunos passou a vir do
 * `useServerTable`: com página, a entidade do `openViewById` (deep link) e a
 * de um "Ver" que ficou fora da página atual não estão em `items` — o
 * fallback `useOne(id)` (spec D14) é o que a busca. `useOne` tem de ser
 * ESTÁVEL entre renders (função do recurso, não seta inline): ele é chamado
 * como hook.
 */
export function useCrudDialog<T extends { id?: number }>(items: T[], useOne?: OneResource<T>) {
  const [dialog, setDialog] = useState<{ mode: DialogMode; id: number | null } | null>(null)

  const naLista = dialog?.id != null ? (items.find((i) => i.id === dialog.id) ?? null) : null
  const useFallback = useOne ?? useSemFallback
  const fallback = useFallback(dialog?.id != null && naLista === null ? dialog.id : undefined)
  const entity = naLista ?? fallback.data ?? null

  return {
    dialog: dialog ? { mode: dialog.mode, entity } : null,
    openCreate: () => setDialog({ mode: 'create', id: null }),
    openView: (item: T) => setDialog({ mode: 'view', id: item.id ?? null }),
    /** Abre `view` a partir de um id solto (deep link vindo de outro módulo). */
    openViewById: (id: number) => setDialog({ mode: 'view', id }),
    /** view -> edit, preservando a entidade aberta. A guarda é a ENTIDADE, não
     * o id (review de 2026-08-04, Q-7). */
    startEdit: () => setDialog((d) => (d && entity ? { ...d, mode: 'edit' } : d)),
    close: () => setDialog(null),
  }
}
