import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { createWrapper } from '@shared/testing/providers'
import { api } from '@shared/api/axios'
import { useSessionStore } from '@shared/stores/sessionStore'
import { useLogin } from './authApi'

vi.mock('@shared/api/axios', async () => ({
  ...(await vi.importActual<typeof import('@shared/api/axios')>('@shared/api/axios')),
  api: { post: vi.fn(), get: vi.fn() },
}))

const usuario = (id: number, name: string) => ({
  id, uuid: `u-${id}`, name, email: `${name}@lotus.cl`, type: 'admin',
  is_active: true, roles: [], permissions: [], photo_url: null,
})
const ana = usuario(1, 'ana')
const beto = usuario(2, 'beto')

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(api.get).mockResolvedValue({ data: null } as never)
  vi.mocked(api.post).mockResolvedValue({ data: beto } as never)
  useSessionStore.setState({ status: 'authenticated', user: ana as never, expired: false })
})

afterEach(() => useSessionStore.setState({ user: null, status: 'loading', expired: false }))

/** Cache que a Ana deixou na aba: a identidade dela e dados de tela. */
function semearCacheDaAna(client: ReturnType<typeof createWrapper>['client']) {
  client.setQueryData(['me'], ana)
  client.setQueryData(['clients', 'list'], [{ id: 10, name: 'Cliente da Ana' }])
}

describe('useLogin depois de a sessão expirar', () => {
  it('login de outro usuário não herda o cache do anterior', async () => {
    const { wrapper, client } = createWrapper()
    semearCacheDaAna(client)
    useSessionStore.getState().expire()

    const { result } = renderHook(() => useLogin(), { wrapper })
    act(() => result.current.mutate({ email: 'beto@lotus.cl', password: 'x' }))

    await waitFor(() => expect(useSessionStore.getState().user).toMatchObject({ id: 2 }))
    expect(client.getQueryData(['me'])).toBeUndefined()
    expect(client.getQueryData(['clients', 'list'])).toBeUndefined()
    expect(useSessionStore.getState().expired).toBe(false)
  })

  it('login normal, sem expiração, não esvazia o cache', async () => {
    const { wrapper, client } = createWrapper()
    semearCacheDaAna(client)
    useSessionStore.setState({ status: 'unauthenticated', user: null, expired: false })

    const { result } = renderHook(() => useLogin(), { wrapper })
    act(() => result.current.mutate({ email: 'beto@lotus.cl', password: 'x' }))

    await waitFor(() => expect(useSessionStore.getState().status).toBe('authenticated'))
    expect(client.getQueryData(['clients', 'list'])).toBeDefined()
  })
})
