import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, within } from '@testing-library/react'
import { renderWithProviders } from '@shared/testing/providers'
import type { FileData } from '@shared/types/generated'
import { useUploadBudgetFile } from '../../api/useCommercialFiles'
import { BudgetDocumentsCard } from './BudgetDocumentsCard'

/**
 * Bloco 47, Task 8: o cartão de documentos do presupuesto tem um slot fixo por
 * tipo (ordem do ciclo: orden de compra, factura, comprobante), no lugar do
 * botão que abria o diálogo de upload. Irmão do `BudgetDetailPage.test.tsx`,
 * que mocka o hook da página inteira; aqui o que se prova é o cartão.
 */
vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    // Ecoa o `tipo` da interpolação: o nome acessível dos slots leva o tipo.
    useTranslation: mockUseTranslation({
      t: (key, opts) => (opts?.tipo === undefined ? key : `${key}:${String(opts.tipo)}`),
    }),
  }
})

vi.mock('../../api/useCommercialFiles', () => ({ useUploadBudgetFile: vi.fn() }))

const mutate = vi.fn()
const reset = vi.fn()
const estado = vi.hoisted<{ error: { detail: string } | null }>(() => ({ error: null }))

const arquivo = (id: number, type: string, createdAt = '2026-10-28T10:00:00Z'): FileData => ({
  id,
  type,
  original_name: `${type}-${id}.pdf`,
  mime: 'application/pdf',
  size: 2048,
  download_url: `http://localhost/arquivo/${id}`,
  created_at: createdAt,
})

function montar(files: FileData[] = [], fileError: string | null = null) {
  return renderWithProviders(
    <BudgetDocumentsCard budgetId={7} files={files} onRemove={() => {}} fileError={fileError} />,
  )
}

const tags = () => Array.from(document.querySelectorAll('.p-tag'))

beforeEach(() => {
  mutate.mockReset()
  estado.error = null
  // `reset` limpa o erro como a mutation real; o próximo render já o lê vazio.
  reset.mockReset().mockImplementation(() => { estado.error = null })
  vi.mocked(useUploadBudgetFile).mockImplementation(() => ({
    mutate, reset, error: estado.error, isPending: false, variables: undefined,
  }) as unknown as ReturnType<typeof useUploadBudgetFile>)
})

