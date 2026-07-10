import { useState } from 'react'
import type { ClientData } from '@shared/types/generated'
import { clientsApi } from '../api/clientsApi'
import type { ClientDialogMode } from './useClientForm'

export function useClientsPage() {
  const query = clientsApi.useList()
  const [dialog, setDialog] = useState<{ mode: ClientDialogMode; id: number | null } | null>(null)

  const clients = query.data ?? []

  // Ver nota em useRedatoresPage: derivar da lista, não congelar o objeto.
  const selected = dialog?.id != null ? (clients.find((c) => c.id === dialog.id) ?? null) : null

  return {
    clients,
    loading: query.isLoading,
    dialog: dialog ? { mode: dialog.mode, client: selected } : null,
    openCreate: () => setDialog({ mode: 'create', id: null }),
    openView: (client: ClientData) => setDialog({ mode: 'view', id: client.id ?? null }),
    /** view -> edit, preservando o cliente aberto. Nunca entra em edit sem cliente. */
    startEdit: () => setDialog((d) => (d && d.id != null ? { ...d, mode: 'edit' } : d)),
    close: () => setDialog(null),
  }
}
