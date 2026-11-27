import { describe, expect, it, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import {
  useCrudForm,
  unclassifiedPayloadKeys,
  classificationConflicts,
  forbiddenPayloadKeys,
  type MutableResource,
} from './useCrudForm'

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock('@shared/ui/AppToast', () => ({ useToast: () => toast }))

type Fields = { id?: number; name: string; secret: string }

const EMPTY: Fields = { id: undefined, name: '', secret: '' }

/** `MutableResource` é estrutural: este literal basta, sem TanStack — mesmo
 * padrão do `fakeResource` do `useCrudPage.test.ts`. Genérico em `T` (o tipo
 * da entidade criada/atualizada) porque `afterCreate` de alguns testes tipa o
 * `created` explicitamente — sem o genérico, `tsc -b` não unifica os dois
 * lados de `MutableResource<T>` (o `vitest` não pega, só o build). */
function fakeResource<T extends { id?: number } = { id?: number }>(
  spy: { create?: unknown[]; update?: unknown[] } = {},
): MutableResource<T> {
  return {
    useCreate: () => ({
      mutate: (payload: unknown, opts?: { onSuccess?: (created: T) => void }) => {
        spy.create?.push(payload)
        opts?.onSuccess?.({ id: 99 } as T)
      },
      isPending: false,
      error: null,
    }),
    useUpdate: () => ({
      mutate: (vars: unknown, opts?: { onSuccess?: (updated: T) => void }) => {
        spy.update?.push(vars)
        opts?.onSuccess?.({ id: 1 } as T)
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

describe('classificationConflicts', () => {
  it('não acusa nada quando as listas são disjuntas', () => {
    expect(classificationConflicts(['name'], ['phone'])).toEqual([])
  })

  it('acusa a chave declarada nas duas caixas', () => {
    // Declarar nas duas é contradição, não redundância: `mapped` diz que o
    // campo mostra o próprio erro, e o resumo mostra exatamente o que NÃO
    // está em `mapped`. A chave nas duas some do resumo por causa da
    // primeira lista e continua prometida pela segunda.
    expect(classificationConflicts(['name', 'phone'], ['phone'])).toEqual(['phone'])
  })

  it('devolve as duas em ordem estável', () => {
    expect(classificationConflicts(['b', 'a'], ['a', 'b'])).toEqual(['a', 'b'])
  })
})

describe('forbiddenPayloadKeys', () => {
  it('não acusa payload limpo', () => {
    expect(forbiddenPayloadKeys(['name', 'rut', 'email'])).toEqual([])
  })

  it('acusa `photo_url` no payload de escrita', () => {
    expect(forbiddenPayloadKeys(['name', 'photo_url'])).toEqual(['photo_url'])
  })
})

describe('useCrudForm — chave proibida', () => {
  it('lança mesmo quando a chave foi classificada, porque classificação não a salva', () => {
    expect(() =>
      renderHook(() =>
        useCrudForm(fakeResource(), {
          ...base,
          entity: null,
          mode: 'create' as const,
          toPayload: (f: Fields) => ({ name: f.name, secret: f.secret, photo_url: null }),
          // A chave está classificada: sem a guarda nova, isto passa.
          summaryOnly: ['secret', 'photo_url'],
        }),
      ),
    ).toThrow(/photo_url/)
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

  it('reprova config em que uma chave está em `mapped` e em `summaryOnly`', () => {
    expect(() =>
      renderHook(() =>
        useCrudForm(fakeResource(), {
          ...base,
          entity: null,
          mode: 'create',
          mapped: ['name', 'secret'],
          summaryOnly: ['secret'],
        }),
      ),
    ).toThrow(/secret/)
  })

  it('não reprova quando toda chave está classificada', () => {
    const { result } = renderHook(() =>
      useCrudForm(fakeResource(), { ...base, entity: null, mode: 'create' }).crud,
    )
    expect(result.current.readOnly).toBe(false)
  })

  it('`setForm` fica fora de `crud`, para nenhum spread levá-lo ao diálogo', () => {
    // Os hooks de feature devolvem `crud` inteiro (`return crud`,
    // `{ ...crud, toggle }`). `setForm` dentro dele chegaria aos 5 diálogos de
    // graça — manipular coleção nested é do hook, não do componente
    // (`.claude/rules/frontend-fsliced.md`). O `tsc` já reprova o acesso; esta
    // asserção é a que reprova se alguém devolver a chave de volta.
    const { result } = renderHook(() =>
      useCrudForm(fakeResource(), { ...base, entity: null, mode: 'create' }),
    )
    expect(Object.keys(result.current.crud)).not.toContain('setForm')
    expect(typeof result.current.setForm).toBe('function')
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
      }).crud,
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
      }).crud,
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

describe('useCrudForm — mutações extras', () => {
  const opts = (extra: { isPending: boolean; error: null }[]) => ({
    ...base,
    entity: null,
    mode: 'create' as const,
    extra,
  })

  it('soma o pending da mutação extra', () => {
    const { result } = renderHook(() =>
      useCrudForm(fakeResource(), opts([{ isPending: true, error: null }])),
    )
    expect(result.current.crud.pending).toBe(true)
  })

  it('não liga o pending quando nenhuma extra está pendente', () => {
    const { result } = renderHook(() =>
      useCrudForm(fakeResource(), opts([{ isPending: false, error: null }])),
    )
    expect(result.current.crud.pending).toBe(false)
  })

  it('mostra o 422 da mutação extra no fieldErrors', () => {
    const erroDaExtra = {
      type: 'about:blank', title: 'Unprocessable', status: 422, detail: '',
      instance: '/api/courses', errors: { redator_ids: ['inválido'] },
    }
    const { result } = renderHook(() =>
      useCrudForm(fakeResource(), {
        ...base,
        entity: null,
        mode: 'create' as const,
        extra: [{ isPending: false, error: erroDaExtra }],
      }),
    )
    expect(result.current.crud.fieldErrors?.redator_ids).toEqual(['inválido'])
  })
})

describe('useCrudForm — afterCreate retentável', () => {
  it('não recria a entidade no resubmit depois de o afterCreate reprovar', async () => {
    const spy: { create: unknown[] } = { create: [] }
    let deveFalhar = true
    const tentativas: number[] = []
    const done: string[] = []

    const { result } = renderHook(() =>
      useCrudForm(fakeResource(spy), {
        ...base,
        entity: null,
        mode: 'create' as const,
        onDone: () => done.push('done'),
        afterCreate: async (created: { id?: number }) => {
          tentativas.push(created.id as number)
          if (deveFalhar) throw new Error('segunda etapa reprovou')
        },
      }),
    )

    await act(async () => { result.current.crud.submit() })

    expect(spy.create).toHaveLength(1)
    expect(tentativas).toEqual([99])
    expect(done).toEqual([])   // afterCreate lançou: o diálogo NÃO fecha

    deveFalhar = false
    await act(async () => { result.current.crud.submit() })

    expect(spy.create).toHaveLength(1)          // <- o create NÃO se repete
    expect(tentativas).toEqual([99, 99])        // <- só a 2ª etapa re-tentou
    expect(done).toEqual(['done'])
  })

  it('fecha o diálogo quando o afterCreate passa de primeira', async () => {
    const done: string[] = []
    const { result } = renderHook(() =>
      useCrudForm(fakeResource(), {
        ...base,
        entity: null,
        mode: 'create' as const,
        onDone: () => done.push('done'),
        afterCreate: async () => undefined,
      }),
    )

    await act(async () => { result.current.crud.submit() })

    expect(done).toEqual(['done'])
  })
})

describe('useCrudForm — rascunho', () => {
  const create = () =>
    renderHook(() => useCrudForm(fakeResource(), { ...base, entity: null, mode: 'create' as const }).crud)

  it('nasce limpo e suja quando um campo muda', () => {
    const { result } = create()
    expect(result.current.dirty).toBe(false)

    act(() => result.current.set('name', 'Lotus'))

    expect(result.current.dirty).toBe(true)
  })

  it('desfazer a mudança à mão volta a limpo', () => {
    const { result } = create()

    act(() => result.current.set('name', 'Lotus'))
    act(() => result.current.set('name', ''))

    expect(result.current.dirty).toBe(false)
  })

  it('em edit, o limpo é a entidade, não o vazio', () => {
    const { result } = renderHook(() =>
      useCrudForm(fakeResource(), {
        ...base, entity: { id: 7, name: 'a', secret: '' }, mode: 'edit' as const,
      }).crud,
    )
    expect(result.current.dirty).toBe(false)

    act(() => result.current.set('name', 'b'))
    expect(result.current.dirty).toBe(true)

    act(() => result.current.set('name', 'a'))
    expect(result.current.dirty).toBe(false)
  })

  it('o reset (outra entidade) volta a limpo', () => {
    const { result, rerender } = renderHook(
      ({ id }: { id: number }) =>
        useCrudForm(fakeResource(), {
          ...base, entity: { id, name: 'a', secret: '' }, mode: 'edit' as const,
        }).crud,
      { initialProps: { id: 1 } },
    )
    act(() => result.current.set('name', 'sujo'))
    expect(result.current.dirty).toBe(true)

    rerender({ id: 2 })

    expect(result.current.dirty).toBe(false)
  })

  it('a guarda só pergunta com rascunho: limpo segue direto, sujo abre o aviso', () => {
    const { result } = create()
    const seguir = vi.fn()

    act(() => result.current.guard.confirmDiscard(seguir))
    expect(seguir).toHaveBeenCalledTimes(1)
    expect(result.current.guard.dialogProps.visible).toBe(false)

    act(() => result.current.set('name', 'Lotus'))
    act(() => result.current.guard.confirmDiscard(seguir))
    expect(seguir).toHaveBeenCalledTimes(1)
    expect(result.current.guard.dialogProps.visible).toBe(true)

    act(() => result.current.guard.dialogProps.onConfirm())
    expect(seguir).toHaveBeenCalledTimes(2)
  })
})

describe('useCrudForm — erro some ao corrigir', () => {
  const problema = (errors: Record<string, string[]>) => ({
    type: 'about:blank', title: 'Unprocessable', status: 422, detail: '',
    instance: '/api/x', errors,
  })
  const comErro = (error: ReturnType<typeof problema>): MutableResource<{ id?: number }> => ({
    useCreate: () => ({ mutate: () => undefined, isPending: false, error }),
    useUpdate: () => ({ mutate: () => undefined, isPending: false, error: null }),
  })
  const opts = {
    ...base,
    entity: null,
    mode: 'create' as const,
    mapped: ['name', 'secret'],
    summaryOnly: [],
  }

  it('editar o campo limpa o erro 422 dele e só dele', () => {
    const erro = problema({ name: ['obrigatório'], secret: ['curto'] })
    const { result } = renderHook(() => useCrudForm(comErro(erro), opts))
    expect(result.current.crud.fieldErrors?.name).toEqual(['obrigatório'])

    act(() => result.current.crud.set('name', 'Lotus'))

    expect(result.current.crud.fieldErrors?.name).toBeUndefined()
    expect(result.current.crud.fieldErrors?.secret).toEqual(['curto'])
  })

  it('um 422 novo (outro envio) volta a mostrar o erro do campo já editado', () => {
    let erro = problema({ name: ['obrigatório'] })
    const { result, rerender } = renderHook(() => useCrudForm(comErro(erro), opts))
    act(() => result.current.crud.set('name', 'Lotus'))
    expect(result.current.crud.fieldErrors?.name).toBeUndefined()

    erro = problema({ name: ['já existe'] })
    rerender()

    expect(result.current.crud.fieldErrors?.name).toEqual(['já existe'])
  })

  it('o erro geral (sem mapa por campo) não some ao editar', () => {
    const erro = { type: 'about:blank', title: 'x', status: 500, detail: 'Falha', instance: '/api/x' }
    const { result } = renderHook(() => useCrudForm(comErro(erro as never), opts))

    act(() => result.current.crud.set('name', 'Lotus'))

    expect(result.current.crud.generalError).toBe('Falha')
  })
})

describe('useCrudForm — clearField exposto', () => {
  it('crud.clearField limpa a chave exata (edição aninhada, que não passa pelo `set`)', () => {
    const erro = {
      type: 'about:blank', title: 'x', status: 422, detail: '', instance: '/api/x',
      errors: { 'modules.0.name': ['obrigatório'], 'modules.1.name': ['obrigatório'] },
    }
    const recurso: MutableResource<{ id?: number }> = {
      useCreate: () => ({ mutate: () => undefined, isPending: false, error: erro }),
      useUpdate: () => ({ mutate: () => undefined, isPending: false, error: null }),
    }
    const { result } = renderHook(() =>
      useCrudForm(recurso, { ...base, entity: null, mode: 'create' as const, excludePrefixes: ['modules.'] }),
    )

    act(() => result.current.crud.clearField('modules.0.name'))

    expect(result.current.crud.fieldErrors?.['modules.0.name']).toBeUndefined()
    expect(result.current.crud.fieldErrors?.['modules.1.name']).toEqual(['obrigatório'])
  })
})

describe('useCrudForm — sucesso dito (C-5)', () => {
  it('criar e editar mostram toast de sucesso', async () => {
    toast.success.mockClear()
    const criar = renderHook(() =>
      useCrudForm(fakeResource(), { ...base, entity: null, mode: 'create' }).crud,
    )
    await act(async () => {
      criar.result.current.submit()
    })
    expect(toast.success).toHaveBeenCalledTimes(1)
    expect(toast.success).toHaveBeenLastCalledWith('common.createdToast')

    const editar = renderHook(() =>
      useCrudForm(fakeResource(), { ...base, entity: { id: 7, name: 'a', secret: '' }, mode: 'edit' }).crud,
    )
    await act(async () => {
      editar.result.current.submit()
    })
    expect(toast.success).toHaveBeenCalledTimes(2)
    expect(toast.success).toHaveBeenLastCalledWith('common.updatedToast')
  })

  it('criar que falha no afterCreate não diz sucesso; o resubmit que fecha diz uma vez', async () => {
    toast.success.mockClear()
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    let falhar = true
    const { result } = renderHook(() =>
      useCrudForm(fakeResource(), {
        ...base,
        entity: null,
        mode: 'create',
        afterCreate: async () => {
          if (falhar) throw new Error('sync falhou')
        },
      }).crud,
    )
    await act(async () => {
      result.current.submit()
    })
    expect(toast.success).not.toHaveBeenCalled()

    falhar = false
    await act(async () => {
      result.current.submit()
    })
    expect(toast.success).toHaveBeenCalledTimes(1)
  })
})
