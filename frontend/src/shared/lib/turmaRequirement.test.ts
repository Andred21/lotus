import { describe, expect, it } from 'vitest'
import en from '@shared/config/locales/en.json'
import esCL from '@shared/config/locales/es-CL.json'
import ptBR from '@shared/config/locales/pt-BR.json'
import { TURMA_REQUIREMENT_KEY, turmaRequirementLabel, turmaRequirementList } from './turmaRequirement'

const eco = (key: string) => `t:${key}`

const folha = (tree: unknown, caminho: string): unknown =>
  caminho.split('.').reduce<unknown>(
    (no, parte) => (no == null ? undefined : (no as Record<string, unknown>)[parte]),
    tree,
  )

const locales: [string, unknown][] = [
  ['es-CL', esCL],
  ['pt-BR', ptBR],
  ['en', en],
]

/** Mesma catraca do `turmaDocumentType`: o compilador cobra a entrada do mapa,
 * este teste cobra a tradução nas 3 locales. */
describe('todo requisito de turma tem rótulo nas 3 locales', () => {
  it.each(locales)('%s: nenhuma chave do mapa falta', (nome, tree) => {
    const faltando = Object.values(TURMA_REQUIREMENT_KEY).filter(
      (chave) => typeof folha(tree, chave) !== 'string',
    )

    expect(
      faltando,
      `Locale ${nome} não traduz o requisito nas chaves: ${faltando.join(', ') || '—'}.`,
    ).toEqual([])
  })
})

describe('turmaRequirementLabel', () => {
  it('sai pela chave de operation.conclusion.requirement', () => {
    expect(turmaRequirementLabel('redator', eco)).toBe('t:operation.conclusion.requirement.redator')
    expect(turmaRequirementLabel('local_aplicacao', eco)).toBe('t:operation.conclusion.requirement.local_aplicacao')
  })
})

describe('turmaRequirementList', () => {
  it('junta os rótulos na ordem recebida, com ", "', () => {
    expect(turmaRequirementList(['redator', 'local_aplicacao'], eco)).toBe(
      't:operation.conclusion.requirement.redator, t:operation.conclusion.requirement.local_aplicacao',
    )
    expect(turmaRequirementList(['local_aplicacao', 'redator'], eco)).toBe(
      't:operation.conclusion.requirement.local_aplicacao, t:operation.conclusion.requirement.redator',
    )
  })

  it('lista vazia vira texto vazio', () => {
    expect(turmaRequirementList([], eco)).toBe('')
  })
})
