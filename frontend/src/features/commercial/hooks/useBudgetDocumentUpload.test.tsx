import { describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import type { FileUploadHandlerEvent } from '@shared/ui'
import { useUploadBudgetFile } from '../api/useCommercialFiles'
import { useBudgetDocumentUpload } from './useBudgetDocumentUpload'

vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation(),
  }
})

vi.mock('../api/useCommercialFiles', () => ({ useUploadBudgetFile: vi.fn() }))

const mutacao = (mutate: unknown, reset: unknown) =>
  ({ mutate, reset, isPending: false, error: null }) as unknown as ReturnType<typeof useUploadBudgetFile>

const escolha = (file: File) =>
  ({ files: [file], options: { clear: vi.fn() } }) as unknown as FileUploadHandlerEvent

const pdf = new File(['%PDF'], 'oc-451.pdf', { type: 'application/pdf' })

const montar = (mutate: unknown = vi.fn(), reset: unknown = vi.fn()) => {
  vi.mocked(useUploadBudgetFile).mockReturnValue(mutacao(mutate, reset))
  return renderHook(() => useBudgetDocumentUpload(7)).result
}

describe('useBudgetDocumentUpload', () => {
  it('só envia com tipo e arquivo', () => {
    const result = montar()

    expect(result.current.canSubmit).toBe(false)
    act(() => result.current.setType('purchase_order'))
    expect(result.current.canSubmit).toBe(false)
    act(() => result.current.pickFile(escolha(pdf)))
    expect(result.current.canSubmit).toBe(true)
  })

  it('envia o tipo escolhido por último, mesmo depois do arquivo', () => {
    const mutate = vi.fn()
    const result = montar(mutate)

    act(() => result.current.pickFile(escolha(pdf)))
    act(() => result.current.setType('invoice'))
    act(() => result.current.setType('purchase_order'))
    act(() => result.current.submit())

    expect(mutate).toHaveBeenCalledWith({ budgetId: 7, type: 'purchase_order', file: pdf }, expect.anything())
  })

  it('o seletor volta ao vazio depois de escolher', () => {
    const result = montar()
    const evento = escolha(pdf)

    act(() => result.current.pickFile(evento))

    expect(evento.options.clear).toHaveBeenCalled()
    expect(result.current.file).toBe(pdf)
  })

  /** Review Focus 2: o erro fica no diálogo, e a pessoa tenta de novo sem refazer a escolha. */
  it('sem sucesso, o diálogo fica aberto com tipo e arquivo', () => {
    const result = montar(vi.fn())

    act(() => result.current.open())
    act(() => result.current.setType('receipt'))
    act(() => result.current.pickFile(escolha(pdf)))
    act(() => result.current.submit())

    expect(result.current).toMatchObject({ visible: true, type: 'receipt', file: pdf })
  })

  /** Review Focus 1: a próxima abertura não herda nada da anterior. */
  it('o sucesso fecha, e reabrir começa limpo', () => {
    const result = montar(vi.fn((_vars: unknown, opts: { onSuccess: () => void }) => opts.onSuccess()))

    act(() => result.current.open())
    act(() => result.current.setType('invoice'))
    act(() => result.current.pickFile(escolha(pdf)))
    act(() => result.current.submit())
    expect(result.current.visible).toBe(false)

    act(() => result.current.open())
    expect(result.current).toMatchObject({ visible: true, type: null, file: null, sizeError: null })
  })

  it('fechar descarta a escolha, o erro de tamanho e o erro do envio', () => {
    const reset = vi.fn()
    const result = montar(vi.fn(), reset)

    act(() => result.current.open())
    act(() => result.current.setType('invoice'))
    act(() => result.current.pickFile(escolha(pdf)))
    act(() => result.current.onSizeReject('El archivo supera el límite'))
    act(() => result.current.close())
    act(() => result.current.open())

    expect(result.current).toMatchObject({ visible: true, type: null, file: null, sizeError: null })
    expect(reset).toHaveBeenCalled()
  })
})
