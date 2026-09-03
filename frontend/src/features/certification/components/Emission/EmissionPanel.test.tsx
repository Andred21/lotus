import { beforeAll, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { registerPrimeLocales } from '@shared/config/primeLocale'
import type { useEmissionPanelState } from '../../hooks/useEmissionPanelState'
import { EmissionPanel } from './EmissionPanel'

/** `t` devolve a chave: o que se prova é QUAL texto o rótulo escolhe, não a
 * tradução (isso é do `parity.test.ts`). `i18n` junto do `t` porque o
 * `AppDropdown` remonta na troca de idioma e lê `i18n.language`. */
vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation(),
  }
})

type PanelState = ReturnType<typeof useEmissionPanelState>

const estado = vi.hoisted<{ current: Partial<PanelState> }>(() => ({ current: {} }))
vi.mock('../../hooks/useEmissionPanelState', () => ({
  useEmissionPanelState: () => estado.current as PanelState,
}))

/** Sem turma escolhida: é o estado em que o placeholder ainda está na tela e
 * mascara a falta do rótulo — exatamente o que o UI-02 mede. */
function montar() {
  estado.current = {
    turmaId: null,
    selected: null,
    options: [{ label: 'Alta tensión · Enel', value: 1 }],
    setTurmaId: () => {},
    desde: '2025-08-28',
    setDesde: () => {},
    loadError: null,
    loading: false,
  } as unknown as PanelState

  // O painel monta os diálogos junto (`ConfirmIssueDialog` e `BatchIssueDialog`
  // usam mutations), então o provider é obrigatório mesmo sem query viva.
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })

  return render(
    <QueryClientProvider client={qc}>
      <EmissionPanel />
    </QueryClientProvider>,
  )
}

// O `AppDatePicker` da janela passa `locale="es"` ao Calendar do Prime; sem o
// boot (`main.tsx`), o botão do ícone estoura em `localeOption('chooseDate',
// 'es')`. A mesma nota de `fieldAssociation.test.tsx`.
beforeAll(registerPrimeLocales)

describe('EmissionPanel — o seletor de turma', () => {
  it('tem rótulo visível associado ao dropdown, e não só o placeholder', () => {
    // O nome acessível vinha do PLACEHOLDER, por acidente de implementação do
    // PrimeReact (ele o usa como texto do botão que abre a lista) — não por
    // desenho, e sem `<label>` nenhum. É a mesma forma que os três filtros de
    // estado irmãos já corrigiram.
    montar()

    expect(screen.getByLabelText('certificate.turmaConcluida')).toBeTruthy()
  })

  it('mostra o seletor da janela com rótulo associado e o default preenchido', () => {
    montar()

    const seletor = screen.getByLabelText('certificate.concludedSince') as HTMLInputElement
    expect(seletor).toBeTruthy()
    // `dd-mm-yy` é a gramática de `es-CL` do AppDatePicker.
    expect(seletor.value).toBe('28-08-2025')
  })
})
