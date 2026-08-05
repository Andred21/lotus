import { describe, expect, it } from 'vitest'
import { renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { ClientData } from '@shared/types/generated'
import { useClientForm } from './useClientForm'

/** A guarda de classificação do `useCrudForm` roda no render. Este teste existe
 * para o CI exercitar a config REAL do hook — sem ele, a guarda só dispararia
 * quando alguém abrisse o diálogo em dev. Mora na feature porque teste em
 * `shared/` importando `features/` quebraria a lei §5.6. */
function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

// Mesmo shape do `EMPTY` privado em `useClientForm.ts` — reconstruído aqui
// porque o hook não o exporta.
const EMPTY: ClientData = {
  id: undefined, name: '', rut: '', email: '', phone: null,
  legal_name: '', type: 'client', business_activity: null,
  photo_url: null,
  addresses: [{
    id: undefined, line1: null, line2: null, number: null, commune: null,
    city: null, region: null, zip_code: null, is_primary: true,
  }],
  contacts: [{
    id: undefined, name: '', job_title: null, email: null, phone: null, is_primary: true,
  }],
}

describe('useClientForm', () => {
  it('classifica toda chave do payload nos dois modos', () => {
    expect(() =>
      renderHook(() => useClientForm(null, 'create', () => undefined), { wrapper }),
    ).not.toThrow()

    expect(() =>
      renderHook(
        () => useClientForm({ ...EMPTY, id: 1 } as never, 'edit', () => undefined),
        { wrapper },
      ),
    ).not.toThrow()
  })
})
