import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { NAV_MODULES, type NavModule } from '@shared/config/navigation'
import en from '@shared/config/locales/en.json'
import esCL from '@shared/config/locales/es-CL.json'
import ptBR from '@shared/config/locales/pt-BR.json'

// Mesmo idiom do `PendenciasList.test.tsx`: `importOriginal` preserva o resto
// do módulo, e o `t` devolve a chave — o que se prova aqui é QUAL texto a tela
// escolhe, não a tradução dele.
vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation(),
  }
})

import { AppIcon } from '@shared/ui'
import { SidebarItem } from './SidebarItem'

const modulo: NavModule = {
  key: 'comercial',
  labelKey: 'nav.comercial',
  shortLabelKey: 'nav.short.comercial',
  icon: 'file',
  path: '/comercial',
}

function montar(collapsed: boolean, rota = '/') {
  return render(
    <MemoryRouter initialEntries={[rota]}>
      <SidebarItem module={modulo} collapsed={collapsed} />
    </MemoryRouter>,
  )
}

/** O desenho de um ícone do registro no peso pedido, para comparar com o item. */
function desenho(weight: 'regular' | 'fill') {
  return render(<AppIcon name="file" weight={weight} />).container.querySelector('svg')?.innerHTML
}

describe('SidebarItem', () => {
  /**
   * D-03. Abaixo de 1024px o colapso é IMPOSTO pela viewport
   * (`useViewport.ts:28`), então o rail de 80px é o único menu que o telefone
   * tem. Enquanto o rótulo saía do DOM e sobrava só `title`, o nome do módulo
   * dependia de hover — que no toque não existe.
   *
   * A asserção é sobre o TEXTO estar no documento, não sobre o atributo novo:
   * é o que a ficha pede e é o que a sonda de remoção derruba.
   */
  it('colapsado, mantém o rótulo no DOM', () => {
    montar(true)

    expect(screen.getByText('nav.short.comercial')).toBeTruthy()
  })

  /** Rótulo escondido de leitor de tela seria o mesmo defeito com outra roupa:
   * quem enxerga continuaria sem o nome. */
  it('colapsado, o rótulo NÃO é sr-only', () => {
    const { container } = montar(true)

    expect(container.querySelector('.sr-only')).toBeNull()
  })

  /** O `title` deixa de ser o único portador do nome, mas continua: colapsado o
   * rótulo trunca, e sem ele o nome longo fica sem recuperação. */
  it('colapsado, o link carrega o rótulo em `title`', () => {
    const { container } = montar(true)

    expect(container.querySelector('a')?.getAttribute('title')).toBe('nav.comercial')
  })

  /**
   * Expandido o `title` NÃO volta. Num link cujo texto visível já é o rótulo, o
   * `title` vira *accessible description* e o leitor de tela anuncia nome E
   * descrição — "Comercial, link, Comercial". A spec §4.1 dá ao `title` um papel
   * só: apoio do rótulo TRUNCADO, e expandido nada trunca (Q-2 do review de
   * 2026-08-27).
   */
  it('expandido, o link NÃO carrega `title`', () => {
    const { container } = montar(false)

    expect(container.querySelector('a')?.getAttribute('title')).toBeNull()
  })

  /** Expandido nada muda — a correção não pode mexer no menu que já funcionava. */
  it('expandido, mantém o rótulo e não empilha', () => {
    const { container } = montar(false)

    expect(screen.getByText('nav.comercial')).toBeTruthy()
    expect(container.querySelector('a')?.className).not.toContain('flex-col')
  })

  /** O módulo atual se destaca pelo peso do glifo: `fill` ativo, `regular` em
   * repouso. A cor sozinha não carrega o estado. */
  it('item ativo usa peso fill', () => {
    const { container } = montar(false, '/comercial')

    expect(container.querySelector('a')?.getAttribute('aria-current')).toBe('page')
    expect(container.querySelector('a svg')?.innerHTML).toBe(desenho('fill'))
  })

  it('item em repouso usa peso regular', () => {
    const { container } = montar(false, '/outra-rota')

    expect(container.querySelector('a')?.getAttribute('aria-current')).toBeNull()
    expect(container.querySelector('a svg')?.innerHTML).toBe(desenho('regular'))
  })

  /** B-4. O rail cresceu de 10px para 12px: o rótulo integral não cabe nos 80px,
   * então colapsado o texto visível é o curto e o integral fica no `title`. Sem
   * `truncate`: um nome cortado em reticências deixa de ser lido. */
  it('colapsado usa rótulo curto a 12px sem truncate', () => {
    const { container } = montar(true)
    const rotulo = screen.getByText('nav.short.comercial')

    expect(rotulo.className).toContain('text-xs')
    expect(rotulo.className).not.toContain('text-[10px]')
    expect(rotulo.className).not.toContain('truncate')
    expect(screen.queryByText('nav.comercial')).toBeNull()
    expect(container.querySelector('a')?.getAttribute('title')).toBe('nav.comercial')
  })

  it('expandido mostra o rótulo integral, não o curto', () => {
    montar(false)

    expect(screen.getByText('nav.comercial')).toBeTruthy()
    expect(screen.queryByText('nav.short.comercial')).toBeNull()
  })
})

