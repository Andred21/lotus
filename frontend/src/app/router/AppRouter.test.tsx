import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { RouterProvider, createMemoryRouter, type RouteObject } from 'react-router-dom'
import { createWrapper } from '@shared/testing/providers'
import { api } from '@shared/api/axios'
import { useSessionStore } from '@shared/stores/sessionStore'
import { routes } from './routes'

vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return { ...(await importOriginal<typeof import('react-i18next')>()), useTranslation: mockUseTranslation() }
})

const CHUNK_KEY = 'lotus:chunk-reload'

const usuario = {
  id: 1, uuid: 'u-1', name: 'Quien Sea', email: 'q@lotus.cl', type: 'admin',
  is_active: true, roles: [], permissions: ['operation.turma.view'], photo_url: null,
}

const logado = () => useSessionStore.setState({ status: 'authenticated', user: usuario as never })

let get: ReturnType<typeof vi.spyOn>
const reload = vi.fn()

beforeEach(() => {
  get = vi.spyOn(api, 'get').mockImplementation(((url: string) =>
    Promise.resolve({ data: url === '/api/me' ? usuario : [] })) as never)
  vi.stubGlobal('location', { ...window.location, reload })
  window.sessionStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  reload.mockClear()
  useSessionStore.setState({ user: null, status: 'loading' })
})

function montar(tree: RouteObject[], entrada: string) {
  const router = createMemoryRouter(tree, { initialEntries: [entrada] })
  const { wrapper } = createWrapper()
  render(<RouterProvider router={router} />, { wrapper })
  return router
}

/** A mesma árvore de produção, com o `lazy` de uma rota trocado por um que rejeita:
 * o `errorElement` que se prova é o que a rota de verdade carrega. */
function comChunkQuebrado(path: string, mensagem: string): RouteObject[] {
  const trocar = (rs: RouteObject[]): RouteObject[] =>
    rs.map((r) => ({
      ...r,
      ...(r.path === path ? { lazy: () => Promise.reject(new TypeError(mensagem)) } : {}),
      ...(r.children ? { children: trocar(r.children) } : {}),
    }) as RouteObject)
  return trocar(routes)
}

describe('routes', () => {
  it('rota /operacion carrega a página lazy', async () => {
    logado()
    montar(routes, '/operacion')

    expect(await screen.findByRole('heading', { name: 'module.operacion.title' })).toBeTruthy()
  })

  it('/login com sessão autenticada redireciona para /', async () => {
    logado()
    const router = montar(routes, '/login')

    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
  })

  it('/definir-clave/:token fica fora do bootstrap', async () => {
    montar(routes, '/definir-clave/abc123')

    // A página carregou (o título é dela); se o bootstrap estivesse no caminho, o
    // `GET /api/me` já teria saído antes do primeiro paint dela.
    expect(await screen.findByRole('heading', { name: 'password.title' })).toBeTruthy()
    expect(get).not.toHaveBeenCalled()
  })

  it('falha ao carregar chunk recarrega uma vez, e na segunda mostra o erro', async () => {
    logado()
    const tree = comChunkQuebrado('/operacion', 'Failed to fetch dynamically imported module: /assets/Op-x.js')

    montar(tree, '/operacion')
    await waitFor(() => expect(reload).toHaveBeenCalledTimes(1))
    expect(window.sessionStorage.getItem(CHUNK_KEY)).not.toBeNull()
    expect(screen.queryByRole('alert')).toBeNull()

    // Segunda falha, já com a marca: sem novo reload, o erro aparece.
    reload.mockClear()
    document.body.innerHTML = ''
    montar(tree, '/operacion')
    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(screen.getByText('common.loadError')).toBeTruthy()
    expect(reload).not.toHaveBeenCalled()
  })

  it('erro que não é de chunk não recarrega a página', async () => {
    logado()
    const tree = comChunkQuebrado('/operacion', 'boom')

    montar(tree, '/operacion')

    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(reload).not.toHaveBeenCalled()
  })

  it('carregar uma página com sucesso limpa a marca, para um deploy futuro poder recarregar', async () => {
    logado()
    window.sessionStorage.setItem(CHUNK_KEY, '1')
    montar(routes, '/operacion')

    await screen.findByRole('heading', { name: 'module.operacion.title' })
    expect(window.sessionStorage.getItem(CHUNK_KEY)).toBeNull()
  })
})
