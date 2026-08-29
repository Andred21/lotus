import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import i18n from '@shared/config/i18n'
import { CrudDialog } from './CrudDialog'

beforeAll(async () => {
  await i18n.changeLanguage('es-CL')
})
afterEach(cleanup)

function Harness({ pending, invalido }: { pending: boolean; invalido: boolean }) {
  return (
    <CrudDialog visible mode="create" title="Curso" onHide={() => {}} onSubmit={() => {}} pending={pending}>
      <input aria-label="Nombre" aria-invalid={invalido || undefined} />
    </CrudDialog>
  )
}

/**
 * Medido no CourseDialog em 422 (f4 UI-03, run de 2026-08-28): o Prime
 * desabilita o botão de salvar enquanto `loading`, o navegador solta o foco
 * de um elemento `disabled` para o `<body>`, e quando o botão reabilita
 * ninguém o traz de volta. Quem opera por teclado recomeça o Tab do início do
 * documento sem saber o que houve.
 */
describe('CrudDialog — foco após envio reprovado', () => {
  it('leva o foco ao primeiro campo inválido quando `pending` cai', () => {
    const { rerender } = render(<Harness pending invalido />)
    ;(document.activeElement as HTMLElement | null)?.blur()
    expect(document.activeElement).toBe(document.body)

    rerender(<Harness pending={false} invalido />)

    expect(document.activeElement).toBe(screen.getByLabelText('Nombre'))
  })

  it('sem campo inválido, devolve o foco ao botão de salvar se ele caiu no body', () => {
    const { rerender } = render(<Harness pending invalido={false} />)
    ;(document.activeElement as HTMLElement | null)?.blur()

    rerender(<Harness pending={false} invalido={false} />)

    expect(document.activeElement).toBe(screen.getByRole('button', { name: /Guardar/ }))
  })
})
