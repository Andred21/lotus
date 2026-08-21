import { describe, expect, it } from 'vitest'
import { loadErrorHint, loadMessage, screenDetail } from './screenDetail'

describe('screenDetail', () => {
  it('envelope do SERVIDOR: não vai à tela', () => {
    // O backend não localiza o envelope RFC 7807: `ProblemDetails.php` devolve
    // português literal e `CorruptedSnapshotException` devolve es-CL fixo. Até
    // isso virar bloco de backend, o corpo visível é dica do i18n do front.
    expect(screenDetail({ detail: 'Ocorreu um erro inesperado. Tente novamente.' })).toBeUndefined()
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
