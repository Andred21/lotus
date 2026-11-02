import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { QuoteData } from '@shared/types/generated'
import { QuoteRow } from './QuoteRow'

// Ecoa o `tipo` da interpolação: o nome acessível das ações do arquivo leva o
// curso da linha, que é o que distingue uma cotação da outra (D-23).
vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation({
      t: (key, opts) => (opts?.tipo === undefined ? key : `${key}:${String(opts.tipo)}`),
    }),
  }
})

const arquivo = {
  id: 5,
  type: 'quote_document',
  original_name: 'cot.pdf',
  mime: 'application/pdf',
  size: 10,
  created_at: '2026-10-01T10:00:00Z',
  download_url: 'https://minio.local/cot.pdf',
}

function montar(files: unknown[]) {
  const quote = { id: 1, course_id: 7, status: 'pending', value_uf: '10', student_count: 2, files } as unknown as QuoteData
  render(
    <QuoteRow
      quote={quote}
      striped={false}
      courseName="Alta tensión"
      uploading={false}
      onRemove={() => {}}
      onUpload={() => {}}
      onRemoveFile={() => {}}
      onSizeReject={() => {}}
    />,
  )
}

describe('QuoteRow — nome acessível do arquivo', () => {
  it('sem arquivo, o enviar leva o curso da linha', () => {
    montar([])

    expect(screen.getByRole('button', { name: 'common.uploadNamed:Alta tensión' })).toBeTruthy()
  })

  it('com arquivo, substituir e excluir levam o curso; a lixeira da cotação segue com o nome simples', () => {
    montar([arquivo])

    expect(screen.getByRole('button', { name: 'common.replaceNamed:Alta tensión' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'common.deleteNamed:Alta tensión' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'common.delete' })).toBeTruthy()
  })
})
