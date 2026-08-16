import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import type { RedatorProfileDocumentData } from '@shared/types/generated'
import { ProfileDocumentSlot } from './ProfileDocumentSlot'

vi.mock('react-i18next', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-i18next')>()),
  useTranslation: () => ({ t: (key: string) => key }),
}))

afterEach(cleanup)

function doc(over: Partial<RedatorProfileDocumentData> = {}): RedatorProfileDocumentData {
  return {
    type: 'CV',
    status: 'vigente',
    self_service: true,
    valid_until: null,
    original_name: 'cv.pdf',
    size: 1024,
    created_at: '2026-08-01T10:00:00Z',
    download_url: 'https://minio/cv.pdf',
    ...over,
  }
}

function montar(over: Partial<RedatorProfileDocumentData> = {}) {
  return render(
    <ProfileDocumentSlot
      doc={doc(over)}
      uploading={false}
      onUpload={() => {}}
      onSizeReject={() => {}}
      onPreview={() => {}}
    />,
  )
}

describe('ProfileDocumentSlot', () => {
  it('exibe o status do BACKEND, sem recalcular por valid_until', () => {
    montar({ status: 'vence_em_breve', valid_until: '2099-01-01' })

    expect(screen.getByText('profile.docStatus.vence_em_breve')).toBeTruthy()
  })

  it('slot ausente oferece ENVIO, e o que ja tem documento oferece SUBSTITUIR', () => {
    const { unmount } = montar({
      status: 'ausente',
      original_name: null,
      download_url: null,
      size: null,
    })

    expect(screen.getByText('profile.docStatus.ausente')).toBeTruthy()
    expect(screen.getByText('profile.documents.send')).toBeTruthy()
    expect(screen.queryByText('profile.documents.replace')).toBeNull()
    expect(screen.queryByText('profile.documents.managedByAdmin')).toBeNull()
    unmount()

    // O rótulo é o único aviso de que substituir apaga o anterior.
    montar()
    expect(screen.getByText('profile.documents.replace')).toBeTruthy()
  })

  it('sem self_service NAO ha envio, e a gestao e nomeada', () => {
    montar({ type: 'REUF', self_service: false, status: 'vigente' })

    expect(screen.getByText('profile.documents.managedByAdmin')).toBeTruthy()
    expect(document.querySelector('input[type="file"]')).toBeNull()
  })
})
