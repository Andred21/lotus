import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, within } from '@testing-library/react'
import { renderWithProviders } from '@shared/testing/providers'
import type { useBudgetDocumentUpload } from '../../hooks/useBudgetDocumentUpload'
import { BudgetDocumentUploadDialog } from './BudgetDocumentUploadDialog'

vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation(),
  }
})

type Upload = ReturnType<typeof useBudgetDocumentUpload>

const upload = (sobre: Partial<Upload> = {}): Upload => ({
  visible: true,
  open: vi.fn(),
  close: vi.fn(),
  type: null,
  setType: vi.fn(),
  file: null,
  pickFile: vi.fn(),
  sizeError: null,
  onSizeReject: vi.fn(),
  error: null,
  pending: false,
  canSubmit: false,
  submit: vi.fn(),
  ...sobre,
})

const rodape = () => document.querySelector('.p-dialog-footer') as HTMLElement

describe('BudgetDocumentUploadDialog', () => {
  it('três cartões na ordem do ciclo do orçamento, nenhum escolhido', () => {
    renderWithProviders(<BudgetDocumentUploadDialog u={upload()} />)

    const cartoes = screen.getAllByRole('button', { pressed: false })
    expect(cartoes.map((b) => b.textContent)).toEqual([
      'budget.documentType.purchase_order',
      'budget.documentType.invoice',
      'budget.documentType.receipt',
    ])
  })

  it('clicar num cartão escolhe o tipo', () => {
    const setType = vi.fn()
    renderWithProviders(<BudgetDocumentUploadDialog u={upload({ setType })} />)

    fireEvent.click(screen.getByRole('button', { name: 'budget.documentType.receipt' }))

    expect(setType).toHaveBeenCalledWith('receipt')
  })

  it('Subir só habilita com canSubmit', () => {
    const { unmount } = renderWithProviders(<BudgetDocumentUploadDialog u={upload()} />)
    expect((within(rodape()).getByRole('button', { name: 'common.upload' }) as HTMLButtonElement).disabled).toBe(true)
    unmount()

    renderWithProviders(<BudgetDocumentUploadDialog u={upload({ canSubmit: true })} />)
    expect((within(rodape()).getByRole('button', { name: 'common.upload' }) as HTMLButtonElement).disabled).toBe(false)
  })

  it('mostra o arquivo escolhido e o erro dentro do diálogo', () => {
    renderWithProviders(
      <BudgetDocumentUploadDialog
        u={upload({ file: new File(['x'], 'factura-001.pdf'), error: 'Tipo de archivo no permitido' })}
      />,
    )

    const dialogo = document.querySelector('.p-dialog') as HTMLElement
    expect(within(dialogo).getByText('factura-001.pdf')).toBeTruthy()
    expect(within(dialogo).getByText('Tipo de archivo no permitido')).toBeTruthy()
  })

  /** Review Focus 3: fechar com o envio em voo soltaria o 422 sem ninguém para exibi-lo. */
  it('com envio em voo, Cancelar trava e o X some', () => {
    renderWithProviders(<BudgetDocumentUploadDialog u={upload({ pending: true })} />)

    expect((within(rodape()).getByRole('button', { name: 'common.cancel' }) as HTMLButtonElement).disabled).toBe(true)
    expect(document.querySelector('.p-dialog-header-close')).toBeNull()
  })
})
