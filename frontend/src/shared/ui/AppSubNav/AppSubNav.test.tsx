import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { AppSubNav } from './AppSubNav'

const items = [
  { key: 'certificados', label: 'Certificados' },
  { key: 'otro', label: 'Otro' },
]

describe('AppSubNav', () => {
  it('marca o item atual com aria-current e chama onSelect', () => {
    const onSelect = vi.fn()
    render(<AppSubNav items={items} activeKey="certificados" onSelect={onSelect} ariaLabel="Submódulos" />)

    expect(screen.getByRole('navigation', { name: 'Submódulos' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Certificados' }).getAttribute('aria-current')).toBe('page')
    expect(screen.getByRole('button', { name: 'Otro' }).getAttribute('aria-current')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Otro' }))
    expect(onSelect).toHaveBeenCalledWith('otro')
  })

  /** A1 (A-12): só o tinte de 10% do fundo não chega a 3:1 contra o card; o item
   * atual ganha também a borda inferior de 2px em `--brand-ink` e peso 600. */
  it('subnav ativo tem indicador além do tinte', () => {
    render(<AppSubNav items={items} activeKey="certificados" onSelect={() => {}} ariaLabel="Submódulos" />)

    const ativo = screen.getByRole('button', { name: 'Certificados' })
    expect(ativo.style.borderBottom).toContain('2px solid')
    expect(ativo.style.borderBottom).toContain('var(--brand-ink)')
    expect(ativo.style.fontWeight).toBe('600')

    const outro = screen.getByRole('button', { name: 'Otro' })
    // Mesma espessura, transparente: o item atual não desloca a lista em 2px.
    expect(outro.style.borderBottom).toContain('transparent')
    expect(outro.style.borderBottom).not.toContain('--brand-ink')
    expect(outro.style.fontWeight).toBe('')
  })
})
