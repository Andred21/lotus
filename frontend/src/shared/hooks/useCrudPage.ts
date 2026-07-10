import { useState } from 'react'
import type { DialogMode } from '@shared/lib'

/** Contrato mínimo que `createCrudResource<T>` satisfaz. Tipado por estrutura
 * para o hook não depender da fábrica inteira. */
interface ListableResource<T> {
  useList: () => { data?: T[]; isLoading: boolean }
}

/**
 * Estado de uma página de módulo CRUD: a lista e o dialog unificado.
 *
 * O dialog guarda o **id**, não o objeto. A entidade é derivada de `items` a cada
 * render, então uma invalidação de query (upload de documento, edição de nested)
 * chega ao dialog aberto. Guardar o objeto congelava um snapshot obsoleto — foi
 * exatamente esse o bug que a task 4.2.2 escondeu.
 */
export function useCrudPage<T extends { id?: number }>(resource: ListableResource<T>) {
  const query = resource.useList()
  const [dialog, setDialog] = useState<{ mode: DialogMode; id: number | null } | null>(null)

  const items = query.data ?? []
  const entity = dialog?.id != null ? (items.find((i) => i.id === dialog.id) ?? null) : null

  return {
    items,
    loading: query.isLoading,
    dialog: dialog ? { mode: dialog.mode, entity } : null,
    openCreate: () => setDialog({ mode: 'create', id: null }),
    openView: (item: T) => setDialog({ mode: 'view', id: item.id ?? null }),
    /** view -> edit, preservando a entidade aberta. Nunca entra em edit sem entidade. */
    startEdit: () => setDialog((d) => (d && d.id != null ? { ...d, mode: 'edit' } : d)),
    close: () => setDialog(null),
  }
}
