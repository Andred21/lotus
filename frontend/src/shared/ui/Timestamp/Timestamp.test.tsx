import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import i18n from '@shared/config/i18n'
import { Timestamp } from './Timestamp'

/**
 * O i18n é o REAL, e não o mock de `@shared/testing/i18n`: o que se prova é a
 * máscara de cada idioma e a inscrição na troca — com `t` devolvendo a chave
 * não haveria troca a observar. Mesmo molde do `Clock.test.tsx`.
 */

// 11/08/2026, 14:05 local: dia ≠ mês, então nenhum locale passa no lugar do outro.
const QUANDO = new Date(2026, 7, 11, 14, 5)
const idiomaOriginal = i18n.language

async function trocarIdioma(codigo: string) {
  await act(async () => {
    await i18n.changeLanguage(codigo)
  })
}

beforeEach(async () => {
  await trocarIdioma('es-CL')
})
afterAll(async () => {
  await i18n.changeLanguage(idiomaOriginal)
})

describe('Timestamp', () => {
  it('é um <time> com o instante em ISO no dateTime', () => {
    const { container } = render(<Timestamp value={QUANDO} />)

    expect(container.querySelector('time')?.getAttribute('dateTime')).toBe(QUANDO.toISOString())
  })

  it('hora em cima e data embaixo, cada uma ao lado do próprio ícone', () => {
    const { container } = render(<Timestamp value={QUANDO} />)
    const filhos = Array.from(container.querySelector('time')!.children)

    expect(filhos.map((n) => n.tagName)).toEqual(['I', 'SPAN', 'I', 'SPAN'])
    expect(filhos[0].className).toContain('pi-clock')
    expect(filhos[1].textContent).toBe('14:05')
    expect(filhos[2].className).toContain('pi-calendar')
    expect(filhos[3].textContent).toBe('11-08-2026')
  })

  it('os ícones são decorativos e pintados pela primária do tema', () => {
    const { container } = render(<Timestamp value={QUANDO} />)
    const icones = Array.from(container.querySelectorAll('i'))

    expect(icones).toHaveLength(2)
    for (const icone of icones) {
      expect(icone.getAttribute('aria-hidden')).toBe('true')
      expect(icone.className).toContain('text-(--primary-color)')
    }
  })

  it('o leitor de tela lê hora e data separadas por espaço, sem colar os dois', () => {
    const { container } = render(<Timestamp value={QUANDO} />)

    expect(container.querySelector('time')?.textContent).toBe('14:05 11-08-2026')
  })

  it('a máscara é a do idioma ativo e troca no ato, sem remontar', async () => {
    render(<Timestamp value={QUANDO} />)
    expect(screen.getByText('11-08-2026')).toBeTruthy()

    await trocarIdioma('pt-BR')
    expect(screen.getByText('11/08/2026')).toBeTruthy()
    expect(screen.getByText('14:05')).toBeTruthy()

    await trocarIdioma('en')
    expect(screen.getByText('8/11/2026')).toBeTruthy()
    // O ICU do Node separa "PM" por U+202F; `\s` casa os dois espaços.
    expect(screen.getByText(/^02:05\sPM$/)).toBeTruthy()
  })

  it('declara o idioma no markup, para o leitor de tela não ler pt em es', async () => {
    await trocarIdioma('pt-BR')
    const { container } = render(<Timestamp value={QUANDO} />)

    expect(container.querySelector('time')?.getAttribute('lang')).toBe('pt-BR')
  })
})
