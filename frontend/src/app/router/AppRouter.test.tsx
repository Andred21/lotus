import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
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

    expect(await screen.findByRole('heading', { name: 'module.operacion.title' }, { timeout: 5000 })).toBeTruthy()
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
    expect(await screen.findByRole('heading', { name: 'password.title' }, { timeout: 5000 })).toBeTruthy()
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
    expect(await screen.findByRole('alert', {}, { timeout: 5000 })).toBeTruthy()
    expect(screen.getByText('common.loadError')).toBeTruthy()
    expect(reload).not.toHaveBeenCalled()
  })

  it.each(['getItem', 'setItem'] as const)(
    'storage lançando em %s + chunk quebrado: não recarrega (sem laço) e mostra o erro',
    async (metodo) => {
      logado()
      vi.spyOn(Storage.prototype, metodo).mockImplementation(() => {
        throw new DOMException('bloqueado', 'SecurityError')
      })
      const tree = comChunkQuebrado('/operacion', 'Failed to fetch dynamically imported module: /assets/Op-x.js')

      montar(tree, '/operacion')

      // Sem como lembrar que já recarregou, recarregar de novo seria laço infinito
      // num chunk que continua falhando: o erro vai direto para a tela.
      expect(await screen.findByRole('alert', {}, { timeout: 5000 })).toBeTruthy()
      expect(screen.getByText('common.loadError')).toBeTruthy()
      expect(reload).not.toHaveBeenCalled()
    },
  )

  it('erro que não é de chunk não recarrega a página', async () => {
    logado()
    const tree = comChunkQuebrado('/operacion', 'boom')

    montar(tree, '/operacion')

    expect(await screen.findByRole('alert', {}, { timeout: 5000 })).toBeTruthy()
    expect(reload).not.toHaveBeenCalled()
  })

  it('carregar uma página com sucesso limpa a marca, para um deploy futuro poder recarregar', async () => {
    logado()
    window.sessionStorage.setItem(CHUNK_KEY, '1')
    montar(routes, '/operacion')

    await screen.findByRole('heading', { name: 'module.operacion.title' }, { timeout: 5000 })
    expect(window.sessionStorage.getItem(CHUNK_KEY)).toBeNull()
  })

  it('login devolve à URL com search', async () => {
    logado()
    const router = montar(routes, '/operacion?tab=historial')
    await screen.findByRole('heading', { name: 'module.operacion.title' }, { timeout: 5000 })

    // O servidor passa a recusar a sessão: o `/api/me` também, como em produção.
    get.mockImplementation(((url: string) =>
      url === '/api/me' ? Promise.reject({ status: 401, detail: 'x' }) : Promise.resolve({ data: [] })) as never)
    act(() => useSessionStore.getState().expire())

    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
    expect((router.state.location.state as { from?: string }).from).toBe('/operacion?tab=historial')
    expect(await screen.findByText('auth.sessionExpired')).toBeTruthy()

    // O usuário entra de novo: volta à tela em que estava, com a aba.
    vi.spyOn(api, 'post').mockResolvedValue({ data: usuario } as never)
    // Entrando, o servidor volta a conhecer a sessão: o `/api/me` refeito responde.
    get.mockImplementation(((url: string) =>
      Promise.resolve({ data: url === '/api/me' ? usuario : [] })) as never)
    fireEvent.change(screen.getByLabelText('login.email'), { target: { value: 'q@lotus.cl' } })
    fireEvent.change(screen.getByLabelText('login.password'), { target: { value: 'segredo' } })
    fireEvent.click(screen.getByRole('button', { name: 'login.submit' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/operacion'))
    expect(router.state.location.search).toBe('?tab=historial')
    expect(useSessionStore.getState().expired).toBe(false)
    // A limpeza do cache no login não deixa o bootstrap derrubar a sessão nova.
    expect(await screen.findByRole('heading', { name: 'module.operacion.title' })).toBeTruthy()
    expect(useSessionStore.getState().status).toBe('authenticated')
  })
})
