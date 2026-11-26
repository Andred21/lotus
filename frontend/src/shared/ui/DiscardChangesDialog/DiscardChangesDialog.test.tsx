import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { DiscardChangesDialog } from './DiscardChangesDialog'

// `t` devolve a chave: o que se prova é qual texto a peça escolhe.
vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return { ...(await importOriginal<typeof import('react-i18next')>()), useTranslation: mockUseTranslation() }
})

describe('DiscardChangesDialog', () => {
  it('visível, avisa com os quatro textos e o confirmar veste o aviso', () => {
    render(<DiscardChangesDialog visible onConfirm={() => {}} onCancel={() => {}} />)

    expect(screen.getByText('common.discardTitle')).toBeTruthy()
    expect(screen.getByText('common.discardBody')).toBeTruthy()
    expect(screen.getByRole('button', { name: /common.discardConfirm/ }).className).toContain('p-button-warning')
    expect(screen.getByRole('button', { name: /common.keepEditing/ })).toBeTruthy()
    expect(document.querySelector('[data-severity]')?.getAttribute('data-severity')).toBe('warning')
  })

  it('Descartar chama onConfirm e Seguir editando chama onCancel', () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    render(<DiscardChangesDialog visible onConfirm={onConfirm} onCancel={onCancel} />)

    fireEvent.click(screen.getByRole('button', { name: /common.discardConfirm/ }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onCancel).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: /common.keepEditing/ }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('invisível, não monta nada', () => {
    render(<DiscardChangesDialog visible={false} onConfirm={() => {}} onCancel={() => {}} />)

    expect(document.querySelector('.p-dialog')).toBeNull()
  })
})
