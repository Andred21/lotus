import { describe, expect, it } from 'vitest'
import { api } from './axios'

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
})
