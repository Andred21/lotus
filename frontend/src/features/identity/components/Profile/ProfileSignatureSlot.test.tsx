import { useEffect } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import type { RedatorProfileDocumentData } from '@shared/types/generated'
import { ProfileSignatureSlot } from './ProfileSignatureSlot'

// `t` devolve a chave: o que se prova é qual texto o slot escolhe.
vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return { ...(await importOriginal<typeof import('react-i18next')>()), useTranslation: mockUseTranslation() }
})

const limpo = new File(['png'], 'firma.png', { type: 'image/png' })
const montagens = vi.hoisted(() => ({ n: 0 }))

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

function doc(over: Partial<RedatorProfileDocumentData> = {}): RedatorProfileDocumentData {
  return {
    type: 'FIRMA', status: 'vigente', self_service: true, valid_until: null,
    original_name: null, size: null, created_at: null, download_url: null, ...over,
  }
}

function montar(
  over: Partial<RedatorProfileDocumentData> = {},
  onUpload = vi.fn<(file: File) => Promise<boolean>>(() => Promise.resolve(true)),
) {
  render(<ProfileSignatureSlot doc={doc(over)} uploading={false} onUpload={onUpload} onPreview={() => {}} />)
  return onUpload
}

describe('ProfileSignatureSlot', () => {
  beforeEach(() => { montagens.n = 0 })

  it('slot Firma do perfil sobe o PNG confirmado e não mostra status', async () => {
    const onUpload = montar()

    expect(screen.queryByText(/profile\.docStatus|documentStatus/)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'profile.documents.sendSignature' }))

    expect(onUpload).toHaveBeenCalledWith(limpo)
    await waitFor(() => expect(montagens.n).toBe(2))
  })

  it('com assinatura enviada mostra o arquivo e o verbo de substituir', () => {
    montar({ original_name: 'firma.png', size: 2048, download_url: 'https://x/firma.png', created_at: '2026-10-01T10:00:00Z' })

    expect(screen.getByText('firma.png')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'profile.documents.replaceSignature' })).toBeTruthy()
  })

  it('mantém o seletor montado quando o envio falha', async () => {
    const onUpload = montar({}, vi.fn<(file: File) => Promise<boolean>>(() => Promise.resolve(false)))

    fireEvent.click(screen.getByRole('button', { name: 'profile.documents.sendSignature' }))

    await waitFor(() => expect(onUpload).toHaveBeenCalled())
    expect(montagens.n).toBe(1)
  })
})
