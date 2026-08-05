import { describe, expect, it } from 'vitest'
import { renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useRoleForm } from './useRoleForm'

/** A guarda de classificação do `useCrudForm` roda no render. Este teste existe
 * para o CI exercitar a config REAL do hook — sem ele, a guarda só dispararia
 * quando alguém abrisse o diálogo em dev. Mora na feature porque teste em
 * `shared/` importando `features/` quebraria a lei §5.6. */
function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

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
