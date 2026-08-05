import { describe, expect, it } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCrudForm, unclassifiedPayloadKeys } from './useCrudForm'

type Fields = { id?: number; name: string; secret: string }

const EMPTY: Fields = { id: undefined, name: '', secret: '' }

/** `MutableResource` é estrutural: este literal basta, sem TanStack — mesmo
 * padrão do `fakeResource` do `useCrudPage.test.ts`. */
function fakeResource(spy: { create?: unknown[]; update?: unknown[] } = {}) {
  return {
    useCreate: () => ({
      mutate: (payload: unknown, opts?: { onSuccess?: (created: unknown) => void }) => {
        spy.create?.push(payload)
        opts?.onSuccess?.({ id: 99 })
      },
      isPending: false,
      error: null,
    }),
    useUpdate: () => ({
      mutate: (vars: unknown, opts?: { onSuccess?: (updated: unknown) => void }) => {
        spy.update?.push(vars)
        opts?.onSuccess?.({ id: 1 })
      },
      isPending: false,
      error: null,
    }),
  }
}

const base = {
  empty: EMPTY,
  toPayload: (f: Fields) => ({ name: f.name, secret: f.secret }),
  mapped: ['name'],
  summaryOnly: ['secret'],
  onDone: () => undefined,
}

describe('unclassifiedPayloadKeys', () => {
  it('aceita chave em qualquer uma das três caixas', () => {
    expect(unclassifiedPayloadKeys(['a', 'b', 'c.0.x'], ['a'], ['b'], ['c.'])).toEqual([])
  })

  it('acusa a chave que ninguém classificou', () => {
    expect(unclassifiedPayloadKeys(['a', 'novo'], ['a'], [], [])).toEqual(['novo'])
  })

  it('prefixo casa só com o ponto: `contacts` não é `contacts.`', () => {
    // O payload do cliente manda a chave `contacts` (a lista inteira) além de
    // `contacts.0.name`; um 422 na lista é mostrado pelo resumo, então ela
    // precisa de classificação própria.
    expect(unclassifiedPayloadKeys(['contacts'], [], [], ['contacts.'])).toEqual(['contacts'])
  })
})

describe('useCrudForm', () => {
  it('reprova config em que uma chave de payload não foi classificada', () => {
    expect(() =>
      renderHook(() =>
        useCrudForm(fakeResource(), { ...base, entity: null, mode: 'create', summaryOnly: [] }),
      ),
    ).toThrow(/secret/)
  })

  it('não reprova quando toda chave está classificada', () => {
    const { result } = renderHook(() =>
      useCrudForm(fakeResource(), { ...base, entity: null, mode: 'create' }),
    )
    expect(result.current.readOnly).toBe(false)
  })

  it('o create manda o payload do modo create e aguarda o afterCreate antes do onDone', async () => {
    const ordem: string[] = []
    const enviados: unknown[] = []

    const { result } = renderHook(() =>
      useCrudForm(fakeResource({ create: enviados }), {
        ...base,
        entity: null,
        mode: 'create',
        afterCreate: async () => {
          ordem.push('afterCreate')
        },
        onDone: () => ordem.push('onDone'),
      }),
    )

    await act(async () => {
      result.current.set('name', 'Lotus')
    })
    await act(async () => {
      result.current.submit()
    })

    expect(enviados).toEqual([{ name: 'Lotus', secret: '' }])
    expect(ordem).toEqual(['afterCreate', 'onDone'])
  })

  it('o update usa o id da ENTIDADE, nunca o do form', async () => {
    const enviados: unknown[] = []

    const { result } = renderHook(() =>
      useCrudForm(fakeResource({ update: enviados }), {
        ...base,
        entity: { id: 7, name: 'a', secret: '' },
        mode: 'edit',
      }),
    )

    // O form carrega o id copiado; sujá-lo não pode mudar o alvo do PUT.
    await act(async () => {
      result.current.set('id', 999)
    })
    await act(async () => {
      result.current.submit()
    })

    expect(enviados).toEqual([{ id: 7, payload: { name: 'a', secret: '' } }])
  })

  it('toPayload recebe o modo', () => {
    const visto: string[] = []
    renderHook(() =>
      useCrudForm(fakeResource(), {
        ...base,
        entity: null,
        mode: 'create',
        toPayload: (f: Fields, mode: string) => {
          visto.push(mode)
          return { name: f.name, secret: f.secret }
        },
      }),
    )
    expect(visto).toContain('create')
    expect(visto).toContain('edit')
  })
})
