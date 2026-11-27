import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { TurmaCreatePage } from './TurmaCreatePage'

// O formulário real tem queries e dezenas de campos; o que esta página decide é
// o que fazer DEPOIS de salvar, então o card vira um botão que chama `onSaved`.
vi.mock('./TurmaConfigCard', () => ({
  TurmaConfigCard: ({ onSaved }: { onSaved: (id: number) => void }) => (
    <button onClick={() => onSaved(7)}>salvar</button>
  ),
}))

describe('TurmaCreatePage', () => {
  it('salvar a criação substitui a entrada: voltar não reabre o formulário', async () => {
    const router = createMemoryRouter(
      [
        { path: '/operacion', element: <p>lista</p> },
        { path: '/operacion/turmas/nueva/:quoteId', element: <TurmaCreatePage /> },
        { path: '/operacion/turmas/:id', element: <p>detalhe</p> },
      ],
      { initialEntries: ['/operacion?q=ana', '/operacion/turmas/nueva/3'], initialIndex: 1 },
    )
    render(<RouterProvider router={router} />)

    fireEvent.click(screen.getByText('salvar'))
    await waitFor(() => expect(router.state.location.pathname).toBe('/operacion/turmas/7'))

    await router.navigate(-1)

    expect(router.state.location.pathname).toBe('/operacion')
    expect(router.state.location.search).toBe('?q=ana')
  })
})