describe('BudgetDocumentsCard — um slot fixo por tipo', () => {
  it('mostra três slots na ordem do ciclo e nenhum botão de enviar documento', () => {
    montar()

    expect(tags().map((tag) => tag.textContent)).toEqual([
      'budget.documentType.purchase_order',
      'budget.documentType.invoice',
      'budget.documentType.receipt',
    ])
    expect(screen.getAllByText('common.notLoaded')).toHaveLength(3)
    // O botão que abria o diálogo de upload saiu: nenhum botão leva o nome simples de enviar.
    expect(screen.queryByRole('button', { name: 'common.upload' })).toBeNull()
  })

  it('cada tag leva o ícone do tipo', () => {
    montar()

    const icones = tags().map((tag) => tag.querySelector('.p-tag-icon')?.className ?? '')
    expect(icones[0]).toContain('pi-shopping-cart')
    expect(icones[1]).toContain('pi-receipt')
    expect(icones[2]).toContain('pi-money-bill')
  })

  it('enviar no slot Fatura manda type=invoice', () => {
    const { container } = montar()
    const pdf = new File(['%PDF'], 'fa-1.pdf', { type: 'application/pdf' })

    const inputs = container.querySelectorAll('input[type="file"]')
    fireEvent.change(inputs[1], { target: { files: [pdf] } })

    expect(mutate).toHaveBeenCalledWith({ budgetId: 7, type: 'invoice', file: pdf })
  })

  it('com dois invoice antigos, o slot mostra só o mais recente', () => {
    montar([
      arquivo(1, 'invoice', '2026-10-01T10:00:00Z'),
      arquivo(2, 'invoice', '2026-10-20T10:00:00Z'),
    ])

    expect(screen.getByText('invoice-2.pdf')).toBeTruthy()
    expect(screen.queryByText('invoice-1.pdf')).toBeNull()
  })

  it('arquivo de tipo fora do enum aparece abaixo dos slots, com a tag neutra', () => {
    montar([arquivo(3, 'legado')])

    expect(screen.getByText('budget.otherDocuments')).toBeTruthy()
    expect(screen.getByText('legado-3.pdf')).toBeTruthy()
    expect(screen.getByText('legado').className).toContain('p-tag')
  })

  it('sem arquivo fora do enum, não há seção de outros documentos', () => {
    montar([arquivo(1, 'invoice')])

    expect(screen.queryByText('budget.otherDocuments')).toBeNull()
  })

  it('o erro de remoção aparece no banner do cartão', () => {
    montar([], 'No se pudo eliminar')

    expect(screen.getByText('No se pudo eliminar')).toBeTruthy()
  })

  it('o slot Fatura tem enviar e substituir nomeados com o tipo', () => {
    const { unmount } = montar()
    expect(screen.getByLabelText('common.uploadNamed:budget.documentType.invoice')).toBeTruthy()
    unmount()

    montar([arquivo(2, 'invoice')])
    expect(screen.getByLabelText('common.replaceNamed:budget.documentType.invoice')).toBeTruthy()
  })

  it('o excluir do arquivo também leva o tipo no nome', () => {
    montar([arquivo(2, 'invoice')])

    expect(screen.getByRole('button', { name: 'common.deleteNamed:budget.documentType.invoice' })).toBeTruthy()
  })

  it('arquivo grande demais mostra o erro de tamanho, não um erro de remoção antigo', () => {
    const { container } = montar([], 'No se pudo eliminar')
    const grande = new File(['x'], 'enorme.pdf', { type: 'application/pdf' })
    Object.defineProperty(grande, 'size', { value: 50 * 1024 * 1024 })

    fireEvent.change(container.querySelectorAll('input[type="file"]')[1], { target: { files: [grande] } })

    expect(screen.getByText('common.fileTooLarge')).toBeTruthy()
    expect(screen.queryByText('No se pudo eliminar')).toBeNull()
  })

  it('remover um arquivo limpa o erro de tamanho que ficou na tela', () => {
    const onRemove = vi.fn()
    const { container } = renderWithProviders(
      <BudgetDocumentsCard budgetId={7} files={[arquivo(2, 'invoice')]} onRemove={onRemove} fileError={null} />,
    )
    const grande = new File(['x'], 'enorme.pdf', { type: 'application/pdf' })
    Object.defineProperty(grande, 'size', { value: 50 * 1024 * 1024 })
    fireEvent.change(container.querySelectorAll('input[type="file"]')[0], { target: { files: [grande] } })
    expect(screen.getByText('common.fileTooLarge')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'common.deleteNamed:budget.documentType.invoice' }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'common.delete' }))

    expect(onRemove).toHaveBeenCalledWith(2)
    expect(screen.queryByText('common.fileTooLarge')).toBeNull()
  })

  it('arquivo grande demais mostra o erro de tamanho, não um erro de envio antigo', () => {
    estado.error = { detail: 'Tipo de archivo no permitido' }
    const { container } = montar()
    expect(screen.getByText('Tipo de archivo no permitido')).toBeTruthy()
    const grande = new File(['x'], 'enorme.pdf', { type: 'application/pdf' })
    Object.defineProperty(grande, 'size', { value: 50 * 1024 * 1024 })

    fireEvent.change(container.querySelectorAll('input[type="file"]')[1], { target: { files: [grande] } })

    expect(screen.getByText('common.fileTooLarge')).toBeTruthy()
    expect(screen.queryByText('Tipo de archivo no permitido')).toBeNull()
    expect(mutate).not.toHaveBeenCalled()
  })
})
