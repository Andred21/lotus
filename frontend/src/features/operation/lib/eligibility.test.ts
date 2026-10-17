import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { RedatorData } from '@shared/types/generated'
import { motivosInidoneidade } from './eligibility'

const CURSO = 9

function redator(over: { courseIds?: number[]; reuf?: string | null | 'sem' }): RedatorData {
  const documents =
    over.reuf === 'sem'
      ? []
      : [{ id: 1, type: 'REUF', valid_until: over.reuf ?? null }]
  return {
    id: 1, name: 'Carla', rut: '1-9', email: 'c@lotus.cl', phone: null, is_active: true,
    course_ids: over.courseIds ?? [CURSO], documents, photo_url: null, last_login: null,
  } as unknown as RedatorData
}

describe('motivosInidoneidade (RN-09)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 9, 17, 12, 0, 0))
  })
  afterEach(() => vi.useRealTimers())

  it('habilitado com REUF vigente: sem motivo', () => {
    expect(motivosInidoneidade(redator({ reuf: '2030-01-01' }), CURSO)).toEqual([])
  })

  it('habilitado com REUF sem validade: sem motivo', () => {
    expect(motivosInidoneidade(redator({ reuf: null }), CURSO)).toEqual([])
  })

  it('habilitado sem REUF: reuf_invalid', () => {
    expect(motivosInidoneidade(redator({ reuf: 'sem' }), CURSO)).toEqual(['reuf_invalid'])
  })

  it('habilitado com REUF vencida: reuf_invalid', () => {
    expect(motivosInidoneidade(redator({ reuf: '2020-01-01' }), CURSO)).toEqual(['reuf_invalid'])
  })

  it('habilitado com REUF de data inparseável: reuf_invalid', () => {
    expect(motivosInidoneidade(redator({ reuf: 'lixo' }), CURSO)).toEqual(['reuf_invalid'])
  })

  it('não habilitado com REUF vigente: not_qualified', () => {
    expect(motivosInidoneidade(redator({ courseIds: [1], reuf: '2030-01-01' }), CURSO)).toEqual(['not_qualified'])
  })

  it('não habilitado e sem REUF: os dois, na ordem do backend', () => {
    expect(motivosInidoneidade(redator({ courseIds: [1], reuf: 'sem' }), CURSO)).toEqual(['not_qualified', 'reuf_invalid'])
  })
})
