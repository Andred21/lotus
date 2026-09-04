import { describe, expect, it } from 'vitest'
import { renderHook } from '@testing-library/react'
import { createWrapper } from '@shared/testing/providers'
import type { ClientData } from '@shared/types/generated'
import { useClientForm } from './useClientForm'

/** A guarda de classificação do `useCrudForm` roda no render. Este teste existe
 * para o CI exercitar a config REAL do hook — sem ele, a guarda só dispararia
 * quando alguém abrisse o diálogo em dev. Mora na feature porque teste em
 * `shared/` importando `features/` quebraria a lei §5.6. */
const { wrapper } = createWrapper()

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

  it('normaliza addresses/contacts undefined (Optional do backend) para array vazio', () => {
    // Formato real de uma resposta com `Optional` serializado: a chave chega
    // ausente/undefined, não `[]`. O fixture `EMPTY` acima sempre traz as duas
    // coleções como array e nunca exercitou o ramo direito do `?? []`.
    const semColecoes = {
      ...EMPTY,
      id: 1,
      addresses: undefined,
      contacts: undefined,
    } as unknown as ClientData

    const { result } = renderHook(
      () => useClientForm(semColecoes, 'edit', () => undefined),
      { wrapper },
    )

    expect(result.current.form.addresses).toEqual([])
    expect(result.current.form.contacts).toEqual([])
  })
})
