import { useTranslation } from 'react-i18next'
import { CrudDialog, AppInputText, AppDropdown, FormField, FormErrorSummary, FormErrorBanner } from '@shared/ui'
import type { BudgetData } from '@shared/types/generated'
import { clientsApi } from '@shared/api/clientsApi'
import { useBudgetForm, type BudgetDialogMode } from '../../hooks/useBudgetForm'

export function BudgetDialog({
  visible, mode, budget, onHide, onCreated,
}: {
  visible: boolean
  mode: BudgetDialogMode
  budget: BudgetData | null
  onHide: () => void
  /** Chamado com o orçamento recém-criado. Só a tela de lista o usa (para
   * seguir até o detalhe); em `edit` o dialog já vive dentro do detalhe. */
  onCreated?: (created: BudgetData) => void
}) {
  const { t } = useTranslation()
  const { form, set, readOnly, submit, pending, fieldErrors, generalError } = useBudgetForm(
    budget, mode, onHide, onCreated,
  )
  const clients = clientsApi.useList()

  const isCreate = mode === 'create'
  const clientOptions = (clients.data ?? []).map((c) => ({ label: c.legal_name, value: c.id }))

  return (
    <CrudDialog
      visible={visible}
      mode={mode}
      title={isCreate ? t('budget.new') : (budget?.code ?? '')}
      onHide={onHide}
      onSubmit={submit}
      pending={pending}
      submitLabel={isCreate ? t('budget.create') : undefined}
    >
      <FormErrorBanner message={generalError} />
      <FormErrorSummary errors={fieldErrors} mapped={['client_id', 'payment_terms']} />

      <section className="space-y-4">
        {isCreate && (
          <p className="rounded bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {t('budget.createHint')}
          </p>
        )}

        <FormField label={t('budget.client')} error={fieldErrors?.client_id?.[0]}>
          {/* Cliente é imutável depois de criado: o backend só deixa payment_terms mudar. */}
          <AppDropdown
            value={form.client_id}
            options={clientOptions}
            disabled={readOnly || !isCreate}
            onChange={(e) => set('client_id', e.value as number)}
          />
        </FormField>

        <FormField label={t('budget.paymentTerms')} error={fieldErrors?.payment_terms?.[0]}>
          <AppInputText
            value={form.payment_terms ?? ''}
            disabled={readOnly}
            onChange={(e) => set('payment_terms', e.target.value)}
            className="w-full"
          />
        </FormField>
      </section>
    </CrudDialog>
  )
}
