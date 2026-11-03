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
  status: 'new', message: null, update_refusal: null, current_client: null, archived: false, divergent: [],
  registered_name: null, registered_email: null, registered_phone: null,
  edited: false, removed: false, update_registration: false, update_blocked: null, refused: false,
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

describe('ImportTriageTable: recusadas, nomes e limites', () => {
  it('nomeia o par Mantener/Actualizar pela fila', () => {
    montar([DIVERGENT])
    expect(screen.getByRole('radiogroup', { name: /import\.registrationGroup.*"row":4/ })).toBeTruthy()
  })

  it('recusada cadastrada não editada aparece como erro, com a mensagem, e mantém o par e o registro', () => {
    montar([row({
      row: 4, status: 'moves', current_client: 'Enel', refused: true, update_registration: true,
      message: 'Sin permiso para actualizar', divergent: ['name'], registered_name: 'Marta R. Díaz',
    })])
    expect(screen.getByText('operation.enrollment.import.situation.error')).toBeTruthy()
    expect(screen.queryByText('operation.enrollment.import.situation.moves')).toBeNull()
    expect(screen.getByText('Sin permiso para actualizar')).toBeTruthy()
    expect(screen.getByText(/note\.moves.*Enel.*CGE/)).toBeTruthy()
    expect(screen.getByText(/note\.registry.*Marta R\. Díaz/)).toBeTruthy()
    expect(radios()).toHaveLength(2)
  })

  it('linha editada não repete a mensagem antiga, só o aviso de edição', () => {
    montar([
      row({ row: 3, status: 'error', message: 'RUT inválido', edited: true }),
      row({ row: 4, status: 'registered', refused: true, edited: true, message: 'Sin permiso', update_registration: true }),
    ])
    expect(screen.queryByText('RUT inválido')).toBeNull()
    expect(screen.queryByText('Sin permiso')).toBeNull()
    expect(screen.getAllByText('operation.enrollment.import.note.edited')).toHaveLength(2)
  })

  it('e-mail longo quebra dentro da coluna e o RUT não quebra', () => {
    const longo = 'nombre.muy.largo.de.la.persona@empresa-con-dominio-extenso.example.cl'
    montar([row({ rut: '17.111.110-2', email: longo })])
    expect(screen.getByText(longo).className).toContain('break-all')
    expect(screen.getByText('17.111.110-2').className).toContain('whitespace-nowrap')
  })

  it('o editor limita telefone e e-mail ao tamanho do cadastro', () => {
    montar([row({ row: 3 })])
    fireEvent.click(screen.getByLabelText('operation.enrollment.import.editRow'))
    const editor = within(screen.getByRole('group'))
    const campo = (k: string) => editor.getByLabelText(`operation.enrollment.import.col.${k}`) as HTMLInputElement
    expect(campo('phone').maxLength).toBe(30)
    expect(campo('email').maxLength).toBe(255)
  })
})
