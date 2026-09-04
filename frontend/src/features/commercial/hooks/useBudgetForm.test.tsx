import { describe, expect, it } from 'vitest'
import { renderHook } from '@testing-library/react'
import { createWrapper } from '@shared/testing/providers'
import { useBudgetForm } from './useBudgetForm'

/** A guarda de classificação do `useCrudForm` roda no render. Este teste existe
 * para o CI exercitar a config REAL do hook — sem ele, a guarda só dispararia
 * quando alguém abrisse o diálogo em dev. Mora na feature porque teste em
 * `shared/` importando `features/` quebraria a lei §5.6. */
const { wrapper } = createWrapper()

describe('useBudgetForm', () => {
  it('classifica toda chave do payload nos dois modos', () => {
    expect(() =>
      renderHook(() => useBudgetForm(null, 'create', () => undefined), { wrapper }),
    ).not.toThrow()

    expect(() =>
      renderHook(
        () =>
          useBudgetForm(
            { id: 1, client_id: 2, payment_terms: null } as never,
            'edit',
            () => undefined,
          ),
        { wrapper },
      ),
    ).not.toThrow()
  })
})
