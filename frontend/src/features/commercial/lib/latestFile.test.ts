import { describe, expect, it } from 'vitest'
import { latestFile } from './latestFile'

describe('latestFile', () => {
  it('lista vazia devolve undefined', () => {
    expect(latestFile([])).toBeUndefined()
  })

  it('devolve o de maior created_at', () => {
    const a = { id: 9, created_at: '2026-01-01T10:00:00Z' }
    const b = { id: 1, created_at: '2026-02-01T10:00:00Z' }
    expect(latestFile([a, b])).toBe(b)
  })

  it('dois do mesmo dia: desempata pelo maior id', () => {
    const a = { id: 5, created_at: '2026-01-01T10:00:00Z' }
    const b = { id: 6, created_at: '2026-01-01T10:00:00Z' }
    expect(latestFile([b, a])).toBe(b)
    expect(latestFile([a, b])).toBe(b)
  })
})
