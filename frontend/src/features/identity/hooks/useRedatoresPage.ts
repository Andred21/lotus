import { useState } from 'react'
import type { RedatorData } from '@shared/types/generated'
import { redatoresApi } from '../api/redatoresApi'
import type { RedatorDialogMode } from './useRedatorForm'

export function useRedatoresPage() {
  const query = redatoresApi.useList()
  const [dialog, setDialog] = useState<{ mode: RedatorDialogMode; id: number | null } | null>(null)

  const redatores = query.data ?? []

  // Deriva a entidade aberta da lista viva em vez de congelar o objeto no
  // estado: subir ou remover um documento invalida a query, a lista é
  // refetchada, e o dialog passa a ver a versão nova. Guardar o objeto fazia o
  // dialog ficar com um snapshot obsoleto até ser fechado e reaberto.
  const selected = dialog?.id != null ? (redatores.find((r) => r.id === dialog.id) ?? null) : null

  return {
    redatores,
    loading: query.isLoading,
    dialog: dialog ? { mode: dialog.mode, redator: selected } : null,
    openCreate: () => setDialog({ mode: 'create', id: null }),
    openView: (redator: RedatorData) => setDialog({ mode: 'view', id: redator.id ?? null }),
    /** view -> edit, preservando o redator aberto. Nunca entra em edit sem redator. */
    startEdit: () => setDialog((d) => (d && d.id != null ? { ...d, mode: 'edit' } : d)),
    close: () => setDialog(null),
  }
}
