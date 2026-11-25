import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
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
const salvar = vi.hoisted(() => vi.fn())
vi.mock('@shared/hooks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@shared/hooks')>()),
  useBlobDownload: () => salvar,
}))

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

describe('Historial — baixar a exportação', () => {
  it('confirmar baixa o arquivo com o nome do servidor', async () => {
    montar()
    fireEvent.click(screen.getByRole('button', { name: 'certificate.exportPlanilla' }))
    await screen.findByText('certificate.exportScopeAll|3')

    fireEvent.click(screen.getByRole('button', { name: 'certificate.exportConfirm' }))

    await waitFor(() => expect(salvar).toHaveBeenCalledWith(expect.any(Blob), 'c.xlsx'))
  })

  it('o ZIP em andamento mostra o estado de espera e segura o cancelar', async () => {
    let terminar: (v: unknown) => void = () => {}
    responder({ total: 15, revocados: 0 }, () => new Promise((resolve) => { terminar = resolve }))
    montar({ quoteFilter: 7 })
    fireEvent.click(screen.getByRole('button', { name: 'certificate.exportZip' }))
    await screen.findByText('certificate.exportScopeFiltered|15')

    fireEvent.click(screen.getByRole('button', { name: 'certificate.exportConfirm' }))

    expect(await screen.findByText('certificate.exportZipWorking')).toBeTruthy()
    expect((screen.getByRole('button', { name: 'common.cancel' }) as HTMLButtonElement).disabled).toBe(true)
    terminar({ data: new Blob(['x']), headers: {} })
    await waitFor(() => expect(salvar).toHaveBeenCalled())
  })

  it('a recusa do servidor mostra o detail no diálogo', async () => {
    const corpo = { status: 422, detail: 'Hay demasiados certificados.', title: 'x', type: 't', instance: '' }
    responder({ total: 3, revocados: 0 }, () => Promise.reject(new Blob([JSON.stringify(corpo)])))
    montar()
    fireEvent.click(screen.getByRole('button', { name: 'certificate.exportPlanilla' }))
    await screen.findByText('certificate.exportScopeAll|3')

    fireEvent.click(screen.getByRole('button', { name: 'certificate.exportConfirm' }))

    expect(await screen.findByText('Hay demasiados certificados.')).toBeTruthy()
    expect(screen.queryByText('certificate.exportRetryHint')).toBeNull()
  })

  it('503 do conversor mostra o detail e o convite a tentar de novo', async () => {
    const corpo = { status: 503, detail: 'No se pudo generar: LOT-2026-1.', title: 'x', type: 't', instance: '' }
    responder({ total: 3, revocados: 0 }, () => Promise.reject(new Blob([JSON.stringify(corpo)])))
    montar({ quoteFilter: 7 })
    fireEvent.click(screen.getByRole('button', { name: 'certificate.exportZip' }))
    await screen.findByText('certificate.exportScopeFiltered|3')

    fireEvent.click(screen.getByRole('button', { name: 'certificate.exportConfirm' }))

    expect(await screen.findByText('No se pudo generar: LOT-2026-1.')).toBeTruthy()
    expect(screen.getByText('certificate.exportRetryHint')).toBeTruthy()
  })
})
