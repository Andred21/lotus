import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { renderWithProviders } from '@shared/testing/providers'
import { api } from '@shared/api/axios'
import type { CertificateData } from '@shared/types/generated'
import type { useHistorial } from '../../hooks/useHistorial'
import { HistorialTable } from './HistorialTable'

// `t` devolve a chave seguida dos valores de interpolação: o teste prova qual
// frase a tela escolhe e com qual N, não a tradução (isso é do `parity.test.ts`).
vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation({
      t: (key, opts) => (opts ? `${key}|${Object.values(opts).join(',')}` : key),
    }),
  }
})

vi.mock('@shared/api/axios', () => ({ api: { get: vi.fn() } }))

type Historial = ReturnType<typeof useHistorial>
const historial = vi.hoisted<{ current: Partial<Historial> }>(() => ({ current: {} }))
vi.mock('../../hooks/useHistorial', () => ({ useHistorial: () => historial.current as Historial }))

const get = vi.mocked(api.get)
const RESUMO = '/api/certificates/export/summary'

const certificado = {
  id: 1,
  codigo: 'LOT-2026-1001',
  created_at: '2026-08-01T10:00:00Z',
  valido_ate: null,
  snapshot_ok: true,
  display_status: 'vigente',
  aluno_photo_url: null,
  quote_id: 7,
  quote_code: 'Scap 4 - R2',
  snapshot: { aluno: { name: 'Ana Torres', rut: '11.111.111-1' }, curso: { name: 'Alta tensión' } },
} as unknown as CertificateData

const montar = (extra: Partial<Historial> = {}, term = '') => {
  historial.current = {
    table: {
      filter: term, term, filtering: false, filteredByScope: false, rows: [certificado], first: 0,
      onFilterChange: () => {}, onPage: () => {}, clear: () => {}, totalRecords: 1,
      sortField: undefined, sortOrder: 0, onSort: () => {},
    },
    statusFilter: null,
    setStatusFilter: () => {},
    clearFilters: () => {},
    quoteFilter: null,
    setQuoteFilter: () => {},
    quoteOptions: [],
    statusSummary: { vigente: 1 },
    loading: false,
    loadError: null,
    reload: () => {},
    setViewingCertificateId: () => {},
    ...extra,
  } as unknown as Historial
  return renderWithProviders(<HistorialTable />)
}

const responder = (resumo: { total: number; revocados: number }, download?: () => Promise<unknown>) =>
  get.mockImplementation(((url: string) =>
    url === RESUMO
      ? Promise.resolve({ data: resumo })
      : (download?.() ??
        Promise.resolve({ data: new Blob(['x']), headers: { 'content-disposition': 'attachment; filename="c.xlsx"' } }))) as typeof api.get)

beforeEach(() => {
  vi.clearAllMocks()
  responder({ total: 3, revocados: 1 })
})

describe('Historial — botões de exportação', () => {
  it('Planilla e ZIP ficam no cabeçalho da tabela', () => {
    montar()

    expect(screen.getByRole('button', { name: 'certificate.exportPlanilla' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'certificate.exportZip' })).toBeTruthy()
  })

  it('o ZIP sem cotação filtrada fica desabilitado e diz por quê', () => {
    montar()

    const zip = screen.getByRole('button', { name: 'certificate.exportZip' }) as HTMLButtonElement
    expect(zip.disabled).toBe(true)
    expect(zip.closest('span[title]')?.getAttribute('title')).toBe('certificate.exportZipNeedsQuote')
    expect(screen.getByText('certificate.exportZipNeedsQuote', { selector: '.sr-only' })).toBeTruthy()
  })

  it('o ZIP com cotação filtrada fica habilitado', () => {
    montar({ quoteFilter: 7 })

    expect((screen.getByRole('button', { name: 'certificate.exportZip' }) as HTMLButtonElement).disabled).toBe(false)
  })
})

describe('Historial — o diálogo de exportação', () => {
  it('abrir a Planilla conta com os mesmos filtros da tabela e avisa N e revogados', async () => {
    montar({ statusFilter: 'vigente', quoteFilter: 7 }, 'ana')

    fireEvent.click(screen.getByRole('button', { name: 'certificate.exportPlanilla' }))

    expect(await screen.findByText('certificate.exportScopeFiltered|3')).toBeTruthy()
    expect(screen.getByText('certificate.exportRevoked|1')).toBeTruthy()
    expect(get).toHaveBeenCalledWith(RESUMO, { params: { q: 'ana', display_status: 'vigente', quote_id: 7 } })
  })

  it('sem filtro nenhum, a frase é a de "todos"', async () => {
    montar()

    fireEvent.click(screen.getByRole('button', { name: 'certificate.exportPlanilla' }))

    expect(await screen.findByText('certificate.exportScopeAll|3')).toBeTruthy()
  })

  it('sem revogado no conjunto, a linha dos revogados não aparece', async () => {
    responder({ total: 3, revocados: 0 })
    montar()

    fireEvent.click(screen.getByRole('button', { name: 'certificate.exportPlanilla' }))

    await screen.findByText('certificate.exportScopeAll|3')
    expect(screen.queryByText(/certificate\.exportRevoked/)).toBeNull()
  })

  it('total 0 desabilita o confirmar e mostra a razão', async () => {
    responder({ total: 0, revocados: 2 })
    montar()

    fireEvent.click(screen.getByRole('button', { name: 'certificate.exportPlanilla' }))

    expect(await screen.findByText('certificate.exportEmpty')).toBeTruthy()
    // Só a razão: a frase "Se exportarán 0…" não aparece.
    expect(screen.queryByText(/certificate\.exportScope/)).toBeNull()
    expect((screen.getByRole('button', { name: 'certificate.exportConfirm' }) as HTMLButtonElement).disabled).toBe(true)
  })
})
