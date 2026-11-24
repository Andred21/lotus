import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { createWrapper } from '@shared/testing/providers'
import { api } from '@shared/api/axios'
import { useCertificateExport } from './useCertificateExport'

vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation(),
  }
})

vi.mock('@shared/api/axios', () => ({
  api: { get: vi.fn() },
}))

const salvar = vi.hoisted(() => vi.fn())
vi.mock('@shared/hooks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@shared/hooks')>()),
  useBlobDownload: () => salvar,
}))

const get = vi.mocked(api.get)
let wrapper: ReturnType<typeof createWrapper>['wrapper']

const filtros = { q: 'ana', display_status: 'vigente', quote_id: 7 } as const

const RESUMO = '/api/certificates/export/summary'

/** Com `responseType: 'blob'` o interceptor do axios rejeita o próprio Blob. */
const recusa = (corpo: object) => new Blob([JSON.stringify(corpo)], { type: 'application/problem+json' })
const problema = (status: number, detail: string) => ({ status, detail, title: 'x', type: 't', instance: '' })

/** O resumo responde `resumo`; o download responde `download` (ou rejeita). */
const responder = (
  resumo: { total: number; revocados: number },
  download: () => Promise<unknown> = () =>
    Promise.resolve({
      data: new Blob(['x']),
      headers: { 'content-disposition': 'attachment; filename="certificados-scap-190-r1.xlsx"' },
    }),
) => {
  get.mockImplementation(((url: string) =>
    url === RESUMO ? Promise.resolve({ data: resumo }) : download()) as typeof api.get)
}

const abrir = async (formato: 'planilha' | 'zip', filtrosDoHook: Parameters<typeof useCertificateExport>[0] = filtros) => {
  const hook = renderHook(() => useCertificateExport(filtrosDoHook), { wrapper })
  act(() => hook.result.current.open(formato))
  await waitFor(() => expect(hook.result.current.summary).not.toBeNull())
  return hook
}

beforeEach(() => {
  vi.clearAllMocks()
  // client novo por teste: o cache do resumo não pode vazar de um para o outro
  wrapper = createWrapper().wrapper
  responder({ total: 3, revocados: 1 })
})

describe('useCertificateExport — o resumo', () => {
  it('não busca nada enquanto nenhum formato foi aberto', () => {
    renderHook(() => useCertificateExport(filtros), { wrapper })

    expect(get).not.toHaveBeenCalled()
  })

  it('abrir a planilha busca o resumo com os mesmos filtros da tabela', async () => {
    const { result } = await abrir('planilha')

    expect(result.current.summary).toEqual({ total: 3, revocados: 1 })
    expect(get).toHaveBeenCalledWith(RESUMO, {
      params: { q: 'ana', display_status: 'vigente', quote_id: 7 },
    })
    expect(result.current.format).toBe('planilha')
  })

  it('filtro vazio some da query: sem filtro, o servidor lê "todos"', async () => {
    await abrir('planilha', { q: '', display_status: null, quote_id: null })

    expect(get).toHaveBeenCalledWith(RESUMO, { params: {} })
  })

  it('fechar e reabrir refaz o resumo: o conjunto pode ter mudado entre as duas', async () => {
    const { result } = await abrir('planilha')
    act(() => result.current.close())
    act(() => result.current.open('planilha'))

    await waitFor(() => expect(get.mock.calls.filter(([u]) => u === RESUMO)).toHaveLength(2))
  })
})

describe('useCertificateExport — o ZIP exige cotação', () => {
  it('sem quote_id, a razão do botão desabilitado vem do hook', () => {
    const { result } = renderHook(() => useCertificateExport({ q: 'ana' }), { wrapper })

    expect(result.current.zipDisabledReason).toBe('certificate.exportZipNeedsQuote')
  })

  it('com quote_id, não há razão', () => {
    const { result } = renderHook(() => useCertificateExport(filtros), { wrapper })

    expect(result.current.zipDisabledReason).toBeNull()
  })

  it('open("zip") sem cotação não abre diálogo nem chama a API', () => {
    const { result } = renderHook(() => useCertificateExport({}), { wrapper })

    act(() => result.current.open('zip'))

    expect(result.current.format).toBeNull()
    expect(get).not.toHaveBeenCalled()
  })
})

