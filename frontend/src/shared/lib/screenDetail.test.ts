import { describe, expect, it } from 'vitest'
import { loadErrorHint, loadMessage, screenDetail } from './screenDetail'

describe('screenDetail', () => {
  it('403, 404 e 429: o `detail` do servidor VAI à tela', () => {
    // Os três status em que o `ProblemDetails.php` prova que o texto saiu de
    // `lang/` — forbidden, notFound e ThrottleRequests têm chave própria lá.
    expect(screenDetail({ detail: 'Cotización sin cliente', status: 403 })).toBe('Cotización sin cliente')
    expect(screenDetail({ detail: 'Turma no encontrada', status: 404 })).toBe('Turma no encontrada')
    expect(screenDetail({ detail: 'Demasiados intentos', status: 429 })).toBe('Demasiados intentos')
  })

  it('todo o resto segue calado — a allowlist é fechada por desenho', () => {
    // O ramo `default` do ProblemDetails devolve `getMessage()` CRU: é por ele
    // que sai o `CSRF token mismatch.` em inglês do 419 (P-72). Status que
    // ninguém decidiu não entra sozinho.
    expect(screenDetail({ detail: 'Ocorreu um erro inesperado.', status: 500 })).toBeUndefined()
    expect(screenDetail({ detail: 'CSRF token mismatch.', status: 419 })).toBeUndefined()
    expect(screenDetail({ detail: 'Method Not Allowed', status: 405 })).toBeUndefined()
    expect(screenDetail({ detail: 'algo', status: 422 })).toBeUndefined()
    expect(screenDetail({ detail: 'sem status nenhum' })).toBeUndefined()
  })

  it('envelope do FRONT: vai à tela, porque já é i18n', () => {
    expect(
      screenDetail({ detail: 'No se pudo procesar la respuesta del servidor.', localDetail: true }),
    ).toBe('No se pudo procesar la respuesta del servidor.')
  })

  it('sem problema nenhum: undefined, para o `?? hint` do chamador assumir', () => {
    expect(screenDetail(null)).toBeUndefined()
    expect(screenDetail(undefined)).toBeUndefined()
  })

  it('marcado mas sem detail: undefined, nunca string vazia', () => {
    // `''` é falsy mas NÃO é `undefined`: devolvido cru, o `?? hint` do chamador
    // não dispara e a tela mostra erro sem texto.
    expect(screenDetail({ detail: '', localDetail: true })).toBeUndefined()
    expect(screenDetail({ detail: null, localDetail: true })).toBeUndefined()
    // A mesma guarda vale nos três status novos: a porta que abriu foi a do
    // detail localizado, não a do erro sem texto (peso legal).
    for (const status of [403, 404, 429]) {
      expect(screenDetail({ detail: '', status })).toBeUndefined()
      expect(screenDetail({ detail: null, status })).toBeUndefined()
      expect(screenDetail({ detail: '   ', status })).toBeUndefined()
    }
  })
})

describe('loadErrorHint', () => {
  // O `detail` calado tirou da tela a única coisa que distinguia as causas: sem
  // isto, 403, 404 e 422 saíam todos como "revisa tu conexión" — instrução
  // errada, e quem lê fica sem ação (review do BD-13, Q-1).
  it('escolhe a dica pelo STATUS', () => {
    expect(loadErrorHint({ status: 403 })).toBe('common.forbiddenHint')
    expect(loadErrorHint({ status: 404 })).toBe('common.notFoundHint')
    expect(loadErrorHint({ status: 422 })).toBe('common.invalidDataHint')
  })

  it('500, rede caída e status desconhecido caem na dica de conexão', () => {
    expect(loadErrorHint({ status: 500 })).toBe('common.loadErrorHint')
    expect(loadErrorHint({ status: 0 })).toBe('common.loadErrorHint')
    expect(loadErrorHint({ detail: 'sem status' })).toBe('common.loadErrorHint')
    expect(loadErrorHint(null)).toBe('common.loadErrorHint')
    expect(loadErrorHint(undefined)).toBe('common.loadErrorHint')
  })
})

describe('loadMessage — a mensagem que a tela imprime', () => {
  it('prefere o detalhe que sobreviveu ao screenDetail', () => {
    const t = (key: string) => `traduzido:${key}`

    expect(loadMessage({ errorDetail: 'Cotización sin cliente', errorHint: 'common.forbiddenHint' }, t))
      .toBe('Cotización sin cliente')
  })

  it('cai na dica traduzida quando o detalhe do servidor foi calado', () => {
    const t = (key: string) => `traduzido:${key}`

    expect(loadMessage({ errorDetail: undefined, errorHint: 'common.notFoundHint' }, t))
      .toBe('traduzido:common.notFoundHint')
  })

  it('a dica também assume no `null` — a tela nunca fica com erro sem texto', () => {
    // `screenDetail` devolve `undefined`, mas a prop de quem repassa é
    // `string | null` (`StudentClientField:33`), e `??` cobre os dois.
    expect(loadMessage({ errorDetail: null, errorHint: 'common.loadErrorHint' }, (k) => k))
      .toBe('common.loadErrorHint')
  })
})
