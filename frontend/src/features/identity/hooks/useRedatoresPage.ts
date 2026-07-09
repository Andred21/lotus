import { useState } from 'react'
import type { RedatorData } from '@shared/types/generated'
import { redatoresApi } from '../api/redatoresApi'
import type { RedatorDialogMode } from './useRedatorForm'

export function useRedatoresPage() {
  const query = redatoresApi.useList()
  const [dialog, setDialog] = useState<{ mode: RedatorDialogMode; redator: RedatorData | null } | null>(null)

  return {
    redatores: query.data ?? [],
    loading: query.isLoading,
    dialog,
    openCreate: () => setDialog({ mode: 'create', redator: null }),
    openView: (redator: RedatorData) => setDialog({ mode: 'view', redator }),
    /** view -> edit, preservando o redator aberto. Nunca entra em edit sem redator. */
    startEdit: () => setDialog((d) => (d && d.redator ? { ...d, mode: 'edit' } : d)),
    close: () => setDialog(null),
  }
}
