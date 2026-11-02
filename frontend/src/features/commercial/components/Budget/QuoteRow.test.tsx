import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { QuoteData } from '@shared/types/generated'
import { QuoteRow } from './QuoteRow'

// Ecoa a interpolação: o nome acessível das ações do arquivo leva o DOCUMENTO e
// o curso da linha, que distingue uma cotação da outra (D-23). Só o curso faria o
// excluir do arquivo soar como o da cotação (Q-4 da revisão do bloco 47).
vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation({
      t: (key, opts) => {
        const arg = opts?.tipo ?? opts?.curso
        return arg === undefined ? key : `${key}:${String(arg)}`
      },
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

    expect(screen.getByRole('button', { name: 'common.uploadNamed:quote.documentOf:Alta tensión' })).toBeTruthy()
  })

  it('com arquivo, substituir e excluir levam o curso; a lixeira da cotação segue com o nome simples', () => {
    montar([arquivo])

    expect(screen.getByRole('button', { name: 'common.replaceNamed:quote.documentOf:Alta tensión' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'common.deleteNamed:quote.documentOf:Alta tensión' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'common.delete' })).toBeTruthy()
  })
})
