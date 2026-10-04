import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { renderWithProviders } from '@shared/testing/providers'
import { setViewportWidth } from '@shared/testing/viewport'
import { useSessionStore } from '@shared/stores/sessionStore'
import { ArchivedEnrollmentsList, type ArchivedEnrollmentRow } from './ArchivedEnrollmentsList'

vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation(),
  }
})

const ARQUIVADA: ArchivedEnrollmentRow = {
  id: 5, turma_id: 1, student_id: 9, name: 'Ana Torres', rut: '11.111.111-1', email: null, phone: null,
  approval_status: undefined, attendance_pct: null, grades: null, photo_url: null,
  archived_at: '2026-09-01T10:00:00Z', archived_by: 'Admin Lotus',
}

afterEach(() => {
  useSessionStore.setState({ user: null, status: 'unauthenticated' })
})

const larguraDaColunaDeAcoes = () =>
  (document.querySelector('thead tr th:last-child') as HTMLTableCellElement).style.width

function montar(onRestore: (id: number) => void = () => {}) {
  useSessionStore.setState({
    status: 'authenticated',
    user: {
      id: 1, uuid: 'u-1', name: 'Quien Sea', email: 'q@lotus.cl', type: 'admin',
      is_active: true, roles: [], permissions: ['operation.enrollment.restore'], photo_url: null,
    },
  })
  return renderWithProviders(
    <ArchivedEnrollmentsList
      registroBloqueado={false}
      enrollments={[ARQUIVADA]}
      loading={false}
      onRetry={() => {}}
      onRestore={onRestore}
      restoring={false}
    />,
  )
}

/** Item 23: mesma forma das outras seis visões de arquivados — rótulo de `sm`
 * para cima, ícone com nome acessível abaixo. */
describe('ArchivedEnrollmentsList — restaurar', () => {
  it('no desktop, restaurar é rotulado numa coluna de 10rem, e chama onRestore com o id', () => {
    const onRestore = vi.fn()
    montar(onRestore)

    const restaurar = screen.getByRole('button', { name: 'archive.restoreAction' })
    expect(restaurar.textContent).toContain('archive.restoreAction')
    expect(larguraDaColunaDeAcoes()).toBe('10rem')
    fireEvent.click(restaurar)
    expect(onRestore).toHaveBeenCalledWith(5)
  })

  it('em 390px, restaurar fica só ícone e a coluna encolhe para ele', () => {
    setViewportWidth(390)
    montar()

    expect(screen.getByRole('button', { name: 'archive.restoreAction' }).textContent?.trim()).toBe('')
    expect(larguraDaColunaDeAcoes()).toBe('4.5rem')
  })

  it('abaixo de sm, o piso é o medido para esta visão (item 23, audit §5)', () => {
    montar()

    const tabela = document.querySelector('table') as HTMLTableElement
    expect(tabela.className).toContain('sm:min-w-[42rem]')
    expect(tabela.style.getPropertyValue('--table-narrow-floor')).toBe('31.5rem')
  })
})
