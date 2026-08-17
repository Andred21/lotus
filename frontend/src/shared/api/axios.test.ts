import { describe, expect, it } from 'vitest'
import { AxiosHeaders, type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { api, type ProblemDetails } from './axios'

/**
 * A lição 6 na instância REAL, sem mock. `postMultipart.test.ts` mocka
 * `./axios` no topo do arquivo (hoisted, vale para o arquivo inteiro), então
 * nada lá exercita o objeto que roda em produção — e o bug da lição 6 nasce
 * exatamente na instância: um `Content-Type: application/json` no
 * `axios.create` faz o `transformRequest` serializar o FormData, cada File
 * vira `{}` e o upload chega VAZIO com 201 silencioso, em caminho de documento
 * com peso legal.
 *
 * A asserção é sobre o VALOR fixado, não sobre a presença da chave: o próprio
 * axios escreve `Content-Type: undefined` em `defaults.headers.common`, que é a
 * forma dele de dizer "derive do payload" — exatamente o estado que esta guarda
 * protege. Chave ausente e chave com `undefined` são o mesmo comportamento;
 * `JSON.stringify` esconde a segunda, e foi assim que a medição de 2026-08-10
 * concluiu que só `Accept` existia.
 *
 * Case-insensitive de propósito: header HTTP não distingue caixa, e
 * `content-type` minúsculo quebraria a app do mesmo jeito.
 */
const escopos = ['common', 'delete', 'get', 'head', 'post', 'put', 'patch'] as const

/**
 * Os `fulfilled` dos interceptors de request registrados na instância.
 * `handlers` não está no tipo público do axios — é a única porta para
 * exercitar o que a APP pendurou, sem subir uma requisição de verdade.
 */
function handlersDeRequest(): Array<(c: InternalAxiosRequestConfig) => unknown> {
  const manager = api.interceptors.request as unknown as {
    handlers: Array<{ fulfilled?: (c: InternalAxiosRequestConfig) => unknown } | null>
  }

  return manager.handlers.flatMap((h) => (h?.fulfilled ? [h.fulfilled] : []))
}

/** Valores de Content-Type REALMENTE fixados no objeto de headers. */
function contentTypeFixado(headers: unknown): unknown[] {
  return Object.entries((headers ?? {}) as Record<string, unknown>)
    .filter(([chave]) => chave.toLowerCase() === 'content-type')
    .filter(([, valor]) => valor !== undefined && valor !== null)
    .map(([, valor]) => valor)
}

describe('instância do axios', () => {
  it.each(escopos)('não fixa Content-Type em `%s`', (escopo) => {
    const headers = (api.defaults.headers as unknown as Record<string, unknown>)[escopo]

    expect(contentTypeFixado(headers)).toEqual([])
  })

  it('não fixa Content-Type na raiz de `defaults.headers`', () => {
    // O que se passa a `axios.create({ headers: … })` pousa AQUI, não em
    // `common` — foi assim que `Accept` chegou. É a porta mais provável do bug.
    const raiz = Object.fromEntries(
      Object.entries(api.defaults.headers as unknown as Record<string, unknown>).filter(
        ([chave]) => !escopos.includes(chave as (typeof escopos)[number]),
      ),
    )

    expect(contentTypeFixado(raiz)).toEqual([])
  })

  it('fixa Accept, que é o header que a app depende', () => {
    // Guarda de porta múltipla: sem esta asserção, um `defaults.headers`
    // vazio (instância trocada, import quebrado) passaria nas duas de cima
    // sem provar nada.
    expect(JSON.stringify(api.defaults.headers)).toContain('application/json')
  })

  /**
   * A SEGUNDA porta do mesmo arquivo, e a que faltava (Q-1 do review de
   * 2026-08-11). `defaults.headers` era tudo que esta guarda olhava, e
   * `axios.ts` tem um interceptor de request seis linhas abaixo do
   * `axios.create` — quem escrevesse `headers.set('Content-Type', …)` ali
   * reproduzia o bug da lição 6 inteiro com a suíte verde. Provado por sonda:
   * o mutante passava os 16 arquivos / 79 testes.
   *
   * O universo é o que a APP declara, não o pipeline inteiro do axios. Uma
   * versão anterior desta guarda mandava uma requisição real por `adapter` e
   * lia o header final; medido, o axios do jsdom escreve
   * `application/x-www-form-urlencoded` para FormData, que é artefato do
   * ambiente e não configuração nossa — assertar ali reprovaria o estado
   * correto, que é o mesmo erro da D-E2 deste bloco (afirmar ausência de
   * chave onde o axios escreve `undefined` de propósito).
   */
  it('nenhum interceptor de request fixa Content-Type', async () => {
    const config = {
      headers: new AxiosHeaders({ Accept: 'application/json' }),
    } as InternalAxiosRequestConfig

    for (const handler of handlersDeRequest()) {
      await handler(config)
    }

    expect(contentTypeFixado(config.headers.toJSON())).toEqual([])
  })

  it('há interceptor de request registrado', () => {
    // Guarda da guarda: interceptor removido (ou `handlers` renomeado numa
    // major do axios) deixaria o laço acima iterando vazio e passando sem
    // exercitar nada.
    expect(handlersDeRequest().length).toBeGreaterThan(0)
  })
})

/** Os `rejected` dos interceptors de resposta, pela mesma porta do de request. */
function handlersDeResponse(): Array<(e: unknown) => unknown> {
  const manager = api.interceptors.response as unknown as {
    handlers: Array<{ rejected?: (e: unknown) => unknown } | null>
  }

  return manager.handlers.flatMap((h) => (h?.rejected ? [h.rejected] : []))
}

/** O valor com que a app REJEITA — é ele que chega ao `error` da query. */
async function rejeicao(error: Partial<AxiosError>): Promise<unknown> {
  const [rejeitar] = handlersDeResponse()

  return await Promise.resolve(rejeitar(error)).then(
    (v) => v,
    (motivo: unknown) => motivo,
  )
}

/** `message` é o que o axios põe em `error.message` — a string inglesa que o
 * fallback NÃO pode devolver como `detail`. Fica nomeada para a guarda abaixo
 * poder apontar para ela. */
const MENSAGEM_DO_AXIOS = 'Request failed with status code 502'

const resposta = (status: number, data: unknown) =>
  ({ message: MENSAGEM_DO_AXIOS, response: { status, data } }) as Partial<AxiosError>

describe('normalização de erro do axios', () => {
  it('há interceptor de resposta registrado', () => {
    expect(handlersDeResponse().length).toBeGreaterThan(0)
  })

  it('erro SEM corpo não rejeita com valor falsy', async () => {
    // A forma do defeito, não o texto: a tela ramifica por `if (loadError)`, e
    // um 5xx de corpo vazio rejeitava com `''` — falha que não aparecia em
    // lugar nenhum, nem inline nem substituindo a tela (2026-08-16).
    for (const vazio of ['', null, undefined, '<html>Bad Gateway</html>']) {
      const motivo = await rejeicao(resposta(502, vazio))

      expect(motivo).toBeTruthy()
      expect(typeof motivo).toBe('object')
      expect((motivo as ProblemDetails).status).toBe(502)
      expect((motivo as ProblemDetails).title).toBeTruthy()

      // As DUAS linhas vêm do i18n, não só o título. `detail` é o que
      // `AppErrorState`/`InlineLoadState` renderizam como CORPO — devolver
      // `error.message` aqui vazava "Request failed with status code 502" para
      // a UI es-CL do cliente chileno. Sem esta asserção a reversão passava
      // verde: o caso já existia e nunca olhou o `detail` (Q-8 do review de
      // 2026-08-17).
      expect((motivo as ProblemDetails).detail).toBeTruthy()
      expect((motivo as ProblemDetails).detail).not.toBe(MENSAGEM_DO_AXIOS)
    }
  })

  it('envelope RFC 7807 do backend passa intacto', async () => {
    // O fallback não pode comer o que o backend disse: `detail` e `errors` são
    // o que o formulário pendura nos campos.
    const envelope = {
      type: 'https://lotus.cl/errors/validation',
      title: 'Datos inválidos',
      status: 422,
      detail: 'El RUT ya existe.',
      instance: '/api/redatores',
      errors: { rut: ['El RUT ya existe.'] },
    }

    expect(await rejeicao(resposta(422, envelope))).toEqual(envelope)
  })

  it('sem resposta do servidor vira erro de rede traduzido', async () => {
    const motivo = (await rejeicao({ message: 'Network Error' })) as ProblemDetails

    expect(motivo.status).toBe(0)
    expect(motivo.title).toBeTruthy()
    expect(motivo.detail).toBeTruthy()
  })
})
