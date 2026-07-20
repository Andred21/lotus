import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { FileUploadHandlerEvent } from '@shared/ui'
import { usePermissions, useMutationErrors } from '@shared/hooks'
import { budgetsApi } from '@shared/api/budgetsApi'
import { clientsApi } from '@shared/api/clientsApi'
import type { QuoteData } from '@shared/types/generated'
import { useApproveQuote, useRejectQuote, useRemoveQuote } from '../api/useQuotes'
import { useUploadBudgetFile, useRemoveBudgetFile, type BudgetFileType } from '../api/useCommercialFiles'

type ConfirmAction = 'approve' | 'reject' | 'remove'

/** Toda a orquestração da página de detalhe do orçamento. O componente só
 * consome e renderiza (rule: componente de feature = declarativo). */
export function useBudgetDetail(budgetId: number) {
  const navigate = useNavigate()
  const query = budgetsApi.useOne(budgetId)
  const clients = clientsApi.useList()
  const budget = query.data
  const client = budget ? clients.data?.find((c) => c.id === budget.client_id) : undefined

  const [editing, setEditing] = useState(false)
  // null = fechado; { quote: null } = criar; { quote } = editar.
  const [wizard, setWizard] = useState<{ quote: QuoteData | null } | null>(null)
  const [confirm, setConfirm] = useState<{ action: ConfirmAction; quote: QuoteData } | null>(null)
  const [confirmDeleteBudget, setConfirmDeleteBudget] = useState(false)
  const [fileType, setFileType] = useState<BudgetFileType>('invoice')

  const { can } = usePermissions()
  const canApprove = can('commercial.quote.approve')

  const approve = useApproveQuote()
  const reject = useRejectQuote()
  const removeQuote = useRemoveQuote()
  const removeBudget = budgetsApi.useRemove()
  const uploadFile = useUploadBudgetFile()
  const removeFile = useRemoveBudgetFile()

  // `message` (não `generalError`): estes 422 vêm por campo (errors.status =
  // "cotação aprovada não pode ser excluída") e não há input onde pendurá-los.
  const { message: confirmError } = useMutationErrors([approve.error, reject.error, removeQuote.error])
  const { message: removeBudgetError } = useMutationErrors([removeBudget.error])
  const { message: fileError } = useMutationErrors([uploadFile.error, removeFile.error])

  // e.options.clear() devolve o AppFileUpload ao estado vazio depois do envio.
  const handleUpload = (e: FileUploadHandlerEvent) => {
    const file = e.files[0]
    if (!file) return
    uploadFile.mutate({ budgetId, type: fileType, file }, { onSuccess: () => e.options.clear() })
  }

  // Reseta o erro da tentativa anterior: sem isso, reabrir o dialog para outra
  // cotação mostraria um erro fantasma de uma tentativa que nunca ocorreu para ela
  // (approve/reject/removeQuote vivem no hook, não são remontados a cada abertura).
  const closeConfirm = () => {
    approve.reset()
    reject.reset()
    removeQuote.reset()
    setConfirm(null)
  }

  const runConfirm = () => {
    if (!confirm) return
    const mutation = confirm.action === 'approve' ? approve : confirm.action === 'reject' ? reject : removeQuote
    mutation.mutate(confirm.quote.id!, { onSuccess: () => setConfirm(null) })
  }

  const closeDeleteBudget = () => {
    removeBudget.reset()
    setConfirmDeleteBudget(false)
  }

  // Sucesso navega para fora da página do orçamento excluído.
  const deleteBudget = () => removeBudget.mutate(budgetId, { onSuccess: () => navigate('/comercial') })

  return {
    loading: query.isLoading,
    budget,
    client,
    canApprove,
    editing,
    openEdit: () => setEditing(true),
    closeEdit: () => setEditing(false),
    wizard,
    openWizard: (quote: QuoteData | null) => setWizard({ quote }),
    closeWizard: () => setWizard(null),
    confirm,
    askConfirm: (action: ConfirmAction, quote: QuoteData) => setConfirm({ action, quote }),
    closeConfirm,
    runConfirm,
    confirmPending: approve.isPending || reject.isPending || removeQuote.isPending,
    confirmError,
    confirmDeleteBudget,
    askDeleteBudget: () => setConfirmDeleteBudget(true),
    closeDeleteBudget,
    deleteBudget,
    removeBudgetPending: removeBudget.isPending,
    removeBudgetError,
    fileType,
    setFileType,
    handleUpload,
    uploadPending: uploadFile.isPending,
    removeFile: (fileId: number) => removeFile.mutate({ budgetId, fileId }),
    fileError,
    goBack: () => navigate('/comercial'),
  }
}
