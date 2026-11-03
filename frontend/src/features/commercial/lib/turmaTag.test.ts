import { describe, expect, it } from 'vitest'
import type { QuoteData } from '@shared/types/generated'
import { turmaTag } from './turmaTag'

const cotacao = (status: string, turma_status?: string | null) =>
  ({ status, turma_status }) as unknown as QuoteData

describe('turmaTag', () => {
  it('cotação pendente não tem tag', () => {
    expect(turmaTag(cotacao('pending'))).toBeNull()
  })

  it('cotação recusada não tem tag, mesmo com turma_status', () => {
    expect(turmaTag(cotacao('rejected', 'em_andamento'))).toBeNull()
  })

  it('aprovada sem turma_status é pending', () => {
    expect(turmaTag(cotacao('approved'))).toBe('pending')
    expect(turmaTag(cotacao('approved', null))).toBe('pending')
  })

  it('aprovada em andamento', () => {
    expect(turmaTag(cotacao('approved', 'em_andamento'))).toBe('em_andamento')
  })

  it('aprovada concluída', () => {
    expect(turmaTag(cotacao('approved', 'concluida'))).toBe('concluida')
  })
})
