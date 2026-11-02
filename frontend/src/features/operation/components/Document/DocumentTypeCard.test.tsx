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

function montarComArquivos(files: TurmaDocumentData[], canSubmit: boolean) {
  render(
    <DocumentTypeCard
      type="MANUAL"
      files={files}
      uploading={false}
      onUpload={() => {}}
      onRemove={() => {}}
      removing={false}
      removeError={null}
      canSubmit={canSubmit}
    />,
  )
}

describe('DocumentTypeCard — ações só ícone', () => {
  const segundo = { ...file, id: 4, original_name: 'guia.pdf' } as TurmaDocumentData

  it('canSubmit mostra o ícone de enviar com nome acessível, sem botão de texto', () => {
    montarComArquivos([file], true)

    expect(screen.getByRole('button', { name: 'operation.documents.upload' })).toBeTruthy()
    expect(screen.queryByText('operation.documents.upload')).toBeNull()
    expect(screen.getByText('operation.documents.uploadHint')).toBeTruthy()
  })

  it('dois PDFs listados têm ver, baixar e excluir cada um', () => {
    montarComArquivos([file, segundo], true)

    expect(screen.getAllByRole('button', { name: 'operation.documents.remove' })).toHaveLength(2)
    expect(screen.getAllByRole('button', { name: 'common.preview' })).toHaveLength(2)
    expect(screen.getAllByRole('button', { name: 'common.download' })).toHaveLength(2)
  })

  it('excluir abre um diálogo só', () => {
    montarComArquivos([file, segundo], true)

    fireEvent.click(screen.getAllByRole('button', { name: 'operation.documents.remove' })[0])

    expect(screen.getAllByRole('dialog')).toHaveLength(1)
  })

  it('canSubmit falso: sem enviar, sem lixeira, sem aviso', () => {
    montarComArquivos([file], false)

    expect(screen.queryByRole('button', { name: 'operation.documents.upload' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'operation.documents.remove' })).toBeNull()
    expect(screen.queryByText('operation.documents.uploadHint')).toBeNull()
  })
})
