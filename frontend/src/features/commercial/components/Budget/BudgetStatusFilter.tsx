import { useId } from 'react'
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
 *
 * O rótulo é a correção do UI-02 da run de Comercial (2026-08-25): o dropdown
 * expunha só o VALOR corrente ("Todos"), sem nome nenhum — nem visual, nem para
 * leitor de tela. É o mesmo achado que o UI-07 já tinha pago no irmão
 * `TurmaStatusFilter`, e o remédio é literalmente o dele: `useId` (e não uma
 * string fixa, que duplicaria em silêncio se a tela ganhasse uma segunda
 * tabela) e `inputId`, não `id` — o `AppDropdown` documenta por quê. A chave
 * `budget.status` já existe nas 3 locales, titulando a coluna ESTADO.
 */
export function BudgetStatusFilter({
  value,
  onChange,
}: {
  value: QuoteStatus | null
  onChange: (value: QuoteStatus | null) => void
}) {
  const { t } = useTranslation()
  const inputId = useId()

  const statusOptions = [
    { label: t('budget.filterAll'), value: null },
    ...STATUSES.map((s) => ({ label: t(`quoteStatus.${s}`), value: s })),
  ]

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label htmlFor={inputId} className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>
        {t('budget.status')}
      </label>
      <div className="w-48">
        <AppDropdown
          inputId={inputId}
          value={value}
          options={statusOptions}
          optionValue="value"
          onChange={(e) => onChange(e.value as QuoteStatus | null)}
        />
      </div>
    </div>
  )
}
