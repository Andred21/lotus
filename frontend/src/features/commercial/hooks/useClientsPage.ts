import { useState } from 'react'
import type { ClientData } from '@shared/types/generated'
import { clientsApi } from '../api/clientsApi'
import type { ClientDialogMode } from './useClientForm'

export function useClientsPage() {
  const query = clientsApi.useList()
  const [dialog, setDialog] = useState<{ mode: ClientDialogMode; client: ClientData | null } | null>(null)

  return {
    clients: query.data ?? [],
    loading: query.isLoading,
    dialog,
    openCreate: () => setDialog({ mode: 'create', client: null }),
    openView: (client: ClientData) => setDialog({ mode: 'view', client }),
    /** view -> edit, preservando o cliente aberto. Nunca entra em edit sem cliente. */
    startEdit: () => setDialog((d) => (d && d.client ? { ...d, mode: 'edit' } : d)),
    close: () => setDialog(null),
  }
}
