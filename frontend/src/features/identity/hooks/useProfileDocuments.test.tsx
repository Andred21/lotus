import { describe, expect, it, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { createWrapper } from '@shared/testing/providers'
import type { FileUploadHandlerEvent } from '@shared/ui'
import { useProfileDocuments } from './useProfileDocuments'

type Resolvedor = { resolve: () => void; reject: (motivo: unknown) => void }

const envios = vi.hoisted(() => ({
  vars: [] as unknown[],
  pendentes: [] as Resolvedor[],
}))

// Mock com uma promise POR CHAMADA: é o que permite deixar dois uploads em voo
// ao mesmo tempo e terminar o primeiro depois do segundo — o cenário em que a
// instância única de mutation perdia o primeiro.
vi.mock('../api/useProfile', () => ({
  useUploadProfileDocument: () => ({
    mutateAsync: (v: unknown) => {
      envios.vars.push(v)
      return new Promise<void>((resolve, reject) => {
        envios.pendentes.push({ resolve: () => resolve(), reject })
      })
    },
  }),
}))

const { wrapper } = createWrapper()

const limpar = vi.fn()

function evento(file: File | undefined): FileUploadHandlerEvent {
  return { files: file ? [file] : [], options: { clear: limpar } } as unknown as FileUploadHandlerEvent
}

function arquivo(nome: string) {
  return new File(['x'], nome, { type: 'application/pdf' })
}

function limpo() {
  envios.vars = []
  envios.pendentes = []
}

describe('useProfileDocuments', () => {
  it('envia o arquivo com o tipo do slot e limpa o controle', async () => {
    limpo()
    const { result } = renderHook(() => useProfileDocuments(), { wrapper })
    const cv = arquivo('cv.pdf')

    act(() => result.current.upload('CV', evento(cv)))

    expect(envios.vars).toEqual([{ type: 'CV', file: cv }])
    expect(limpar).toHaveBeenCalled()
    await act(async () => envios.pendentes[0].resolve())
  })

  it('evento sem arquivo nao vira requisicao', () => {
    limpo()
    const { result } = renderHook(() => useProfileDocuments(), { wrapper })

    act(() => result.current.upload('CV', evento(undefined)))

    expect(envios.vars).toEqual([])
  })

  it('so o slot em voo fica pendente, nao os quatro', async () => {
    limpo()
    const { result } = renderHook(() => useProfileDocuments(), { wrapper })

    act(() => result.current.upload('TITULO', evento(arquivo('titulo.pdf'))))

    await waitFor(() => expect(result.current.uploadingTypes).toEqual(['TITULO']))
    await act(async () => envios.pendentes[0].resolve())
    await waitFor(() => expect(result.current.uploadingTypes).toEqual([]))
  })

  it('dois envios simultaneos: cada slot sai da fila no proprio termino', async () => {
    limpo()
    const { result } = renderHook(() => useProfileDocuments(), { wrapper })

    act(() => result.current.upload('CV', evento(arquivo('cv.pdf'))))
    act(() => result.current.upload('TITULO', evento(arquivo('titulo.pdf'))))

    await waitFor(() => expect(result.current.uploadingTypes).toEqual(['CV', 'TITULO']))

    // O SEGUNDO termina primeiro: o CV segue em voo e não pode reabilitar.
    await act(async () => envios.pendentes[1].resolve())
    await waitFor(() => expect(result.current.uploadingTypes).toEqual(['CV']))

    await act(async () => envios.pendentes[0].resolve())
    await waitFor(() => expect(result.current.uploadingTypes).toEqual([]))
  })

  it('falha do primeiro envio aparece mesmo depois de o segundo suceder', async () => {
    limpo()
    const { result } = renderHook(() => useProfileDocuments(), { wrapper })

    act(() => result.current.upload('CV', evento(arquivo('cv.pdf'))))
    act(() => result.current.upload('TITULO', evento(arquivo('titulo.pdf'))))

    await act(async () => envios.pendentes[1].resolve())
    await act(async () =>
      envios.pendentes[0].reject({ detail: 'Archivo rechazado', status: 422 }),
    )

    await waitFor(() => expect(result.current.error).toBe('Archivo rechazado'))
    expect(result.current.uploadingTypes).toEqual([])
  })
})
