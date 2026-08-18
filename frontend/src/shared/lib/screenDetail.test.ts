import { describe, expect, it } from 'vitest'
import { screenDetail } from './screenDetail'

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
