import { describe, expect, it } from 'vitest'
import { budgetsApi } from '@shared/api/budgetsApi'
import { quoteKeys } from './useQuotes'

/** `invalidateQueries({ queryKey })` casa por PREFIXO: a chave invalidada
 * alcança toda query cuja chave comece por ela. É essa a regra que os testes
 * abaixo exercitam — sem TanStack no teste, mantendo o padrão do
 * `createCrudResource.test.ts`. */
const alcanca = (invalidada: readonly unknown[], chaveDaQuery: readonly unknown[]) =>
  invalidada.every((parte, i) => Object.is(parte, chaveDaQuery[i]))

/**
 * Critério de aceite 9 da spec §5 do bloco `arquivados-roots-restantes`: o
 * restore aninhado invalida a lista do PAI CERTO. Enquanto o restore invalidava
 * `budgetsApi.keys.all`, restaurar uma cotação do orçamento 1 refazia também as
 * queries do 2 — inofensivo no resultado, e ainda assim o oposto do que a spec
 * afirmava (Q-4 do review de 2026-08-19).
 */
describe('invalidação do restore de cotação', () => {
  it('alcança as cotações arquivadas do pai e NÃO as de outro orçamento', () => {
    const invalidadas = quoteKeys.invalidatedByRestore(1)

    expect(invalidadas.some((k) => alcanca(k, quoteKeys.archived(1)))).toBe(true)
    expect(invalidadas.some((k) => alcanca(k, quoteKeys.archived(2)))).toBe(false)
  })

  it('não alcança o detalhe de outro orçamento', () => {
    const invalidadas = quoteKeys.invalidatedByRestore(1)

    expect(invalidadas.some((k) => alcanca(k, budgetsApi.keys.detail(1)))).toBe(true)
    expect(invalidadas.some((k) => alcanca(k, budgetsApi.keys.detail(2)))).toBe(false)
  })

  it('alcança a lista de orçamentos: os totais do pai mudam quando a cotação volta', () => {
    const invalidadas = quoteKeys.invalidatedByRestore(1)

    expect(invalidadas.some((k) => alcanca(k, budgetsApi.keys.lists()))).toBe(true)
  })
})
