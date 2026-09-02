import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { NavModule } from '@shared/config/navigation'

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

import { SidebarItem } from './SidebarItem'

const modulo: NavModule = {
  key: 'comercial',
  labelKey: 'nav.comercial',
  icon: 'pi pi-file',
  path: '/comercial',
}

function montar(collapsed: boolean) {
  return render(
    <MemoryRouter>
      <SidebarItem module={modulo} collapsed={collapsed} />
    </MemoryRouter>,
  )
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

    expect(screen.getByText('nav.comercial')).toBeTruthy()
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
})
