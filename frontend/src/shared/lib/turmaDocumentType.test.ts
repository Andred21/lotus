import { describe, expect, it } from 'vitest'
import en from '@shared/config/locales/en.json'
import esCL from '@shared/config/locales/es-CL.json'
import ptBR from '@shared/config/locales/pt-BR.json'
import { TURMA_DOCUMENT_TYPE_KEY, turmaDocumentTypeLabel, turmaDocumentTypeList } from './turmaDocumentType'

/** O `t` da prova ecoa a chave prefixada: sem prefixo não daria para separar
 * "traduziu" de "devolveu o código cru". */
const eco = (key: string) => `t:${key}`

/** Caminho pontilhado dentro da árvore da locale — `parity.test.ts` compara
 * ESTRUTURA entre as três; aqui a pergunta é outra: a chave que o CÓDIGO pede
 * existe? */
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

/** A catraca que o mapa existe para ter. O compilador garante que todo membro do
 * union `TurmaDocumentType` tem entrada no mapa; este teste garante que a
 * entrada aponta para chave que existe nas 3 locales. As duas metades juntas
 * fecham o caminho: tipo novo no backend → `tsc` reprova o mapa → entrada nova
 * → este teste reprova até a tradução existir. */
describe('todo tipo de documento de turma tem rótulo nas 3 locales', () => {
  it.each(locales)('%s: nenhuma chave do mapa falta', (nome, tree) => {
    const faltando = Object.values(TURMA_DOCUMENT_TYPE_KEY).filter(
      (chave) => typeof folha(tree, chave) !== 'string',
    )

    expect(
      faltando,
      `Locale ${nome} não traduz o tipo de documento nas chaves: ${faltando.join(', ') || '—'}.`,
    ).toEqual([])
  })
})

describe('turmaDocumentTypeLabel', () => {
  it('tipo conhecido sai pela chave do mapa', () => {
    expect(turmaDocumentTypeLabel('MANUAL', eco)).toBe('t:operation.documents.type.MANUAL')
  })

  it('tipo fora do contrato imprime o CÓDIGO, nunca o caminho da chave', () => {
    // Com o template literal que existia antes, isto imprimia
    // "operation.documents.type.EVALUACION_XPTO" na tela do operador.
    expect(turmaDocumentTypeLabel('EVALUACION_XPTO', eco)).toBe('EVALUACION_XPTO')
  })

  it('a lista junta os rótulos traduzidos com ", "', () => {
    expect(turmaDocumentTypeList(['MANUAL', 'PRUEBAS'], eco)).toBe(
      't:operation.documents.type.MANUAL, t:operation.documents.type.PRUEBAS',
    )
  })
})
