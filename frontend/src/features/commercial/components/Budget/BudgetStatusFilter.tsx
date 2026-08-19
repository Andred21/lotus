import { useTranslation } from 'react-i18next'
import { AppDropdown } from '@shared/ui'
import type { QuoteStatus } from '@shared/types/generated'

const STATUSES: QuoteStatus[] = ['pending', 'approved', 'rejected']

/**
 * Filtro de status da tabela de orçamentos. Extraído da `BudgetsTable` pela
 * mesma razão do `BudgetRowActions`: a régua de 150 linhas de
 * `features/<x>/components/` vale sem exceção (max-lines, sem `ignores`), e
 * este bloco é coeso — opções e dropdown não têm razão para morar em outro
 * lugar. Mesmo remédio do `ClientRowActions` do bloco anterior: extração, não
 * reformatação.
 *
 * Props ESTRUTURAIS de propósito: valor atual e callback de troca, nada de
 * `resetPage`/`setStatus` cruzando a fronteira — quem sabe da página é
 * `BudgetsTable`, este componente só sabe do dropdown.
 */
export function BudgetStatusFilter({
  value,
  onChange,
}: {
  value: QuoteStatus | null
  onChange: (value: QuoteStatus | null) => void
}) {
  const { t } = useTranslation()

  const statusOptions = [
    { label: t('budget.filterAll'), value: null },
    ...STATUSES.map((s) => ({ label: t(`quoteStatus.${s}`), value: s })),
  ]

  return (
    <div className="w-48">
      <AppDropdown
        value={value}
        options={statusOptions}
        optionValue="value"
        onChange={(e) => onChange(e.value as QuoteStatus | null)}
      />
    </div>
  )
}
