import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { renderWithProviders } from '@shared/testing/providers'
import { setViewportWidth } from '@shared/testing/viewport'
import type { CertificateData } from '@shared/types/generated'
import type { useHistorial } from '../../hooks/useHistorial'
import { HistorialTable } from './HistorialTable'

/** Harness redeclarado (não reusado do `HistorialTable.test.tsx` vizinho): a
 * régua `max-lines` sobre componentes de feature mede teste de componente
 * junto com o componente, sem isenção — precedente `e76747a6`
 * (ValidationPageFolio.test.tsx) quebrou o arquivo pelo mesmo motivo, em vez
 * de isentar. */
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

function certificado(over: Partial<CertificateData['snapshot']['aluno']> = {}): CertificateData {
  return {
    id: 1,
    codigo: 'LOT-2026-1001',
    created_at: '2026-08-01T10:00:00Z',
    valido_ate: null,
    snapshot_ok: false,
    display_status: 'vigente',
    aluno_photo_url: null,
    snapshot: {
      aluno: { name: '', rut: '', ...over },
      curso: { name: 'Alta tensión' },
    },
  } as unknown as CertificateData
}

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
    clearStatusFilter: () => {},
    statusSummary: { vigente: 1 },
    loading: false,
    loadError: null,
    reload: () => {},
    setViewingCertificateId: () => {},
    ...extra,
  } as unknown as Historial

  // A tabela monta os diálogos junto (`CertificateViewDialog` chama
  // `useCertificatePdf`), então o provider é obrigatório mesmo sem query viva.
  return renderWithProviders(<HistorialTable />)
}

/** Item 23 (`D-65`): três botões de TEXTO numa coluna presa de 16rem cobriam
 * 120px do aluno em 390x844. Viram ícones com nome acessível, e abaixo de `sm`
 * a linha carrega um controle só. */
describe('HistorialTable — ações da linha', () => {
  const larguraDaColunaDeAcoes = () =>
    (document.querySelector('thead tr th:last-child') as HTMLTableCellElement).style.width
  const vigente = () => ({ ...certificado({ name: 'Ana Torres', rut: '1-9' }), snapshot_ok: true })

  it('no desktop, ver e revogar são ícones soltos com nome acessível, numa coluna de 9rem', () => {
    montar(vigente(), { canRevoke: true })

    const ver = screen.getByRole('button', { name: 'certificate.view' })
    expect(ver.textContent?.trim()).toBe('')
    expect(screen.getByRole('button', { name: 'certificate.revoke' })).toBeTruthy()
    expect(larguraDaColunaDeAcoes()).toBe('9rem')
  })

  it('em 390px, a linha tem UM botão de ações e a coluna encolhe para ele', () => {
    setViewportWidth(390)
    montar(vigente(), { canRevoke: true })

    expect(screen.getByRole('button', { name: 'common.moreActions' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'certificate.revoke' })).toBeNull()
    expect(larguraDaColunaDeAcoes()).toBe('4.5rem')
  })

  it('revogar continua abrindo o diálogo pelo mesmo caminho: setRevoking com o certificado', () => {
    const setRevoking = vi.fn()
    const c = vigente()
    montar(c, { canRevoke: true, setRevoking })

    fireEvent.click(screen.getByRole('button', { name: 'certificate.revoke' }))
    expect(setRevoking).toHaveBeenCalledWith(c)
  })

  it('revocado com permissão: reemitir aparece, revogar não', () => {
    montar({ ...vigente(), display_status: 'revocado' } as CertificateData, { canRevoke: true, canReissue: true })

    expect(screen.getByRole('button', { name: 'certificate.reissue' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'certificate.revoke' })).toBeNull()
  })
})
