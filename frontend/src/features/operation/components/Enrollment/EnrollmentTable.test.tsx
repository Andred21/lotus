import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { renderWithProviders } from '@shared/testing/providers'
import { setViewportWidth } from '@shared/testing/viewport'
import { useSessionStore } from '@shared/stores/sessionStore'
import type { EnrollmentData } from '@shared/types/generated'
import { EnrollmentTable } from './EnrollmentTable'

vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation(),
  }
})

const MATRICULA: EnrollmentData = {
  id: 5, turma_id: 1, student_id: 9, name: 'Ana Torres', rut: '11.111.111-1', email: null, phone: null,
  approval_status: undefined, attendance_pct: null, grades: null, result_locked: false, photo_url: null,
}

function comPermissoes(permissions: string[]) {
  useSessionStore.setState({
    status: 'authenticated',
    user: {
      id: 1, uuid: 'u-1', name: 'Quien Sea', email: 'q@lotus.cl', type: 'admin',
      is_active: true, roles: [], permissions, photo_url: null,
    },
  })
}

const larguraDaColunaDeAcoes = () =>
  (document.querySelector('thead tr th:last-child') as HTMLTableCellElement).style.width

const montar = (over: { registroBloqueado?: boolean; enrollments?: EnrollmentData[] } = {}) =>
  renderWithProviders(
    <EnrollmentTable
      turmaId={1}
      registroBloqueado={over.registroBloqueado ?? false}
      enrollments={over.enrollments ?? [MATRICULA]}
      loading={false}
      onRemove={() => {}}
      removing={false}
      onResetRemove={() => {}}
    />,
  )

afterEach(() => {
  useSessionStore.setState({ user: null, status: 'unauthenticated' })
})

/** Item 23 (`D-65`): a presa de 9rem cobria 172px do nome em 390x844. */
describe('EnrollmentTable — ações da linha', () => {
  it('no desktop, resultado e remover são ícones soltos; remover é de perigo; coluna de 9rem', () => {
    comPermissoes(['operation.enrollment.manage'])
    montar()

    expect(screen.getByRole('button', { name: 'certificate.result.action' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'operation.enrollment.remove' }).className).toContain('p-button-danger')
    expect(larguraDaColunaDeAcoes()).toBe('9rem')
  })

  it('em 390px, a linha tem UM botão de ações e a coluna encolhe para ele', () => {
    comPermissoes(['operation.enrollment.manage'])
    setViewportWidth(390)
    montar()

    expect(screen.getByRole('button', { name: 'common.moreActions' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'operation.enrollment.remove' })).toBeNull()
    expect(larguraDaColunaDeAcoes()).toBe('4.5rem')
  })

  it('sem manage, só remover: em 390px ele fica solto, sem menu', () => {
    comPermissoes([])
    setViewportWidth(390)
    montar()

    expect(screen.getByRole('button', { name: 'operation.enrollment.remove' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'common.moreActions' })).toBeNull()
  })

  it('remover continua abrindo a confirmação', async () => {
    comPermissoes([])
    montar()

    fireEvent.click(screen.getByRole('button', { name: 'operation.enrollment.remove' }))
    expect(await screen.findByText('operation.enrollment.removeTitle')).toBeTruthy()
  })

  it('abaixo de sm, o piso é o medido para esta visão (item 23, audit §5)', () => {
    comPermissoes(['operation.enrollment.manage'])
    montar()

    const tabela = document.querySelector('table') as HTMLTableElement
    expect(tabela.className).toContain('sm:min-w-[42rem]')
    expect(tabela.style.getPropertyValue('--table-narrow-floor')).toBe('40rem')
  })
})

describe('EnrollmentTable — nota e presença', () => {
  it.each([false, true])('mostra nota e presença no locale ativo; ausência é travessão (registroBloqueado=%s)', (registroBloqueado) => {
    comPermissoes([])
    montar({
      registroBloqueado,
      enrollments: [
        { ...MATRICULA, id: 1, grades: { final: '6,4' } as never, attendance_pct: '87.50' },
        { ...MATRICULA, id: 2, name: 'Sin Nota' },
      ],
    })

    expect(screen.getByText('6,4')).toBeTruthy()
    expect(screen.getByText('87,5 %')).toBeTruthy()
    expect(screen.getAllByText('—')).toHaveLength(2)
    const cabecalhos = Array.from(document.querySelectorAll('thead th')).map((th) => th.textContent)
    expect(cabecalhos).toContain('operation.enrollment.table.grade')
    expect(cabecalhos).toContain('operation.enrollment.table.attendance')
  })
})

describe('EnrollmentTable — turma concluída', () => {
  const concluida = (result_locked: boolean) =>
    montar({ registroBloqueado: true, enrollments: [{ ...MATRICULA, result_locked }] })

  it('admin corrige o resultado de matrícula sem certificado, e não remove', () => {
    comPermissoes(['operation.enrollment.manage'])
    concluida(false)

    expect(screen.getByRole('button', { name: 'certificate.result.action' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'operation.enrollment.remove' })).toBeNull()
  })

  it('matrícula com certificado vigente não oferece correção', () => {
    comPermissoes(['operation.enrollment.manage'])
    concluida(true)

    expect(screen.queryByRole('button', { name: 'certificate.result.action' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'operation.enrollment.remove' })).toBeNull()
  })

  it('sem manage a coluna de ações não existe: o último th é o de status', () => {
    comPermissoes([])
    concluida(false)

    const ultimo = document.querySelector('thead tr th:last-child') as HTMLTableCellElement
    expect(ultimo.textContent).toContain('operation.enrollment.table.status')
  })
})
