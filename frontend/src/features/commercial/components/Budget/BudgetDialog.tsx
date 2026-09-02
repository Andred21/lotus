import { useTranslation } from 'react-i18next'
import { CrudDialog, AppInputText, AppDropdown, FormErrorSummary, FormErrorBanner, InlineLoadState, useFormField } from '@shared/ui'
import { loadMessage } from '@shared/lib'
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
  const f = useBudgetForm(budget, mode, onHide, onCreated)
  const { form, readOnly, submit, pending, fieldErrors, generalError, errorSummary } = f
  const Field = useFormField(f)
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
      // Sem lista utilizável não há `client_id` para escolher, e o create sai com
      // o `0` do form vazio — POST inválido por construção, respondido com 422.
      // O gêmeo `StudentDialog` já gateava assim, e o `disabled` do `CrudDialog`
      // documenta exatamente este caso (review do BD-6, Q-4). Em `edit` o cliente
      // é imutável e nem entra na conta.
      disabled={isCreate && clients.unusable}
      submitLabel={isCreate ? t('budget.create') : undefined}
    >
      <FormErrorBanner message={generalError} />
      <FormErrorSummary errors={fieldErrors} {...errorSummary} />

      <section className="space-y-4">
        {isCreate && (
          <p
            className="rounded-control px-3 py-2 text-sm"
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
        {/* client_id colapsa no dropdown (emite `number`, `set` aceita), mas o
            `Field` sozinho não decide O QUE mostrar em leitura nem QUANDO ler:
            imutável fora do `create` é regra desta tela, não do form, e o
            rótulo em leitura precisa do vocabulário de domínio (a opção cujo
            `value` casa com `form.client_id`) — por isso `readOnly` e `value`
            continuam explícitos aqui (item 24, spec §5). */}
        {/* eslint-disable-next-line react-hooks/static-components -- Field é o retorno estável de useFormField (§4.2 da spec) */}
        <Field
          name="client_id"
          label={t('budget.client')}
          readOnly={readOnly || !isCreate}
          value={clients.clientOptions.find((o) => o.value === form.client_id)?.label ?? ''}
        >
          {/* `loading` é o que impede o desabilitado de virar controle morto sem
           * explicação enquanto o GET está em voo: o `InlineLoadState` abaixo é
           * mudo nesse estado (não há erro nem lista vazia ainda), e o passo 1 do
           * wizard, no mesmo bloco, já mostra esqueleto (review do BD-6, Q-3). */}
          <AppDropdown
            options={clients.clientOptions}
            disabled={clients.unusable}
            loading={clients.isLoading}
            aria-busy={clients.isLoading}
          />
          {/* Dropdown vazio sem explicação é o disfarce do BD-6: quem não
           * consegue listar clientes precisa LER o motivo e poder reintentar,
           * em vez de concluir que não há cliente cadastrado. */}
          <InlineLoadState
            error={clients.isError ? loadMessage(clients, t) : null}
            emptyHint={clients.isEmpty ? t('budget.noClientsAvailable') : null}
            retryLabel={t('common.retry')}
            onRetry={clients.refetch}
          />
        </Field>

        {/* eslint-disable-next-line react-hooks/static-components -- Field é o retorno estável de useFormField (§4.2 da spec) */}
        <Field name="payment_terms" label={t('budget.paymentTerms')}>
          <AppInputText className="w-full" />
        </Field>
      </section>
    </CrudDialog>
  )
}
