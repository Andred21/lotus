import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import i18n from '@shared/config/i18n'
import { formatDate } from '@shared/lib'
import type { RedatorProfileDocumentData } from '@shared/types/generated'
import { ProfileDocumentSlot } from './ProfileDocumentSlot'

// O `t` devolve a chave, mas ECOA a interpolação: sem isso a data formatada —
// que é o que o UI-01 mede — não chegaria ao DOM em teste nenhum.
vi.mock('react-i18next', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-i18next')>()),
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts?.date === undefined ? key : `${key}:${String(opts.date)}`,
  }),
}))

// O idioma da INTERFACE, não o do runtime: em jsdom o detector resolve pelo
// `navigator.language` (en-US), e é justamente a divergência entre os dois que
// o UI-01 relatou. Pinado aqui, a guarda vale com qualquer TZ da máquina.
beforeAll(async () => {
  await i18n.changeLanguage('es-CL')
})

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

  it('formata a validade no idioma da interface, sem voltar um dia (UI-01)', () => {
    montar({ valid_until: '2028-08-10' })

    // `new Date(2028, 7, 10)` é a MEIA-NOITE LOCAL de 10/08 — o mesmo instante
    // que a âncora `T00:00:00` produz. Um `new Date('2028-08-10')` cru cai em
    // meia-noite UTC e reprova aqui em todo fuso a oeste de Greenwich, que é o
    // do cliente.
    expect(screen.getByText(/profile\.documents\.validUntil/).textContent).toBe(
      `profile.documents.validUntil:${formatDate(new Date(2028, 7, 10))}`,
    )
  })

  it('sem self_service NAO ha envio, e a gestao e nomeada', () => {
    montar({ type: 'REUF', self_service: false, status: 'vigente' })

    expect(screen.getByText('profile.documents.managedByAdmin')).toBeTruthy()
    expect(document.querySelector('input[type="file"]')).toBeNull()
  })
})