describe('rótulos curtos do rail', () => {
  const locales = { 'es-CL': esCL, 'pt-BR': ptBR, en } as const
  const MAX = 9

  /** Largura em px de cada rótulo a 12px, Inter 500 (`font-medium`, o peso do
   * item), medida em Chromium headless sobre `@fontsource/inter` 500 latin
   * (`inter-latin-500-normal.woff2`), em 2026-11-27. Texto novo exige medir de
   * novo: a checagem abaixo falha se o rótulo não estiver na tabela. */
  const LARGURA_MEDIDA: Record<string, number> = {
    Dashboard: 62, Comercial: 59, 'Operación': 59, Cursos: 40, 'Certific.': 47, Personas: 53, Admin: 37,
    Painel: 35, 'Operação': 56, Pessoas: 47,
    Sales: 31, Operation: 56, Courses: 47, Certs: 31, People: 39,
  }

  /** Conteúdo útil do rail colapsado: `w-20` (80) − `border-r` (1) − `nav px-1`
   * (4+4) − `border-l-2` do item (2) − `px-0` do item (0). Espelha `Sidebar.tsx`
   * e `SidebarItem.tsx`; o teste de classes abaixo prende o lado do item. */
  const CONTEUDO_DO_RAIL = 80 - 1 - 2 * 4 - 2

  it.each(Object.entries(locales))('rótulos curtos cabem (%s)', (_nome, locale) => {
    const curtos = (locale as { nav: { short: Record<string, string> } }).nav.short
    for (const m of NAV_MODULES) {
      expect(m.shortLabelKey).toBe(`nav.short.${m.key}`)
      const texto = curtos[m.key]
      expect(texto, `nav.short.${m.key}`).toBeTruthy()
      expect(texto.length, `${m.key}: "${texto}"`).toBeLessThanOrEqual(MAX)
      const largura = LARGURA_MEDIDA[texto]
      expect(largura, `"${texto}" sem largura medida`).toBeDefined()
      expect(largura, `"${texto}" (${largura}px) > ${CONTEUDO_DO_RAIL}px do rail`).toBeLessThanOrEqual(
        CONTEUDO_DO_RAIL,
      )
    }
  })

  it('colapsado, o item abre espaço sem padding lateral', () => {
    const { container } = render(
      <MemoryRouter>
        <SidebarItem module={NAV_MODULES[1]} collapsed />
      </MemoryRouter>,
    )
    const classes = container.querySelector('a')?.className ?? ''

    expect(classes).toContain('px-0')
    expect(classes).not.toMatch(/(^|\s)px-[1-9]/)
    expect(classes).toContain('border-l-2')
  })
})
