import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import type { TurmaData } from '@shared/types/generated'
import type { useTurmaDetail } from '../../hooks/useTurmaDetail'
import { TURMA_TABS } from '../../lib/turmaTabs'
import { TurmaDetailPage } from './TurmaDetailPage'

/**
 * Mesmo achado do `BudgetDetailPage.test.tsx` (Q-5, review de 2026-08-12), e
 * duplicado de propósito: são duas telas de detalhe, cada uma com os seus três
 * ramos, e o bug estava em cada uma delas separadamente — um teste só na
 * `shared/ui` provaria o componente, não a página que esqueceu de titular.
 * (Teste em `commercial` não pode importar `operation`: lei §5.6.)
 */
vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation(),
  }
})

/** As cinco abas abrem query própria e não têm parte nesta prova: o que se
 * mede aqui é o cartão de bloqueio da PÁGINA, entre o cabeçalho e o card das
 * abas. (O `TabView` monta só o painel ativo — `renderActiveOnly` é o default
 * do PrimeReact —, então as abas nem seriam prováveis por aqui.) */
vi.mock('./TurmaConfigCard', () => ({ TurmaConfigCard: () => null }))
vi.mock('./RedatorDesignation', () => ({ RedatorDesignation: () => null }))
vi.mock('../Enrollment/EnrollmentSection', () => ({ EnrollmentSection: () => null }))
vi.mock('../Document/TurmaDocuments', () => ({ TurmaDocuments: () => null }))
vi.mock('../Document/ConcludePanel', () => ({ ConcludePanel: () => null }))

type TurmaDetail = ReturnType<typeof useTurmaDetail>

/** `Partial<>` e não `Record<string, unknown>`: cada ramo só precisa de um
 * pedaço do hook, mas os NOMES dos campos seguem checados — renomear
 * `loadError` lá quebra este teste em vez de passar batido. */
const detail = vi.hoisted<{ current: Partial<TurmaDetail> }>(() => ({ current: {} }))
vi.mock('../../hooks/useTurmaDetail', () => ({
  useTurmaDetail: () => detail.current as TurmaDetail,
}))

/** Quantas vezes a frase aparece na tela — é assim que se prova que o título do
 * estado não virou eco de um parágrafo com o mesmo texto. */
const vezesNaTela = (texto: string, trecho: string) => texto.split(trecho).length - 1

beforeEach(() => {
  detail.current = { goBack: () => {}, reload: () => Promise.resolve(), tab: 0, setTab: () => {} }
})

describe('TurmaDetailPage titula todos os seus estados', () => {
  it('em carga, tem um h1 (escondido) em vez de só o esqueleto', () => {
    detail.current = { ...detail.current, loading: true }

    const { container } = render(<TurmaDetailPage />)

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
        instance: '/api/turmas/1',
      },
    }

    const { container } = render(<TurmaDetailPage />)

    const h1 = container.querySelectorAll('h1')
    expect(h1).toHaveLength(1)
    expect(h1[0].textContent).toBe('common.loadError')
  })

  it('em não encontrado, o h1 É a mensagem do estado — e ela não se repete', () => {
    detail.current = { ...detail.current, turma: undefined }

    const { container } = render(<TurmaDetailPage />)

    const h1 = container.querySelectorAll('h1')
    expect(h1).toHaveLength(1)
    expect(h1[0].textContent).toBe('operation.detail.notFound')
    expect(vezesNaTela(container.textContent ?? '', 'operation.detail.notFound')).toBe(1)
  })
})

const TURMA = {
  id: 3, quote_id: 1, course_id: 9, modalidade: 'presencial', local_aplicacao: 'Santiago',
  start_date: '2026-01-05', end_date: '2026-02-05', status: 'em_andamento', habilitada: false,
  missing_document_types: [], concluded_at: null, redatores: [], course_name: 'Alta Tensión',
  client_name: 'Transelec', enrolled_count: 15, quote_code: 'COT-1', budget_code: 'ORC-1',
  budget_id: null, client_rut: '11.111.111-1', client_photo_url: null,
} as TurmaData

describe('TurmaDetailPage anuncia o registro acadêmico trancado (UI-01)', () => {
  it('turma concluída: o cartão de bloqueio aparece UMA vez', () => {
    detail.current = { ...detail.current, turma: { ...TURMA, status: 'concluida' } as TurmaData }

    const { container } = render(<TurmaDetailPage />)

    // Uma vez, não duas: o cartão é da PÁGINA agora, e a aba Documentación
    // deixou de mostrar o dela — dois cartões diriam o mesmo motivo na mesma tela.
    expect(vezesNaTela(container.textContent ?? '', 'operation.detail.lock.concluida')).toBe(1)
  })

  it('turma em curso: nenhum cartão de bloqueio', () => {
    detail.current = { ...detail.current, turma: TURMA }

    const { container } = render(<TurmaDetailPage />)

    expect(vezesNaTela(container.textContent ?? '', 'operation.detail.lock.concluida')).toBe(0)
  })
})

/**
 * Catraca do Q-1 (review de 2026-08-24): quem chega de fora pede a aba pelo
 * NOME (`?tab=docs`) e o `TURMA_TABS` converte em índice. Isso só é verdade
 * enquanto a ordem do array for a ordem dos `AppTabPanel` — inserir uma aba no
 * meio e esquecer o array mandaria o redator para o painel errado sem nada
 * reprovar, que é exatamente o defeito que a correção fechou.
 */
describe('TurmaDetailPage — a ordem dos painéis É o TURMA_TABS (Q-1)', () => {
  it('cada aba da régua, na ordem, é a do nome correspondente', () => {
    detail.current = { ...detail.current, turma: TURMA }

    const { container } = render(<TurmaDetailPage />)

    const abas = [...container.querySelectorAll('.p-tabview-title')].map((n) => n.textContent)
    expect(abas).toEqual(TURMA_TABS.map((tab) => `operation.detail.tabs.${tab}`))
  })
})
