import { useTranslation } from 'react-i18next'
import { CrudDialog, AppInputText, AppDropdown, FormField, FormErrorSummary, FormErrorBanner, InlineLoadState } from '@shared/ui'
import type { BudgetData } from '@shared/types/generated'
import { useBudgetForm, type BudgetDialogMode } from '../../hooks/useBudgetForm'
import { useCommercialClients } from '../../hooks/useCommercialClients'

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
  const { form, set, readOnly, submit, pending, fieldErrors, generalError, errorSummary } = useBudgetForm(
    budget, mode, onHide, onCreated,
  )
  const clients = useCommercialClients()

  const isCreate = mode === 'create'

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
      <FormErrorSummary errors={fieldErrors} {...errorSummary} />

      <section className="space-y-4">
        {isCreate && (
          <p
            className="rounded px-3 py-2 text-sm"
            style={{ background: 'var(--surface-ground)', color: 'var(--text-color-secondary)' }}
          >
            {t('budget.createHint')}
          </p>
        )}

        {/* Cliente é imutável depois de criado: o backend só deixa
            payment_terms mudar. Fora do `create` o campo é texto — dropdown
            desabilitado cortava a razão social, que é o valor mais longo do
            diálogo (review do BD-3, Q-1). O `value` mostra o RÓTULO, nunca o
            id. */}
        <FormField
          label={t('budget.client')}
          error={fieldErrors?.client_id?.[0]}
          readOnly={readOnly || !isCreate}
          value={clients.clientOptions.find((o) => o.value === form.client_id)?.label ?? ''}
        >
          <AppDropdown
            value={form.client_id}
            options={clients.clientOptions}
            disabled={clients.unusable}
            onChange={(e) => set('client_id', e.value as number)}
          />
          {/* Dropdown vazio sem explicação é o disfarce do BD-6: quem não
           * consegue listar clientes precisa LER o motivo e poder reintentar,
           * em vez de concluir que não há cliente cadastrado. */}
          <InlineLoadState
            error={clients.isError ? (clients.errorDetail ?? t('common.loadErrorHint')) : null}
            emptyHint={clients.isEmpty ? t('budget.noClientsAvailable') : null}
            retryLabel={t('common.retry')}
            onRetry={clients.refetch}
          />
        </FormField>

        <FormField
          label={t('budget.paymentTerms')}
          error={fieldErrors?.payment_terms?.[0]}
          readOnly={readOnly}
          value={form.payment_terms ?? ''}
        >
          <AppInputText
            value={form.payment_terms ?? ''}
            onChange={(e) => set('payment_terms', e.target.value)}
            className="w-full"
          />
        </FormField>
      </section>
    </CrudDialog>
  )
}
