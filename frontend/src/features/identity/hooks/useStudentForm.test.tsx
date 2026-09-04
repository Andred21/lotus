import { describe, expect, it } from 'vitest'
import { renderHook } from '@testing-library/react'
import { createWrapper } from '@shared/testing/providers'
import { useStudentForm } from './useStudentForm'

/** A guarda de classificação do `useCrudForm` roda no render. Este teste existe
 * para o CI exercitar a config REAL do hook — sem ele, a guarda só dispararia
 * quando alguém abrisse o diálogo em dev. Mora na feature porque teste em
 * `shared/` importando `features/` quebraria a lei §5.6. */
const { wrapper } = createWrapper()

describe('useStudentForm', () => {
  it('classifica toda chave do payload nos dois modos', () => {
    expect(() =>
      renderHook(() => useStudentForm(null, 'create', () => undefined), { wrapper }),
    ).not.toThrow()

    expect(() =>
      renderHook(
        () =>
          useStudentForm(
            { id: 1, name: 'a', rut: '1-9', email: 'a@b.cl', phone: null, current_client_id: 2 } as never,
            'edit',
            () => undefined,
          ),
        { wrapper },
      ),
    ).not.toThrow()
  })
})
