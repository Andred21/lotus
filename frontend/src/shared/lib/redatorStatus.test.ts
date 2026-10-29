import { describe, expect, it } from 'vitest'
import type { RedatorData, RedatorDocumentData } from '@shared/types/generated'
import { COMPLIANCE_DOC_TYPES, DOC_TYPES, idoneidade } from './redatorStatus'

function doc(type: string, validUntil: string | null = null): RedatorDocumentData {
  return {
    id: 1, type, original_name: `${type}.pdf`, mime: null, size: 1,
    valid_until: validUntil, created_at: null, download_url: 'https://x/y',
  }
}

function redator(documents: RedatorDocumentData[], courseIds = [1]): RedatorData {
  return {
    id: 1, name: 'R', rut: '1-9', email: 'r@x.cl', phone: null, is_active: true,
    course_ids: courseIds, documents, photo_url: null, last_login: null,
  }
}

describe('idoneidade', () => {
  it('redator só com FIRMA e com cursos é no_idoneo', () => {
    expect(idoneidade(redator([doc('FIRMA')]))).toBe('no_idoneo')
  })

  it('FIRMA sem validade não muda a idoneidade de quem tem os documentos', () => {
    const base = [doc('CV'), doc('REUF', '2999-01-01')]
    expect(idoneidade(redator(base))).toBe('idoneo')
    expect(idoneidade(redator([...base, doc('FIRMA')]))).toBe('idoneo')
  })

  it('documento de compliance vencido continua tornando no_idoneo, com FIRMA ao lado', () => {
    expect(idoneidade(redator([doc('REUF', '2000-01-01'), doc('FIRMA')]))).toBe('no_idoneo')
  })
})

describe('tipos de documento', () => {
  it('a FIRMA fica fora do compliance e dentro do vocabulário completo', () => {
    expect(COMPLIANCE_DOC_TYPES).toEqual(['CV', 'REUF', 'TITULO', 'POSTGRADO'])
    expect(DOC_TYPES).toEqual(['CV', 'REUF', 'TITULO', 'POSTGRADO', 'FIRMA'])
  })
})
