import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { useBudgetDetail } from '../../hooks/useBudgetDetail'
import { BudgetDetailPage } from './BudgetDetailPage'

/**
 * Q-5 (review de 2026-08-12): com o `h1` fora do Header global, o dono do nível
 * 1 da tela de detalhe passou a ser o `DetailHeader` — e os ramos SEM entidade
 * para nomear (carga, falha de carga, id inexistente) não o titulavam, então a
 * página inteira ficava sem cabeçalho de nível 1 nesses estados.
 *
 * O teste é por ramo justamente porque o bug era por ramo: o caminho feliz
 * sempre teve o `h1` certo, e é por isso que nenhuma jornada visual o pegou.
 *
 * `t` devolve a própria chave: o que importa aqui é QUE chave titula cada
 * estado, não o texto traduzido (isso é do `parity.test.ts`).
 */
vi.mock('react-i18next', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-i18next')>()),
  useTranslation: () => ({ t: (key: string) => key }),
}))

type BudgetDetail = ReturnType<typeof useBudgetDetail>

/** `Partial<>` e não `Record<string, unknown>`: cada ramo só precisa de um
 * pedaço do hook, mas os NOMES dos campos seguem checados — renomear
 * `loadError` lá quebra este teste em vez de passar batido. */
const detail = vi.hoisted<{ current: Partial<BudgetDetail> }>(() => ({ current: {} }))
vi.mock('../../hooks/useBudgetDetail', () => ({
  useBudgetDetail: () => detail.current as BudgetDetail,
}))

/** Task 6 (spec D5): a página agora chama `useBudgetQuotesArchived` ACIMA dos
 * três `if` de ramo (regra: hook antes de qualquer return). Sem este mock, os
 * três casos deste arquivo — que não passam por `QueryClientProvider` — quebram
 * em `useQuery` mesmo antes de chegar ao `QuotesList`. O que este teste prova é
 * a titulação por ramo, então um retorno estático basta. */
vi.mock('../../hooks/useBudgetQuotesArchived', () => ({
  useBudgetQuotesArchived: () => ({
    mode: 'active',
    setMode: () => {},
    items: [],
    loading: false,
    error: null,
    refetch: () => {},
    restore: () => {},
    restoring: false,
  }),
}))

/** Quantas vezes a frase aparece na tela — é assim que se prova que o título do
 * estado não virou eco de um parágrafo com o mesmo texto. */
const vezesNaTela = (texto: string, trecho: string) => texto.split(trecho).length - 1

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/comercial/presupuestos/1']}>
      <BudgetDetailPage />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  detail.current = { goBack: () => {}, reload: () => Promise.resolve() }
})

afterEach(() => {
  cleanup()
})

describe('BudgetDetailPage titula todos os seus estados', () => {
  it('em carga, tem um h1 (escondido) em vez de só o esqueleto', () => {
    detail.current = { ...detail.current, loading: true }

    const { container } = renderPage()

    const h1 = container.querySelectorAll('h1')
    expect(h1).toHaveLength(1)
    expect(h1[0].textContent).toBe('common.loading')
    expect(h1[0].className).toContain('sr-only')
  })

  it('em falha de carga, tem um h1 com o título do erro', () => {
    detail.current = {
      ...detail.current,
      loadError: {
        type: 'about:blank',
        title: 'Server Error',
        status: 500,
        detail: 'boom',
        instance: '/api/orcamentos/1',
      },
    }

    const { container } = renderPage()

    const h1 = container.querySelectorAll('h1')
    expect(h1).toHaveLength(1)
    expect(h1[0].textContent).toBe('common.loadError')
  })

  it('em não encontrado, o h1 É a mensagem do estado — e ela não se repete', () => {
    detail.current = { ...detail.current, budget: undefined }

    const { container } = renderPage()

    const h1 = container.querySelectorAll('h1')
    expect(h1).toHaveLength(1)
    expect(h1[0].textContent).toBe('budget.notFound')
    expect(vezesNaTela(container.textContent ?? '', 'budget.notFound')).toBe(1)
  })
})
