import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { renderWithProviders } from '@shared/testing/providers'
import { postMultipart } from '@shared/api/postMultipart'
import type { FileData } from '@shared/types/generated'
import { BudgetDocumentsCard } from './BudgetDocumentsCard'

/**
 * Erros do cartão de documentos do presupuesto, com a mutation REAL (só o
 * transporte é mockado): o seletor do slot volta depois de um 422 (I1 da
 * revisão final do bloco 47) e o erro mais novo é o que aparece (M7).
 *
 * No modo básico o Prime não renderiza o `<input type=file>` enquanto guarda um
 * arquivo: o seletor só volta se o `clear()` rodar antes da chamada, e não só no
 * sucesso.
 */
vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation({
      t: (key, opts) => (opts?.tipo === undefined ? key : `${key}:${String(opts.tipo)}`),
    }),
  }
})

vi.mock('@shared/api/postMultipart', () => ({ postMultipart: vi.fn() }))

const arquivo = (id: number, type: string): FileData => ({
  id,
  type,
  original_name: `${type}-${id}.pdf`,
  mime: 'application/pdf',
  size: 2048,
  download_url: `http://localhost/arquivo/${id}`,
  created_at: '2026-10-28T10:00:00Z',
})

const grande = () => {
  const f = new File(['x'], 'enorme.pdf', { type: 'application/pdf' })
  Object.defineProperty(f, 'size', { value: 50 * 1024 * 1024 })
  return f
}

const seletores = (c: HTMLElement) => c.querySelectorAll('input[type="file"]')

function montar(files: FileData[] = [], fileError: string | null = null, onRemove = () => {}) {
  return renderWithProviders(
    <BudgetDocumentsCard budgetId={7} files={files} onRemove={onRemove} fileError={fileError} />,
  )
}

beforeEach(() => {
  vi.mocked(postMultipart).mockReset()
})

describe('BudgetDocumentsCard — envio recusado', () => {
  it('o seletor do slot volta depois de um 422, para escolher outro arquivo', async () => {
    vi.mocked(postMultipart).mockRejectedValueOnce({ detail: 'Tipo de archivo no permitido' })
    const { container } = montar()
    const pdf = new File(['%PDF'], 'fa-1.pdf', { type: 'application/pdf' })

    fireEvent.change(seletores(container)[1], { target: { files: [pdf] } })

    await waitFor(() => expect(screen.getByText('Tipo de archivo no permitido')).toBeTruthy())
    expect(seletores(container)).toHaveLength(3)
  })
})

describe('BudgetDocumentsCard — qual erro aparece', () => {
  it('arquivo grande demais mostra o erro de tamanho, não um erro de envio antigo', async () => {
    vi.mocked(postMultipart).mockRejectedValueOnce({ detail: 'Tipo de archivo no permitido' })
    const { container } = montar()
    const pdf = new File(['%PDF'], 'fa-1.pdf', { type: 'application/pdf' })
    fireEvent.change(seletores(container)[1], { target: { files: [pdf] } })
    await waitFor(() => expect(screen.getByText('Tipo de archivo no permitido')).toBeTruthy())

    fireEvent.change(seletores(container)[1], { target: { files: [grande()] } })

    expect(screen.getByText('common.fileTooLarge')).toBeTruthy()
    expect(screen.queryByText('Tipo de archivo no permitido')).toBeNull()
    expect(postMultipart).toHaveBeenCalledTimes(1)
  })

  it('arquivo grande demais mostra o erro de tamanho, não um erro de remoção antigo', () => {
    const { container } = montar([], 'No se pudo eliminar')

    fireEvent.change(seletores(container)[1], { target: { files: [grande()] } })

    expect(screen.getByText('common.fileTooLarge')).toBeTruthy()
    expect(screen.queryByText('No se pudo eliminar')).toBeNull()
  })

  it('remover um arquivo limpa o erro de tamanho que ficou na tela', () => {
    const onRemove = vi.fn()
    const { container } = montar([arquivo(2, 'invoice')], null, onRemove)
    fireEvent.change(seletores(container)[0], { target: { files: [grande()] } })
    expect(screen.getByText('common.fileTooLarge')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'common.deleteNamed:budget.documentType.invoice' }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'common.delete' }))

    expect(onRemove).toHaveBeenCalledWith(2)
    expect(screen.queryByText('common.fileTooLarge')).toBeNull()
  })
})
