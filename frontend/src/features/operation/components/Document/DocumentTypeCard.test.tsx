import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { TurmaDocumentData } from '@shared/types/generated'
import { DocumentTypeCard } from './DocumentTypeCard'

// `t` devolve a chave: o que se prova é qual texto o cartão escolhe.
vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return { ...(await importOriginal<typeof import('react-i18next')>()), useTranslation: mockUseTranslation() }
})

const file = {
  id: 3,
  type: 'MANUAL',
  original_name: 'manual.pdf',
  mime: 'application/pdf',
  size: 10,
  created_at: '2026-10-01T10:00:00Z',
  download_url: 'https://minio.local/manual.pdf',
} as TurmaDocumentData

function montar(onRemove: (f: TurmaDocumentData) => void | Promise<unknown>, removeError: string | null = null) {
  render(
    <DocumentTypeCard
      type="MANUAL"
      files={[file]}
      uploading={false}
      onUpload={() => {}}
      onRemove={onRemove}
      removing={false}
      removeError={removeError}
      canSubmit
    />,
  )
}

describe('DocumentTypeCard — excluir um PDF da turma', () => {
  it('a lixeira abre a confirmação da turma e só o sim chama onRemove', () => {
    const onRemove = vi.fn()
    montar(onRemove)

    fireEvent.click(screen.getByRole('button', { name: 'operation.documents.remove' }))
    expect(screen.getByText('operation.documents.removeTitle')).toBeTruthy()
    expect(onRemove).not.toHaveBeenCalled()
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'operation.documents.remove' }))

    expect(onRemove).toHaveBeenCalledWith(file)
  })

  it('o 403/422 deixa a confirmação aberta com a mensagem do servidor', async () => {
    montar(() => Promise.reject(new Error('422')), 'Turma concluída')

    fireEvent.click(screen.getByRole('button', { name: 'operation.documents.remove' }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'operation.documents.remove' }))

    expect(await screen.findByText('Turma concluída')).toBeTruthy()
    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy())
  })
})
