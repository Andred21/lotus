import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import type { useTurmaDetail } from '../../hooks/useTurmaDetail'
import { TurmaDetailPage } from './TurmaDetailPage'

/**
 * Mesmo achado do `BudgetDetailPage.test.tsx` (Q-5, review de 2026-08-12), e
 * duplicado de propósito: são duas telas de detalhe, cada uma com os seus três
 * ramos, e o bug estava em cada uma delas separadamente — um teste só na
 * `shared/ui` provaria o componente, não a página que esqueceu de titular.
 * (Teste em `commercial` não pode importar `operation`: lei §5.6.)
 */
vi.mock('react-i18next', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-i18next')>()),
  useTranslation: () => ({ t: (key: string) => key }),
}))

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
  detail.current = { goBack: () => {}, reload: () => {} }
})

afterEach(() => {
  cleanup()
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
