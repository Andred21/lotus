import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { renderWithProviders } from '@shared/testing/providers'
import type { CertificateData } from '@shared/types/generated'
import type { useHistorial } from '../../hooks/useHistorial'
import { HistorialTable } from './HistorialTable'

vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation(),
  }
})

type Historial = ReturnType<typeof useHistorial>

const historial = vi.hoisted<{ current: Partial<Historial> }>(() => ({ current: {} }))
vi.mock('../../hooks/useHistorial', () => ({
  useHistorial: () => historial.current as Historial,
}))

const certificado = (over: Partial<CertificateData> = {}) =>
  ({
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
    ...over,
  }) as unknown as CertificateData

const opcoes = [
  { id: 7, code: 'Scap 4 - R2' },
  { id: 9, code: 'Scap 5 - R1' },
]

const montar = (c: CertificateData, extra: Partial<Historial> = {}) => {
  historial.current = {
    table: {
      filter: '',
      term: '',
      filtering: false,
      filteredByScope: false,
      rows: [c],
      first: 0,
      onFilterChange: () => {},
      onPage: () => {},
      clear: () => {},
      totalRecords: 1,
      sortField: undefined,
      sortOrder: 0,
      onSort: () => {},
    },
    statusFilter: null,
    setStatusFilter: () => {},
    clearFilters: () => {},
    quoteFilter: null,
    setQuoteFilter: () => {},
    quoteOptions: opcoes,
    quoteLoadFailure: null,
    reloadQuotes: () => Promise.resolve(),
    statusSummary: { vigente: 1 },
    loading: false,
    loadError: null,
    reload: () => {},
    setViewingCertificateId: () => {},
    ...extra,
  } as unknown as Historial
  return renderWithProviders(<HistorialTable />)
}

describe('HistorialTable — a coluna de cotação', () => {
  it('mostra o código da cotação em RecordCode, sob o cabeçalho Cotización', () => {
    montar(certificado())

    const codigo = screen.getByText('Scap 4 - R2', { selector: 'td span' })
    expect(codigo.className).toContain('font-bold')
    expect(screen.getByText('certificate.colQuote', { selector: 'th *' })).toBeTruthy()
  })

  it('sem cotação a célula é travessão', () => {
    montar(certificado({ quote_id: null, quote_code: null }))

    expect(screen.queryByText('Scap 4 - R2', { selector: 'td span' })).toBeNull()
    const celula = screen.getByText('Ana Torres').closest('tr')?.querySelectorAll('td')[3]
    expect(celula?.textContent).toBe('—')
  })
})

describe('HistorialTable — o filtro de cotação', () => {
  it('tem rótulo visível associado ao dropdown', () => {
    montar(certificado())

    expect(screen.getByLabelText('certificate.colQuote')).toBeTruthy()
  })

  it('mostra no dropdown a cotação escolhida', () => {
    montar(certificado(), { quoteFilter: 7 })

    expect(screen.getByLabelText('certificate.colQuote').closest('.p-dropdown')?.textContent).toContain('Scap 4 - R2')
  })

  it('escolher uma opção chama setQuoteFilter com o id da cotação', async () => {
    const setQuoteFilter = vi.fn()
    montar(certificado(), { setQuoteFilter })

    fireEvent.click(screen.getByLabelText('certificate.colQuote').closest('.p-dropdown') as HTMLElement)
    fireEvent.click(await screen.findByText('Scap 5 - R1', { selector: '.p-dropdown-item *' }))

    expect(setQuoteFilter).toHaveBeenCalledWith(9)
  })
})

describe('HistorialTable — a falha das opções de cotação', () => {
  const falha: NonNullable<Historial['quoteLoadFailure']> = { errorDetail: undefined, errorHint: 'common.loadErrorHint' }

  it('anuncia a falha ao lado do filtro, com Reintentar, sem derrubar a tabela', () => {
    const reloadQuotes = vi.fn(() => Promise.resolve())
    montar(certificado(), { quoteOptions: [], quoteLoadFailure: falha, reloadQuotes })

    const aviso = screen.getByRole('alert')
    expect(aviso.textContent).toContain('certificate.quoteOptionsLoadError')
    expect(aviso.textContent).toContain('common.loadErrorHint')
    expect(screen.getByText('Ana Torres')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'common.retry' }))
    expect(reloadQuotes).toHaveBeenCalledTimes(1)
  })

  it('sem falha, nenhum aviso de cotação', () => {
    montar(certificado())

    expect(screen.queryByText('certificate.quoteOptionsLoadError', { exact: false })).toBeNull()
  })
})
