import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { renderWithProviders } from '@shared/testing/providers'
import type { ImportResultData } from '@shared/types/generated'
import type { TriageRow } from '../../hooks/useImportStudentsFlow'
import { ImportDialog } from './ImportDialog'

vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation({ t: (k, o) => (o ? `${k} ${JSON.stringify(o)}` : k) }),
  }
})

const flow = vi.hoisted(() => ({ current: {} as Record<string, unknown> }))
vi.mock('../../hooks/useImportStudentsFlow', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../hooks/useImportStudentsFlow')>()),
  useImportStudentsFlow: () => flow.current,
}))

const ROW: TriageRow = {
  row: 2, rut: '11.111.111-1', name: 'Ana Pérez', email: 'ana@x.cl', phone: null, status: 'new',
  message: null, current_client: null, archived: false, divergent: [], registered_name: null,
  registered_email: null, registered_phone: null, edited: false, removed: false, update_registration: false, refused: false,
}
const RESULT: ImportResultData = {
  created: 1, relinked: 0, already_enrolled: 0, moved: [], errors: [], enrolled_total: 1, contracted_count: 10,
}

const fns = {
  setSizeError: vi.fn(), upload: vi.fn(), edit: vi.fn(), remove: vi.fn(), setUpdate: vi.fn(),
  confirm: vi.fn(), reviewRefused: vi.fn(), downloadTemplate: vi.fn(), close: vi.fn(),
}

function setFlow(over: Record<string, unknown>) {
  flow.current = {
    step: 'upload', rows: [], counts: { new: 0, registered: 0, moves: 0, already_enrolled: 0, error: 0 },
    sendableCount: 0, canUpdateRegistration: true, result: null, pending: false, templatePending: false, sizeError: null, message: null,
    ...fns, ...over,
  }
}

const montar = (onHide = vi.fn()) => {
  renderWithProviders(<ImportDialog turmaId={7} visible onHide={onHide} turmaLabel="2026-118" clientName="CGE" />)
  return onHide
}

beforeEach(() => vi.clearAllMocks())

describe('ImportDialog', () => {
  it('no passo de upload mostra a ajuda e baixa o modelo', () => {
    setFlow({})
    montar()
    expect(screen.getByText('operation.enrollment.import.help')).toBeTruthy()
    expect(screen.getByText(/operation\.enrollment\.import\.title/).textContent).toContain('2026-118')
    // O modelo sai no corpo, ao lado de Elegir archivo, com o ícone do tipo de arquivo.
    const template = screen.getByRole('button', { name: 'operation.enrollment.import.template' })
    expect(template.closest('.p-dialog-header')).toBeNull()
    expect(template.querySelector('.pi-file-excel')).toBeTruthy()
    fireEvent.click(template)
    expect(fns.downloadTemplate).toHaveBeenCalled()
  })

  it('mostra a mensagem da API no diálogo', () => {
    setFlow({ message: 'Turma concluída' })
    montar()
    expect(screen.getByText('Turma concluída')).toBeTruthy()
  })

  it('na triagem mostra as contagens e confirma as linhas enviáveis', () => {
    setFlow({
      step: 'triage', rows: [ROW], sendableCount: 1,
      counts: { new: 1, registered: 0, moves: 0, already_enrolled: 0, error: 0 },
    })
    montar()
    expect(screen.getByText(/counts\.new/)).toBeTruthy()
    expect(screen.getByText('operation.enrollment.import.footerHint')).toBeTruthy()
    fireEvent.click(screen.getByText(/operation\.enrollment\.import\.confirm/))
    expect(fns.confirm).toHaveBeenCalled()
  })

  it('desabilita o Confirmar sem linha enviável', () => {
    setFlow({ step: 'triage', rows: [ROW], sendableCount: 0 })
    montar()
    const confirmar = screen.getByText(/operation\.enrollment\.import\.confirm/).closest('button')
    expect(confirmar?.disabled).toBe(true)
  })

  it('o Cancelar da triagem fecha e avisa o chamador', () => {
    setFlow({ step: 'triage', rows: [ROW], sendableCount: 1 })
    const onHide = montar()
    fireEvent.click(screen.getByText('common.cancel'))
    expect(fns.close).toHaveBeenCalled()
    expect(onHide).toHaveBeenCalled()
  })

  it('no resultado com recusadas oferece corrigi-las; sem recusadas, só fechar', () => {
    setFlow({ step: 'result', result: { ...RESULT, errors: [{ row: 3, message: 'x' }] } })
    montar()
    fireEvent.click(screen.getByText('operation.enrollment.import.reviewRefused'))
    expect(fns.reviewRefused).toHaveBeenCalled()
  })

  it('no resultado sem recusadas não oferece corrigir', () => {
    setFlow({ step: 'result', result: RESULT })
    montar()
    expect(screen.queryByText('operation.enrollment.import.reviewRefused')).toBeNull()
    expect(screen.getByText('operation.enrollment.import.close')).toBeTruthy()
  })

  it('planilha só com cabeçalho: sem dica nem Confirmar, só o Cancelar', () => {
    setFlow({ step: 'triage', rows: [], sendableCount: 0 })
    montar()
    expect(screen.getByText('operation.enrollment.import.empty')).toBeTruthy()
    expect(screen.queryByText('operation.enrollment.import.footerHint')).toBeNull()
    expect(screen.queryByText(/operation\.enrollment\.import\.confirm/)).toBeNull()
    expect(screen.getByText('common.cancel')).toBeTruthy()
  })
})
