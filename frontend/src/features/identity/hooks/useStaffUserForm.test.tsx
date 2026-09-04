import { describe, expect, it } from 'vitest'
import { renderHook } from '@testing-library/react'
import { createWrapper } from '@shared/testing/providers'
import { useStaffUserForm } from './useStaffUserForm'

/** A guarda de classificação do `useCrudForm` roda no render. Este teste existe
 * para o CI exercitar a config REAL do hook — sem ele, a guarda só dispararia
 * quando alguém abrisse o diálogo em dev. Mora na feature porque teste em
 * `shared/` importando `features/` quebraria a lei §5.6. */
const { wrapper } = createWrapper()

describe('useStaffUserForm', () => {
  it('classifica toda chave do payload nos dois modos', () => {
    expect(() =>
      renderHook(() => useStaffUserForm(null, 'create', () => undefined), { wrapper }),
    ).not.toThrow()

    expect(() =>
      renderHook(
        () =>
          useStaffUserForm(
            { id: 1, name: 'a', email: 'a@b.cl', role: 'admin', is_active: true, rut: null, phone: null } as never,
            'edit',
            () => undefined,
          ),
        { wrapper },
      ),
    ).not.toThrow()
  })
})
