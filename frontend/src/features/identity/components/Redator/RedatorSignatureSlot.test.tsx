import { useEffect } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import type { RedatorDocumentData } from '@shared/types/generated'
import { RedatorSignatureSlot } from './RedatorSignatureSlot'

// `t` devolve a chave: o que se prova é qual texto o slot escolhe.
vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return { ...(await importOriginal<typeof import('react-i18next')>()), useTranslation: mockUseTranslation() }
})

const limpo = new File(['png'], 'firma.png', { type: 'image/png' })
const montagens = vi.hoisted(() => ({ n: 0 }))

// O componente compartilhado já tem a sua suíte: aqui só importa o contrato com
// ele — o que o slot faz com o PNG confirmado, e que remonta depois do sucesso.
vi.mock('@shared/ui', async (importOriginal) => {
  const real = await importOriginal<typeof import('@shared/ui')>()
  return {
    ...real,
    AppSignatureUpload: ({ onConfirm, label }: { onConfirm: (f: File) => void; label: string }) => {
      // Conta as montagens: remontar (trocar a `key`) é o que zera a prévia.
      useEffect(() => { montagens.n += 1 }, [])
      return <button type="button" onClick={() => onConfirm(limpo)}>{label}</button>
    },
  }
})

const existente: RedatorDocumentData = {
  id: 7, type: 'FIRMA', original_name: 'firma.png', mime: 'image/png', size: 2048,
  valid_until: null, created_at: '2026-10-01T10:00:00Z', download_url: 'https://x/firma.png',
}

function montar(over: Partial<Parameters<typeof RedatorSignatureSlot>[0]> = {}) {
  const props = {
    mode: 'edit' as const,
    doc: undefined,
    staged: undefined,
    uploading: false,
    onStage: vi.fn(),
    onUnstage: vi.fn(),
    onUpload: vi.fn(() => Promise.resolve(true)),
    onRemoveDoc: vi.fn(),
    onPreview: vi.fn(),
    ...over,
  }
  render(<RedatorSignatureSlot {...props} />)
  return props
}

describe('RedatorSignatureSlot', () => {
  beforeEach(() => { montagens.n = 0 })

  it('slot Firma do dialog sobe o PNG confirmado', async () => {
    const p = montar()

    fireEvent.click(screen.getByRole('button', { name: 'redator.signatureChoose' }))

    expect(p.onUpload).toHaveBeenCalledWith(limpo)
    await waitFor(() => expect(montagens.n).toBe(2))
  })

  it('em criação o PNG vai para o stage e não para o upload', () => {
    const p = montar({ mode: 'create' })

    fireEvent.click(screen.getByRole('button', { name: 'redator.signatureChoose' }))

    expect(p.onStage).toHaveBeenCalledWith(limpo)
    expect(p.onUpload).not.toHaveBeenCalled()
  })

  it('não mostra tag de status nem validade', () => {
    montar({ doc: existente })

    expect(screen.getByText('documentType.FIRMA')).toBeTruthy()
    expect(screen.queryByText(/documentStatus/)).toBeNull()
  })

  it('remonta o seletor depois do sucesso do envio', async () => {
    montar()
    expect(montagens.n).toBe(1)

    fireEvent.click(screen.getByRole('button', { name: 'redator.signatureChoose' }))

    await waitFor(() => expect(montagens.n).toBe(2))
  })

  it('mantém o seletor montado quando o envio falha', async () => {
    const onUpload = vi.fn(() => Promise.resolve(false))
    montar({ onUpload })

    fireEvent.click(screen.getByRole('button', { name: 'redator.signatureChoose' }))

    await waitFor(() => expect(onUpload).toHaveBeenCalled())
    expect(montagens.n).toBe(1)
  })
})
