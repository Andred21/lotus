import { describe, expect, it } from 'vitest'
import { renderHook } from '@testing-library/react'
import { createWrapper } from '@shared/testing/providers'
import { useRoleForm } from './useRoleForm'

/** A guarda de classificação do `useCrudForm` roda no render. Este teste existe
 * para o CI exercitar a config REAL do hook — sem ele, a guarda só dispararia
 * quando alguém abrisse o diálogo em dev. Mora na feature porque teste em
 * `shared/` importando `features/` quebraria a lei §5.6. */
const { wrapper } = createWrapper()

describe('useRoleForm', () => {
  it('classifica toda chave do payload nos dois modos', () => {
    expect(() =>
      renderHook(() => useRoleForm(null, 'create', () => undefined), { wrapper }),
    ).not.toThrow()

    expect(() =>
      renderHook(
        () => useRoleForm({ id: 1, name: 'admin', permissions: [] } as never, 'edit', () => undefined),
        { wrapper },
      ),
    ).not.toThrow()
  })
})
