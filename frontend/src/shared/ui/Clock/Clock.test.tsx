import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import i18n from '@shared/config/i18n'
import { Clock } from './Clock'

/**
 * O que este teste protege é a INSCRIÇÃO do Clock no idioma, não o formato.
 *
 * A regressão real (D-P12): o Clock nunca se inscreveu no i18n — ele
 * re-renderizava de carona, porque o Header tinha um `t()` no título. Quando a
 * UI-05 deu ao PageHeader a posse única do título, o `t()` saiu do Header, o
 * pai parou de re-renderizar e a data só mudava no reload. Nenhuma suíte viu:
 * o formato continuava certo, só congelado.
 *
 * Por isso o teste troca o idioma com o componente JÁ MONTADO e sem remontar —
 * é a única forma de a asserção falhar quando a inscrição some.
 */

// 11/08/2026, 14:05 local. As três datas abaixo saem diferentes umas das
// outras, então nenhum locale passa no lugar do outro por acaso.
const QUANDO = new Date(2026, 7, 11, 14, 5)
const DATA_POR_IDIOMA = {
  'es-CL': '11-08-2026',
  'pt-BR': '11/08/2026',
  en: '8/11/2026',
} as const

const idiomaOriginal = i18n.language

beforeAll(() => {
  vi.useFakeTimers()
  vi.setSystemTime(QUANDO)
})

afterAll(async () => {
  vi.useRealTimers()
  await i18n.changeLanguage(idiomaOriginal)
})

afterEach(() => {
  cleanup()
})

async function trocarIdioma(codigo: keyof typeof DATA_POR_IDIOMA) {
  await act(async () => {
    await i18n.changeLanguage(codigo)
  })
}

describe('Clock', () => {
  it('reformata a data no ato da troca de idioma, sem remontar nem recarregar', async () => {
    await trocarIdioma('es-CL')
    render(<Clock />)
    expect(screen.getByText(DATA_POR_IDIOMA['es-CL'])).toBeDefined()

    await trocarIdioma('pt-BR')
    expect(screen.getByText(DATA_POR_IDIOMA['pt-BR'])).toBeDefined()

    await trocarIdioma('en')
    expect(screen.getByText(DATA_POR_IDIOMA.en)).toBeDefined()
  })

  it('declara o idioma da data no markup, para o leitor de tela não ler pt em es', async () => {
    await trocarIdioma('pt-BR')
    const { container } = render(<Clock />)

    expect(container.querySelector('[lang]')?.getAttribute('lang')).toBe('pt-BR')
  })
})
