import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, within } from '@testing-library/react'
import { renderWithProviders } from '@shared/testing/providers'
import type { TriageRow } from '../../hooks/useImportStudentsFlow'
import { ImportTriageTable } from './ImportTriageTable'

vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    // Devolve a chave e os parâmetros: o que se prova é QUAL texto a tela escolhe.
    useTranslation: mockUseTranslation({ t: (k, o) => (o ? `${k} ${JSON.stringify(o)}` : k) }),
  }
})

const base: TriageRow = {
  row: 2, rut: '11.111.111-1', name: 'Ana Pérez', email: 'ana@x.cl', phone: null,
  status: 'new', message: null, current_client: null, archived: false, divergent: [],
  registered_name: null, registered_email: null, registered_phone: null,
  edited: false, removed: false, update_registration: false,
}
const row = (over: Partial<TriageRow>): TriageRow => ({ ...base, ...over })

const DIVERGENT = row({
  row: 4, rut: '15.111.222-K', name: 'Marta Rojas', status: 'registered',
  divergent: ['name'], registered_name: 'Marta R. Díaz',
})

function montar(rows: TriageRow[], over: { canUpdateRegistration?: boolean } = {}) {
  const fns = { onEdit: vi.fn(), onRemove: vi.fn(), onSetUpdate: vi.fn() }
  renderWithProviders(
    <ImportTriageTable rows={rows} canUpdateRegistration={over.canUpdateRegistration ?? true} clientName="CGE" {...fns} />,
  )
  return fns
}

const radios = () => screen.queryAllByRole('radio')

describe('ImportTriageTable', () => {
  it('mostra a mensagem no lugar da tabela quando não há linhas', () => {
    montar([])
    expect(screen.getByText('operation.enrollment.import.empty')).toBeTruthy()
    expect(screen.queryByRole('table')).toBeNull()
  })

  it('mostra a troca de empresa como "atual → da turma"', () => {
    montar([row({ row: 3, status: 'moves', current_client: 'Enel' })])
    expect(screen.getByText(/note\.moves.*Enel.*CGE/)).toBeTruthy()
  })

  it('mostra o aluno arquivado, o ya matriculado e a mensagem de erro', () => {
    montar([
      row({ row: 3, status: 'registered', archived: true }),
      row({ row: 5, status: 'already_enrolled' }),
      row({ row: 6, status: 'error', message: 'RUT inválido' }),
    ])
    expect(screen.getByText('operation.enrollment.import.note.archived')).toBeTruthy()
    expect(screen.getByText('operation.enrollment.import.note.skipped')).toBeTruthy()
    expect(screen.getByText('RUT inválido')).toBeTruthy()
  })

  it('mostra o valor do cadastro nos campos divergentes', () => {
    montar([DIVERGENT])
    expect(screen.getByText(/note\.registry.*Marta R\. Díaz/)).toBeTruthy()
  })

  it('oferece Mantener/Actualizar só em linha cadastrada divergente, com a permissão', () => {
    montar([DIVERGENT, row({ row: 5, status: 'new' }), row({ row: 6, status: 'error', message: 'x' })])
    expect(radios()).toHaveLength(2)
  })

  it('não oferece Mantener/Actualizar sem a permissão de atualizar', () => {
    montar([DIVERGENT], { canUpdateRegistration: false })
    expect(radios()).toHaveLength(0)
  })

  it('oferece o par em linha cadastrada editada, mesmo sem divergência', () => {
    montar([row({ status: 'registered', edited: true, update_registration: true })])
    expect(radios()).toHaveLength(2)
    expect(screen.getByText('operation.enrollment.import.note.edited')).toBeTruthy()
  })

  it('marca Actualizar pelo rádio', () => {
    const { onSetUpdate } = montar([DIVERGENT])
    fireEvent.click(screen.getByLabelText('operation.enrollment.import.update'))
    expect(onSetUpdate).toHaveBeenCalledWith(4, true)
  })

  it('não oferece editar em linha cadastrada sem permissão, nem em ya matriculado', () => {
    montar([DIVERGENT, row({ row: 5, status: 'already_enrolled' })], { canUpdateRegistration: false })
    expect(screen.queryAllByLabelText('operation.enrollment.import.editRow')).toHaveLength(0)
    expect(screen.getAllByLabelText('operation.enrollment.import.removeRow')).toHaveLength(2)
  })

  it('quita a linha', () => {
    const { onRemove } = montar([row({ row: 3 })])
    fireEvent.click(screen.getByLabelText('operation.enrollment.import.removeRow'))
    expect(onRemove).toHaveBeenCalledWith(3)
  })

  it('abre o editor da linha, salva a correção e fecha', () => {
    const { onEdit } = montar([row({ row: 6, rut: 'xx', status: 'error', message: 'RUT inválido' })])
    fireEvent.click(screen.getByLabelText('operation.enrollment.import.editRow'))
    const editor = screen.getByRole('group')
    fireEvent.change(within(editor).getByLabelText('operation.enrollment.import.col.rut'), {
      target: { value: '12.345.678-5' },
    })
    fireEvent.click(within(editor).getByText('common.save'))
    expect(onEdit).toHaveBeenCalledWith(6, { rut: '12.345.678-5', name: 'Ana Pérez', email: 'ana@x.cl', phone: null })
    expect(screen.queryByRole('group')).toBeNull()
  })

  it('trava o RUT do editor em linha cadastrada', () => {
    montar([DIVERGENT])
    fireEvent.click(screen.getByLabelText('operation.enrollment.import.editRow'))
    const rut = within(screen.getByRole('group')).getByLabelText('operation.enrollment.import.col.rut') as HTMLInputElement
    expect(rut.disabled).toBe(true)
  })

  it('cancelar o editor não grava', () => {
    const { onEdit } = montar([row({ row: 3 })])
    fireEvent.click(screen.getByLabelText('operation.enrollment.import.editRow'))
    fireEvent.click(within(screen.getByRole('group')).getByText('common.cancel'))
    expect(onEdit).not.toHaveBeenCalled()
    expect(screen.queryByRole('group')).toBeNull()
  })
})