describe('useCertificateExport — confirmar', () => {
  it('baixa o blob com o nome do Content-Disposition e fecha o diálogo', async () => {
    const { result } = await abrir('planilha')

    act(() => result.current.confirm())

    await waitFor(() => expect(salvar).toHaveBeenCalledTimes(1))
    expect(salvar).toHaveBeenCalledWith(expect.any(Blob), 'certificados-scap-190-r1.xlsx')
    expect(get).toHaveBeenCalledWith('/api/certificates/export/planilha', {
      params: { q: 'ana', display_status: 'vigente', quote_id: 7 },
      responseType: 'blob',
    })
    await waitFor(() => expect(result.current.format).toBeNull())
  })

  it('o ZIP pede /export/zip', async () => {
    const { result } = await abrir('zip')

    act(() => result.current.confirm())

    await waitFor(() => expect(salvar).toHaveBeenCalled())
    expect(get).toHaveBeenCalledWith('/api/certificates/export/zip', expect.objectContaining({ responseType: 'blob' }))
  })

  it('lê o nome também sem aspas, como o servidor o envia de verdade', async () => {
    responder({ total: 3, revocados: 0 }, () =>
      Promise.resolve({
        data: new Blob(['x']),
        headers: { 'content-disposition': 'attachment; filename=certificados-scap-5-r1.xlsx' },
      }),
    )
    const { result } = await abrir('planilha')

    act(() => result.current.confirm())

    await waitFor(() => expect(salvar).toHaveBeenCalledWith(expect.any(Blob), 'certificados-scap-5-r1.xlsx'))
  })

  it('sem Content-Disposition legível (CORS), cai num nome genérico com a extensão certa', async () => {
    responder({ total: 3, revocados: 0 }, () => Promise.resolve({ data: new Blob(['x']), headers: {} }))
    const { result } = await abrir('zip')

    act(() => result.current.confirm())

    await waitFor(() => expect(salvar).toHaveBeenCalledWith(expect.any(Blob), 'certificados.zip'))
  })

  it('com total 0 não baixa nada: o servidor recusaria, e o botão já diz por quê', async () => {
    responder({ total: 0, revocados: 2 })
    const { result } = await abrir('planilha')

    act(() => result.current.confirm())

    expect(get).toHaveBeenCalledTimes(1)
    expect(salvar).not.toHaveBeenCalled()
  })

  it('a recusa 422 do download (corpo Blob) vira o detail RFC 7807 e o diálogo segue aberto', async () => {
    responder({ total: 3, revocados: 0 }, () => Promise.reject(recusa(problema(422, 'No hay certificados para exportar.'))))
    const { result } = await abrir('planilha')

    act(() => result.current.confirm())

    await waitFor(() => expect(result.current.errorMessage).toBe('No hay certificados para exportar.'))
    expect(result.current.format).toBe('planilha')
    expect(result.current.retryable).toBe(false)
    expect(salvar).not.toHaveBeenCalled()
  })

  it('503 do conversor mostra o detail com os códigos e se marca como "tente de novo"', async () => {
    const detail = 'No se pudo generar: LOT-2026-1, LOT-2026-2.'
    responder({ total: 15, revocados: 0 }, () => Promise.reject(recusa(problema(503, detail))))
    const { result } = await abrir('zip')

    act(() => result.current.confirm())

    await waitFor(() => expect(result.current.errorMessage).toBe(detail))
    expect(result.current.retryable).toBe(true)
  })

  it('abrir de novo limpa o erro do download anterior', async () => {
    responder({ total: 3, revocados: 0 }, () => Promise.reject(recusa(problema(422, 'recusado'))))
    const { result } = await abrir('planilha')
    act(() => result.current.confirm())
    await waitFor(() => expect(result.current.errorMessage).toBe('recusado'))

    act(() => result.current.close())
    act(() => result.current.open('planilha'))

    await waitFor(() => expect(result.current.errorMessage).toBeNull())
  })

  it('reabrir com o N antigo em cache e a nova contagem falhando (429) não deixa confirmar sobre o N velho', async () => {
    const { result } = await abrir('planilha')
    act(() => result.current.close())
    get.mockImplementation((() => Promise.reject(problema(429, 'Demasiadas solicitudes.'))) as typeof api.get)

    act(() => result.current.open('planilha'))

    await waitFor(() => expect(result.current.errorMessage).toBe('Demasiadas solicitudes.'))
    expect(result.current.summary).toBeNull()
    get.mockClear()

    act(() => result.current.confirm())

    expect(get).not.toHaveBeenCalled()
    expect(salvar).not.toHaveBeenCalled()
  })

  it('reabrir não repinta o N da abertura anterior enquanto recontagem', async () => {
    const { result } = await abrir('planilha')
    act(() => result.current.close())
    get.mockImplementation((() => new Promise(() => {})) as typeof api.get)

    act(() => result.current.open('planilha'))

    await waitFor(() => expect(result.current.summaryLoading).toBe(true))
    expect(result.current.summary).toBeNull()
  })

  it('falha do próprio resumo (429) aparece como erro e é "tente de novo"', async () => {
    get.mockRejectedValue(problema(429, 'Demasiadas solicitudes.'))
    const { result } = renderHook(() => useCertificateExport(filtros), { wrapper })

    act(() => result.current.open('planilha'))

    await waitFor(() => expect(result.current.errorMessage).toBe('Demasiadas solicitudes.'))
    expect(result.current.summary).toBeNull()
    expect(result.current.retryable).toBe(true)
  })
})
