import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { createWrapper } from '@shared/testing/providers'
import { useCrudFormWithPhoto } from './useCrudFormWithPhoto'

const upload = vi.fn<(id: number, file: File) => Promise<void>>()
const remove = vi.fn<(id: number) => Promise<void>>()

vi.mock('@shared/api/photoResource', () => ({
  photoResource: () => ({ upload, remove }),
}))

/** Client POR TESTE, não por arquivo: o hook consulta uma `useQuery`, e um
 * client de módulo faria os casos herdarem cache um do outro (Q-1 do review de
 * 2026-09-04). */
let wrapper: ReturnType<typeof createWrapper>['wrapper']

type Fields = { id?: number; name: string }

const criados: unknown[] = []

function fakeResource() {
  return {
    useCreate: () => ({
      mutate: (payload: unknown, opts?: { onSuccess?: (created: { id: number }) => void }) => {
        criados.push(payload)
        opts?.onSuccess?.({ id: 99 })
      },
      isPending: false,
      error: null,
    }),
    useUpdate: () => ({
      mutate: (_vars: unknown, opts?: { onSuccess?: (updated: { id: number }) => void }) => {
        opts?.onSuccess?.({ id: 1 })
      },
      isPending: false,
      error: null,
    }),
  }
}

function montar(mode: 'create' | 'edit' | 'view', onDone: () => void = () => undefined) {
  return renderHook(
    () =>
      useCrudFormWithPhoto<Fields, { id?: number }>(fakeResource(), {
        entity: mode === 'create' ? null : { id: 7, name: 'Ana' },
        mode,
        empty: { id: undefined, name: '' },
        toPayload: (f: Fields) => ({ name: f.name }),
        mapped: ['name'],
        summaryOnly: [],
        onDone,
        photo: { resource: 'students', invalidateKey: ['students'], url: null },
      }),
    { wrapper },
  )
}

beforeEach(() => {
  ;({ wrapper } = createWrapper())
  criados.length = 0
  upload.mockReset()
  remove.mockReset()
  upload.mockResolvedValue(undefined)
  URL.createObjectURL = vi.fn(() => 'blob:lotus')
  URL.revokeObjectURL = vi.fn()
})

describe('useCrudFormWithPhoto', () => {
  it('sobe a foto bufferizada com o id recém-criado, antes de fechar', async () => {
    const ordem: string[] = []
    upload.mockImplementation(async () => { ordem.push('upload') })
    const { result } = montar('create', () => ordem.push('done'))

    act(() => { result.current.crud.photo.onSelect(new File(['x'], 'f.png', { type: 'image/png' })) })
    await act(async () => { result.current.crud.submit() })

    expect(upload).toHaveBeenCalledWith(99, expect.any(File))
    expect(ordem).toEqual(['upload', 'done'])
  })

  it('deriva o id da entidade fora do create e null dentro dele', async () => {
    const emCreate = montar('create')
    act(() => { emCreate.result.current.crud.photo.onSelect(new File(['x'], 'f.png')) })
    expect(upload).not.toHaveBeenCalled()   // sem id, o arquivo é bufferizado

    const emEdit = montar('edit')
    // Fora do create, `onSelect` dispara `upload.mutate` de verdade: o
    // `mutationFn` só roda depois de um microtask (a mutation do TanStack
    // Query aguarda `mutationCache.config.onMutate` antes do `retryer.start`),
    // então precisa do `act` assíncrono — sync `act` só flusha o dispatch
    // síncrono de `isPending` (ver o 3º caso), não a chamada ao mock.
    await act(async () => { emEdit.result.current.crud.photo.onSelect(new File(['x'], 'f.png')) })
    expect(upload).toHaveBeenCalledWith(7, expect.any(File))
  })

  it('busy soma o pending da foto; pending NÃO', () => {
    const { result } = montar('edit')
    expect(result.current.crud.busy).toBe(false)

    upload.mockImplementation(() => new Promise(() => undefined))   // nunca resolve
    act(() => { result.current.crud.photo.onSelect(new File(['x'], 'f.png')) })

    expect(result.current.crud.photo.pending).toBe(true)
    expect(result.current.crud.busy).toBe(true)
    expect(result.current.crud.pending).toBe(false)
  })
})
