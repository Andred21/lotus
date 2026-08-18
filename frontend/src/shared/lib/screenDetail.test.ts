import { describe, expect, it } from 'vitest'
import { loadErrorHint, screenDetail } from './screenDetail'

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
