import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useEntityPhoto } from './useEntityPhoto'

const upload = vi.fn<(id: number, file: File) => Promise<void>>()
const remove = vi.fn<(id: number) => Promise<void>>()

// Estáveis entre renders de propósito: o hook chama `photoResource(resource)`
// a cada render, e spies novos a cada chamada perderiam o histórico.
vi.mock('@shared/api/photoResource', () => ({
  photoResource: () => ({ upload, remove }),
}))

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

const arquivo = () => new File(['x'], 'foto.png', { type: 'image/png' })

function montar(id: number | null, mode: 'create' | 'edit' | 'view' = 'create') {
  return renderHook(
    () => useEntityPhoto({ resource: 'users', id, mode, invalidateKey: ['users'] }),
    { wrapper },
  )
}

beforeEach(() => {
  upload.mockReset()
  remove.mockReset()
  upload.mockResolvedValue(undefined)
  remove.mockResolvedValue(undefined)
  // jsdom não implementa nenhuma das duas.
  URL.createObjectURL = vi.fn(() => 'blob:lotus')
  URL.revokeObjectURL = vi.fn()
})

describe('useEntityPhoto', () => {
  it('em create, bufferiza sem nenhuma requisição', () => {
    // Não há id para pendurar a foto: sair da tela agora não pode ter
    // criado nada no S3.
    const { result } = montar(null)

    act(() => result.current.onSelect(arquivo()))

    expect(upload).not.toHaveBeenCalled()
    expect(result.current.url).toBe('blob:lotus')
  })

  it('`flush` sobe o arquivo bufferizado para o id recém-criado', async () => {
    const { result } = montar(null)

    act(() => result.current.onSelect(arquivo()))
    await act(async () => {
      await result.current.flush(42)
    })

    expect(upload).toHaveBeenCalledTimes(1)
    expect(upload.mock.calls[0][0]).toBe(42)
  })

  it('`flush` que falha NÃO lança e liga `hasBufferedFailure`', async () => {
    // A entidade já existe: propagar o erro faria o diálogo fechar como se
    // tudo tivesse dado certo, e o usuário sairia achando que subiu foto.
    upload.mockRejectedValueOnce(new Error('S3 fora'))
    const { result } = montar(null)

    act(() => result.current.onSelect(arquivo()))
    await act(async () => {
      await expect(result.current.flush(42)).resolves.toBeUndefined()
    })

    expect(result.current.hasBufferedFailure).toBe(true)
  })

  it('`onRetry` reenvia para o id da TENTATIVA, não para a prop', async () => {
    // O `flush` falhou com createdId=42 e a prop `id` continua null (a
    // transição para edit ainda não propagou). Retry com a prop mandaria o
    // upload para lugar nenhum.
    upload.mockRejectedValueOnce(new Error('S3 fora'))
    const { result } = montar(null)

    act(() => result.current.onSelect(arquivo()))
    await act(async () => {
      await result.current.flush(42)
    })

    expect(result.current.onRetry).toBeTypeOf('function')
    act(() => result.current.onRetry?.())

    await waitFor(() => expect(upload).toHaveBeenCalledTimes(2))
    expect(upload.mock.calls[1][0]).toBe(42)
  })

  it('`sizeError` apaga o `onRetry`', async () => {
    // O erro exibido passa a ser o de TAMANHO, mas `buffered`/`retryId` ainda
    // guardam a tentativa ANTERIOR — o botão mentiria sobre o próprio efeito.
    upload.mockRejectedValueOnce(new Error('S3 fora'))
    const { result } = montar(null)

    act(() => result.current.onSelect(arquivo()))
    await act(async () => {
      await result.current.flush(42)
    })
    expect(result.current.onRetry).toBeTypeOf('function')

    act(() => result.current.onSizeReject('arquivo grande demais'))

    expect(result.current.onRetry).toBeUndefined()
    expect(result.current.error).toBe('arquivo grande demais')
  })

  it('em create, `onRemove` limpa sem chamar a API', () => {
    const { result } = montar(null)

    act(() => result.current.onSelect(arquivo()))
    act(() => result.current.onRemove())

    expect(remove).not.toHaveBeenCalled()
    expect(result.current.url).toBeNull()
  })
})
