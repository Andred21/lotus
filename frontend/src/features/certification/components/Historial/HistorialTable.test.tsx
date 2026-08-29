import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { CertificateData } from '@shared/types/generated'
import type { useHistorial } from '../../hooks/useHistorial'
import { HistorialTable } from './HistorialTable'

/** `t` devolve a chave: o que se prova é QUAL texto a célula escolhe, não a
 * tradução (isso é do `parity.test.ts`). */
vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    // `i18n` junto do `t`: o `AppDropdown` remonta na troca de idioma e lê
    // `i18n.language`, então um mock só com `t` não é mais a forma da API real.
    useTranslation: mockUseTranslation(),
  }
})

type Historial = ReturnType<typeof useHistorial>

const historial = vi.hoisted<{ current: Partial<Historial> }>(() => ({ current: {} }))
vi.mock('../../hooks/useHistorial', () => ({
  useHistorial: () => historial.current as Historial,
}))

/** Um certificado com o snapshot CORROMPIDO: o backend projeta
 * `snapshot_ok: false` e deixa os campos vazios em vez de derrubar a listagem
 * inteira (CorruptedSnapshotException, "a listagem é a exceção deliberada"). */
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

const montar = (c: CertificateData) => {
  historial.current = {
    // Forma do `SearchableTableState` de `shared/ui`: `first`/`onPage` fazem
    // parte do contrato — sem eles o DataTable pagina sobre `undefined` e o
    // tbody sai vazio mesmo com linha na mão.
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
  } as unknown as Historial

  // A tabela monta os diálogos junto (`CertificateViewDialog` chama
  // `useCertificatePdf`), então o provider é obrigatório mesmo sem query viva.
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })

  return render(
    <QueryClientProvider client={qc}>
      <HistorialTable />
    </QueryClientProvider>,
  )
}

afterEach(cleanup)

describe('HistorialTable — a linha do snapshot corrompido', () => {
  it('nome vazio: a célula DIZ que o campo falta, em vez de ficar em branco', () => {
    montar(certificado({ name: '' }))

    // A lista é o único lugar onde o registro aparece antes do clique: uma
    // célula em branco não distingue "sem nome" de "campo faltando".
    expect(screen.getByText('certificate.snapshotMissingField')).toBeTruthy()

    // A tag de defeito ocupa o lugar da de estado — `display_status: 'vigente'`
    // está na fixture e NÃO pode aparecer: snapshot corrompido não tem estado
    // a afirmar, mesmo com data válida por trás.
    expect(screen.queryByText('certificate.status.vigente')).toBeNull()
  })

  it('RUT vazio: travessão, NÃO o texto de campo ausente', () => {
    // Assimetria deliberada: RUT não está em `missingRequiredFields` no
    // backend, então ausência de RUT é dado legítimo (aluno estrangeiro).
    // Só não pode renderizar em branco — o `??` de hoje deixa `''` passar.
    montar(certificado({ name: 'Ana Torres', rut: '' }))

    // Dentro da célula do aluno, não em qualquer lugar da linha: a coluna de
    // vigência também imprime travessão quando `valido_ate` é null, e um
    // `getByText('—')` solto passaria verde sem medir o RUT.
    const celulaDoAluno = screen.getByText('Ana Torres').closest('td')

    expect(celulaDoAluno?.textContent).toContain('—')
    expect(screen.queryByText('certificate.snapshotMissingField')).toBeNull()
  })

  it('nome presente: nem travessão nem texto de ausência no lugar do nome', () => {
    montar(certificado({ name: 'Ana Torres', rut: '11.111.111-1' }))

    expect(screen.getByText('Ana Torres')).toBeTruthy()
    expect(screen.queryByText('certificate.snapshotMissingField')).toBeNull()
  })

  /** RUT é dado técnico e alinha em coluna: sem mono, os pontos e o dígito
   * verificador ficam com largura variável e a coluna serrilha (achado A4). O
   * travessão da ausência legítima NÃO é dado técnico e segue texto puro. */
  it('RUT presente sai em mono; o travessão da ausência, não', () => {
    montar(certificado({ name: 'Ana Torres', rut: '11.111.111-1' }))

    expect(screen.getByText('11.111.111-1').className).toContain('font-mono')

    cleanup()
    montar(certificado({ name: 'Ana Torres', rut: '' }))

    expect(screen.getByText('Ana Torres').closest('td')?.querySelector('.font-mono')).toBeNull()
  })
})

describe('HistorialTable — o filtro de estado', () => {
  it('tem rótulo visível associado ao dropdown', () => {
    // Terceira ocorrência do mesmo achado (UI-07 de Operação, UI-02 de
    // Comercial, UI-01 desta run): o dropdown expunha só o VALOR corrente
    // ("Todos"), sem `<label>`, sem `aria-label` e sem texto adjacente. O par
    // rótulo+`inputId` é o que faz o leitor de tela dizer o que se filtra.
    montar(certificado({ name: 'Ana Torres', rut: '11.111.111-1' }))

    expect(screen.getByLabelText('certificate.colStatus')).toBeTruthy()
  })
})
