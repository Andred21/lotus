import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AppSelectableCard } from './AppSelectableCard'

/**
 * O C da fase 4 (run de 2026-08-28): o `<div>` externo calcula o fundo do
 * estado selecionado (`color-mix` com `--surface-card`) e o `<button>` interno,
 * `AppButton` sem papel, vestia o `.p-button` preenchido do Lara — 94% do card
 * em celeste nos DOIS estados e nos dois temas. Sete cards de redator liam
 * todos como "ligado". Quem pinta é a moldura; o alvo é só área de clique e
 * anel de foco.
 */
describe('AppSelectableCard', () => {
  it('o alvo clicável não veste superfície própria', () => {
    render(<AppSelectableCard selected onToggle={() => {}}>Juan Morales</AppSelectableCard>)

    const alvo = screen.getByRole('button', { pressed: true })
    expect(alvo.className).toContain('p-button-text')
    expect(alvo.className).toContain('bg-transparent!')
    expect(alvo.className).toContain('text-[var(--text-color)]')
  })

  it('sem `onToggle` é leitura: nenhum botão', () => {
    render(<AppSelectableCard>Juan Morales</AppSelectableCard>)
    expect(screen.queryByRole('button')).toBeNull()
  })
})
