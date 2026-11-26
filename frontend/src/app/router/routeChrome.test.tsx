import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import i18n from '@shared/config/i18n'
import { createWrapper } from '@shared/testing/providers'
import { api } from '@shared/api/axios'
import { useSessionStore } from '@shared/stores/sessionStore'
import { routes } from './routes'

// i18n REAL de propósito: o que se prova aqui é o texto que o usuário lê
// (título da aba, 404, 403), não qual chave a tela escolhe.

const usuario = (permissions: string[]) => ({
  id: 1, uuid: 'u-1', name: 'Quien Sea', email: 'q@lotus.cl', type: 'admin',
  is_active: true, roles: [], permissions, photo_url: null,
})

/** A sessão vem do `GET /api/me`, como em produção: o bootstrap decide o status. */
function sessao(user: ReturnType<typeof usuario> | null) {
  vi.spyOn(api, 'get').mockImplementation(((url: string) =>
    url === '/api/me' && user === null
      ? Promise.reject({ status: 401 })
      : Promise.resolve({ data: url === '/api/me' ? user : [] })) as never)
}

function montar(entrada: string) {
  const router = createMemoryRouter(routes, { initialEntries: [entrada] })
  const { wrapper } = createWrapper()
  render(<RouterProvider router={router} />, { wrapper })
  return router
}

beforeEach(async () => {
  await i18n.changeLanguage('es-CL')
})

afterEach(() => {
  vi.restoreAllMocks()
  useSessionStore.setState({ user: null, status: 'loading' })
  document.title = ''
})

describe('chrome da rota', () => {
  it('título segue a rota', async () => {
    sessao(usuario(['operation.turma.view', 'catalog.course.view']))
    const router = montar('/operacion')

    await waitFor(() => expect(document.title).toBe('Operación · Lotus'))

    await act(() => router.navigate('/cursos'))
    await waitFor(() => expect(document.title).toBe('Cursos · Lotus'))
  })

  it('foco vai ao main na navegação e não na carga', async () => {
    sessao(usuario(['operation.turma.view', 'catalog.course.view']))
    const router = montar('/operacion')
    await screen.findByRole('heading', { name: 'Operación' })

    expect(document.activeElement).toBe(document.body)

    await act(() => router.navigate('/cursos'))
    await screen.findByRole('heading', { name: 'Cursos' })

    expect(document.activeElement).toBe(document.getElementById('contenido'))
  })

  it('rota desconhecida mostra 404 dentro do layout', async () => {
    sessao(usuario([]))
    montar('/nao-existe')

    expect(await screen.findByRole('heading', { name: 'Página no encontrada' })).toBeTruthy()
    expect(document.getElementById('contenido')?.textContent).toContain('Página no encontrada')
    expect(screen.getByRole('button', { name: 'Volver al inicio' })).toBeTruthy()
    await waitFor(() => expect(document.title).toBe('Página no encontrada · Lotus'))
  })

  it('módulo sem permissão mostra 403 sem Reintentar', async () => {
    sessao(usuario([]))
    montar('/operacion')

    expect(await screen.findByRole('heading', { name: 'Sin acceso a esta sección' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Reintentar' })).toBeNull()
  })

  it('detalhe sem permissão mostra 403', async () => {
    sessao(usuario([]))
    montar('/operacion/turmas/5')

    expect(await screen.findByRole('heading', { name: 'Sin acceso a esta sección' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Reintentar' })).toBeNull()
  })

  it('rota desconhecida sem sessão vai ao login, não ao 404', async () => {
    sessao(null)
    const router = montar('/nao-existe')

    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
    expect(screen.queryByText('Página no encontrada')).toBeNull()
  })
})
