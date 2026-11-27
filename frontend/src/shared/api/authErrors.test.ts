import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios'
import { api } from './axios'
import { useSessionStore } from '@shared/stores/sessionStore'

/**
 * O interceptor de auth na instância REAL, com o adapter do axios trocado: é o
 * adapter que decide o status; o resto (interceptors, retry, store) é o que a app
 * roda em produção.
 */

const usuario = {
  id: 1, uuid: 'u-1', name: 'Quien Sea', email: 'q@lotus.cl', type: 'admin',
  is_active: true, roles: [], permissions: [], photo_url: null,
}

type Resposta = { status: number; data?: unknown }
type Roteiro = (url: string, chamada: number) => Resposta

const adapterOriginal = api.defaults.adapter
let chamadas: Record<string, number>

/** O adapter devolve o que o roteiro manda: 2xx resolve, o resto rejeita como o axios real. */
function roteirizar(roteiro: Roteiro) {
  api.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    const url = config.url ?? ''
    chamadas[url] = (chamadas[url] ?? 0) + 1
    const { status, data } = roteiro(url, chamadas[url])
    const problema = { type: 'about:blank', title: 'x', status, detail: 'x', instance: '' }
    const response = { data: data ?? (status >= 400 ? problema : {}), status, statusText: '', headers: {}, config }
    if (status >= 200 && status < 300) return response
    throw new AxiosError('falhou', String(status), config, null, { ...response, headers: new AxiosHeaders() })
  }
}

/** Quantas vezes o store notificou uma sessão expirada. */
function contarExpiracoes() {
  const contador = { vezes: 0 }
  useSessionStore.subscribe((s, anterior) => {
    if (s.expired && !anterior.expired) contador.vezes += 1
  })
  return contador
}

beforeEach(() => {
  chamadas = {}
  useSessionStore.setState({ status: 'authenticated', user: usuario as never, expired: false })
})

afterEach(() => {
  api.defaults.adapter = adapterOriginal
  useSessionStore.setState({ user: null, status: 'loading', expired: false })
})

describe('interceptor de sessão', () => {
  it('401 em rota autenticada expira a sessão', async () => {
    roteirizar(() => ({ status: 401 }))

    await expect(api.get('/api/clients')).rejects.toMatchObject({ status: 401 })

    expect(useSessionStore.getState()).toMatchObject({ expired: true, status: 'unauthenticated', user: null })
  })

  it('três 401 simultâneos expiram uma vez só', async () => {
    roteirizar(() => ({ status: 401 }))
    const expiracoes = contarExpiracoes()

    const resultados = await Promise.allSettled([
      api.get('/api/dashboard/a'),
      api.get('/api/dashboard/b'),
      api.get('/api/dashboard/c'),
    ])

    expect(resultados.every((r) => r.status === 'rejected')).toBe(true)
    expect(expiracoes.vezes).toBe(1)
  })

  it('419 renova o CSRF e repete uma vez, sem expirar quando a repetição passa', async () => {
    roteirizar((url, n) => {
      if (url === '/api/clients') return { status: n === 1 ? 419 : 200, data: { ok: true } }
      return { status: 204 }
    })

    const resposta = await api.post('/api/clients', {})

    expect(resposta.data).toEqual({ ok: true })
    expect(chamadas['/sanctum/csrf-cookie']).toBe(1)
    expect(chamadas['/api/clients']).toBe(2)
    expect(useSessionStore.getState().expired).toBe(false)
  })

  it('419 duas vezes expira, sem repetir uma terceira', async () => {
    roteirizar((url) => ({ status: url === '/api/clients' ? 419 : 204 }))

    await expect(api.post('/api/clients', {})).rejects.toMatchObject({ status: 419 })

    expect(chamadas['/api/clients']).toBe(2)
    expect(useSessionStore.getState().expired).toBe(true)
  })

  it('419 seguido de 401 na repetição expira', async () => {
    roteirizar((url, n) => {
      if (url === '/api/clients') return { status: n === 1 ? 419 : 401 }
      return { status: 204 }
    })

    await expect(api.post('/api/clients', {})).rejects.toMatchObject({ status: 401 })

    expect(useSessionStore.getState().expired).toBe(true)
  })

  it('419 que não consegue renovar o CSRF rejeita sem laço e sem expirar', async () => {
    roteirizar((url) => ({ status: url === '/api/clients' ? 419 : 500 }))

    await expect(api.post('/api/clients', {})).rejects.toMatchObject({ status: 419 })

    expect(chamadas['/sanctum/csrf-cookie']).toBe(1)
    expect(chamadas['/api/clients']).toBe(1)
    expect(useSessionStore.getState().expired).toBe(false)
  })

  it('401 do /api/me e do /api/login não expira', async () => {
    roteirizar(() => ({ status: 401 }))

    await expect(api.get('/api/me')).rejects.toMatchObject({ status: 401 })
    await expect(api.post('/api/login', {})).rejects.toMatchObject({ status: 401 })

    expect(useSessionStore.getState().expired).toBe(false)
  })

  it('401 do logout não expira', async () => {
    roteirizar(() => ({ status: 401 }))

    await expect(api.post('/api/logout')).rejects.toMatchObject({ status: 401 })

    expect(useSessionStore.getState().expired).toBe(false)
  })

  it.each(['/api/invitation/accept', '/api/password/reset', '/api/password/forgot'])(
    '401 em %s (rota de senha, pública) não expira',
    async (rota) => {
      roteirizar(() => ({ status: 401 }))

      await expect(api.post(rota, {})).rejects.toMatchObject({ status: 401 })

      expect(useSessionStore.getState().expired).toBe(false)
    },
  )

  it('401 em outra rota que só compartilha o prefixo de /api/me expira', async () => {
    roteirizar(() => ({ status: 401 }))

    await expect(api.get('/api/me/photo')).rejects.toMatchObject({ status: 401 })

    expect(useSessionStore.getState().expired).toBe(true)
  })

  it('expire é idempotente e só age com a sessão autenticada', () => {
    useSessionStore.setState({ status: 'unauthenticated', user: null, expired: false })

    useSessionStore.getState().expire()

    expect(useSessionStore.getState().expired).toBe(false)
  })

  it('clear e setUser zeram o aviso de expirada', () => {
    useSessionStore.getState().expire()
    expect(useSessionStore.getState().expired).toBe(true)

    useSessionStore.getState().clear()
    expect(useSessionStore.getState().expired).toBe(false)

    useSessionStore.setState({ expired: true })
    useSessionStore.getState().setUser(usuario as never)
    expect(useSessionStore.getState().expired).toBe(false)
  })
})

