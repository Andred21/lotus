import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { renderWithProviders } from '@shared/testing/providers'
import { useSessionStore } from '@shared/stores/sessionStore'
import type { CourseData } from '@shared/types/generated'
import { CourseRowActions } from './CourseRowActions'

vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation(),
  }
})

const open = vi.fn()
const OPENER_LIMPO = { open, pending: false, popupBlocked: false, message: null as string | null }
/** Mutável de propósito: o aviso é ramo do RETORNO do abridor; o caminho do
 * blob é assunto do `useBlobTabOpener.test.tsx`. */
let opener = { ...OPENER_LIMPO }
vi.mock('../../hooks/useCertificatePreviewOpener', () => ({
  useCertificatePreviewOpener: () => opener,
}))

const CURSO = { id: 1, name: 'Alta tensión' } as unknown as CourseData

function comPermissoes(permissions: string[]) {
  useSessionStore.setState({
    status: 'authenticated',
    user: {
      id: 1, uuid: 'u-1', name: 'Quien Sea', email: 'q@lotus.cl', type: 'admin',
      is_active: true, roles: [], permissions, photo_url: null,
    },
  })
}

const montar = (archived = false) =>
  renderWithProviders(
    <CourseRowActions
      course={CURSO} archived={archived} busy={false} collapsed={false}
      onView={() => {}} onArchive={() => {}} onRestore={() => {}}
    />,
  )

afterEach(() => {
  open.mockClear()
  opener = { ...OPENER_LIMPO }
  useSessionStore.setState({ user: null, status: 'unauthenticated' })
})

describe('CourseRowActions — a amostra do certificado', () => {
  it('com a permissão de ver certificado, o botão abre a amostra do curso da linha', () => {
    comPermissoes(['certification.certificate.view'])
    montar()

    fireEvent.click(screen.getByRole('button', { name: 'course.certificatePreview' }))

    expect(open).toHaveBeenCalledWith(1)
  })

  it('sem a permissão, o botão não aparece', () => {
    comPermissoes(['catalog.course.delete'])
    montar()

    expect(screen.queryByRole('button', { name: 'course.certificatePreview' })).toBeNull()
  })

  it('na visão de arquivados o botão não aparece, mesmo com a permissão', () => {
    comPermissoes(['certification.certificate.view', 'catalog.course.restore'])
    montar(true)

    expect(screen.queryByRole('button', { name: 'course.certificatePreview' })).toBeNull()
  })

  it('popup bloqueado mostra o texto próprio, não a mensagem do erro', () => {
    comPermissoes(['certification.certificate.view'])
    opener = { ...OPENER_LIMPO, popupBlocked: true, message: 'não deveria aparecer' }
    montar()

    expect(screen.getByText('certificate.popupBlocked')).toBeTruthy()
    expect(screen.queryByText('não deveria aparecer')).toBeNull()
  })

  it('erro da requisição aparece abaixo dos botões', () => {
    comPermissoes(['certification.certificate.view'])
    opener = { ...OPENER_LIMPO, message: 'No tienes permiso para ver el certificado.' }
    montar()

    expect(screen.getByText('No tienes permiso para ver el certificado.')).toBeTruthy()
  })
})
