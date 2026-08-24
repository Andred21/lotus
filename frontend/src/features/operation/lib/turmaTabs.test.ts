import { describe, expect, it } from 'vitest'
import { TURMA_TABS, turmaTabIndex, turmaTabName, turmaTabPath } from './turmaTabs'

describe('turmaTabIndex', () => {
  it('deriva o índice do NOME, não de um número escrito à mão', () => {
    expect(turmaTabIndex('docs')).toBe(TURMA_TABS.indexOf('docs'))
    expect(turmaTabIndex('config')).toBe(0)
  })

  it('nome ausente ou desconhecido abre a primeira aba', () => {
    // URL adulterada (ou aba renomeada num deploy antigo) abre a tela na
    // primeira aba; não deixa `activeIndex` em -1, que esconde os cinco painéis.
    expect(turmaTabIndex(null)).toBe(0)
    expect(turmaTabIndex('inexistente')).toBe(0)
  })
})

describe('turmaTabName', () => {
  it('faz o caminho de volta do índice para o nome', () => {
    expect(turmaTabName(TURMA_TABS.indexOf('docs'))).toBe('docs')
  })

  it('índice fora da régua cai na primeira aba', () => {
    expect(turmaTabName(99)).toBe('config')
  })
})

describe('turmaTabPath', () => {
  it('leva a turma e a aba na URL', () => {
    expect(turmaTabPath(4, 'docs')).toBe('/operacion/turmas/4?tab=docs')
  })
})
