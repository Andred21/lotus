import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import type { RedatorDocumentData } from '@shared/types/generated'
import { SlotBody, type SlotBodyProps } from './SlotBody'

// `t` devolve a chave: o que se prova é qual texto o slot escolhe.
vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return { ...(await importOriginal<typeof import('react-i18next')>()), useTranslation: mockUseTranslation() }
})

const doc = {
  id: 7,
  original_name: 'cv-juan.pdf',
  mime: 'application/pdf',
  size: 1024,
  created_at: '2026-10-01T10:00:00Z',
  download_url: 'https://minio.local/cv-juan.pdf',
} as RedatorDocumentData

function props(over: Partial<SlotBodyProps> = {}): SlotBodyProps {
  return {
    type: 'curriculum',
    mode: 'edit',
    doc,
    staged: undefined,
    uploading: false,
    onStage: vi.fn(),
    onUnstage: vi.fn(),
    onUpload: vi.fn(),
    onRemoveDoc: vi.fn(),
    onPreview: vi.fn(),
    onSizeReject: vi.fn(),
    ...over,
  } as SlotBodyProps
}

const nomes = () => screen.getAllByRole('button').map((b) => b.getAttribute('aria-label'))

describe('SlotBody — o CV do redator sobre o AppFileSlot', () => {
  it('edit com documento: ver, baixar, substituir, excluir', () => {
    render(<SlotBody {...props()} />)

    expect(nomes()).toEqual(['common.preview', 'common.download', 'common.replace', 'common.delete'])
  })

  it('excluir confirma antes de chamar onRemoveDoc com o id', () => {
    const onRemoveDoc = vi.fn()
    render(<SlotBody {...props({ onRemoveDoc })} />)

    fireEvent.click(screen.getByRole('button', { name: 'common.delete' }))
    expect(onRemoveDoc).not.toHaveBeenCalled()
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'common.delete' }))

    expect(onRemoveDoc).toHaveBeenCalledWith(7)
  })

  it('edit sem documento: "não carregado" e só o enviar', () => {
    render(<SlotBody {...props({ doc: undefined })} />)

    expect(screen.getByText('common.notLoaded')).toBeTruthy()
    expect(nomes()).toEqual(['common.upload'])
  })

  it('view: só ver e baixar', () => {
    render(<SlotBody {...props({ mode: 'view' })} />)

    expect(nomes()).toEqual(['common.preview', 'common.download'])
  })

  it('create com arquivo em stage: só o tirar do stage', () => {
    const onUnstage = vi.fn()
    const staged = new File(['x'], 'novo.pdf', { type: 'application/pdf' })
    render(<SlotBody {...props({ mode: 'create', doc: undefined, staged, onUnstage })} />)

    fireEvent.click(screen.getByRole('button', { name: 'common.delete' }))

    expect(onUnstage).toHaveBeenCalledWith('curriculum')
  })

  it('create sem arquivo: só o enviar', () => {
    render(<SlotBody {...props({ mode: 'create', doc: undefined })} />)

    expect(nomes()).toEqual(['common.upload'])
  })
})
