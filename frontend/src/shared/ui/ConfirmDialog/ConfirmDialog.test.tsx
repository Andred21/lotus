import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ConfirmDialog } from './ConfirmDialog'

const base = {
  visible: true,
  title: 'Confirmar',
  message: '¿Seguro?',
  onConfirm: () => {},
  onCancel: () => {},
}

/**
 * `CrudDialog` confirmava com a marca e `ConfirmDialog` com o `severity` cru do
 * Lara: dois diálogos do mesmo produto, dois botões de confirmar diferentes
 * (achado B3). Confirmar é a mesma ação nos dois; o que difere é a severidade.
 */
describe('ConfirmDialog — botão de confirmar', () => {
  it('sem severidade, confirma com a marca (igual ao CrudDialog)', () => {
    render(<ConfirmDialog {...base} confirmLabel="Aceptar" />)

    expect(screen.getByRole('button', { name: /Aceptar/ }).className)
      .toContain('border-[var(--brand-ink)]')
  })

  /** Ação destrutiva NÃO veste marca: o preenchido de severidade é o sinal, e
   * trocá-lo por marca apagaria a diferença entre confirmar e destruir. */
  it('com `severity="danger"`, mantém o preenchido de severidade', () => {
    render(<ConfirmDialog {...base} confirmLabel="Eliminar" severity="danger" />)

    const botao = screen.getByRole('button', { name: /Eliminar/ })
    expect(botao.className).toContain('p-button-danger')
    expect(botao.className).not.toContain('border-[var(--brand-ink)]')
  })
})
