import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@shared/testing/providers'
import type { CertificateData } from '@shared/types/generated'
import type { useHistorial } from '../../hooks/useHistorial'
import { HistorialTable } from './HistorialTable'
import { historialWidths } from './historialColumns'

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

const montar = () => {
  historial.current = {
    table: {
      filter: '', term: '', filtering: false, filteredByScope: false, rows: [certificado],
      first: 0, onFilterChange: () => {}, onPage: () => {}, clear: () => {}, totalRecords: 1,
      sortField: undefined, sortOrder: 0, onSort: () => {},
    },
    statusFilter: null, setStatusFilter: () => {}, clearFilters: () => {},
    quoteFilter: null, setQuoteFilter: () => {}, quoteOptions: [],
    statusSummary: { vigente: 1 }, loading: false, loadError: null, reload: () => {},
    setViewingCertificateId: () => {},
  } as unknown as Historial
  return renderWithProviders(<HistorialTable />)
}

/** B-1 (bloco 64) e B-7: o folio é UM token. O hífen é oportunidade de quebra, e
 * uma coluna estreita o parte em `LOT-` / `2026-1001`. */
describe('HistorialTable — o folio', () => {
  it('não quebra: a célula do folio é nowrap', () => {
    montar()

    expect(screen.getByText('LOT-2026-1001').className).toContain('whitespace-nowrap')
  })

  /** Modelo, porque o jsdom não calcula caixa: moldura de 718px a 1024x768 (audit
   * do item 23), coluna de ação de 9rem, `table-fixed`. O navegador reescala os
   * 90% declarados sobre o que sobra da moldura, então a coluna entrega
   * `declarado / 90 * (moldura - ação)`. O texto: 14 caracteres de mono a 14px
   * (0,6em = 8,4px cada) mais o `px-4` das duas bordas da célula. */
  it('o peso do folio comporta LOT-AAAA-NNNNN a 1024', () => {
    const MOLDURA = 718
    const ACAO = 9 * 16
    const declarado = parseFloat(String(historialWidths().codigo.width))
    const entregue = (declarado / 90) * (MOLDURA - ACAO)
    const texto = 'LOT-2026-12345'.length * 0.6 * 14 + 32

    expect(entregue).toBeGreaterThanOrEqual(texto)
  })
})
