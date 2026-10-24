import { describe, expect, it } from 'vitest'
import type { EnrollmentData } from '@shared/types/generated'
import { finalGradeOf, formatAttendance, formatGrade } from './enrollmentResult'

const comGrades = (grades: unknown) => ({ grades }) as EnrollmentData

describe('formatGrade', () => {
  it('lê ponto ou vírgula e formata no locale ativo', () => {
    expect(formatGrade('6.2', 'es-CL')).toBe('6,2')
    expect(formatGrade('6,4', 'pt-BR')).toBe('6,4')
    expect(formatGrade('7', 'en')).toBe('7.0')
  })

  it('texto não numérico sai como veio', () => {
    expect(formatGrade('aprobado con distinción', 'es-CL')).toBe('aprobado con distinción')
  })
})

describe('formatAttendance', () => {
  it('formata o percentual no locale ativo, sem zeros sobrando', () => {
    expect(formatAttendance('87.50', 'es-CL')).toBe('87,5 %')
    expect(formatAttendance('100.00', 'en')).toBe('100 %')
  })
})

describe('finalGradeOf', () => {
  it('sem nota final devolve null', () => {
    expect(finalGradeOf(comGrades(null))).toBeNull()
    expect(finalGradeOf(comGrades({}))).toBeNull()
    expect(finalGradeOf(comGrades({ final: '' }))).toBeNull()
  })

  it('devolve a nota como texto', () => {
    expect(finalGradeOf(comGrades({ final: 6.2 }))).toBe('6.2')
    expect(finalGradeOf(comGrades({ final: '6,4' }))).toBe('6,4')
  })
})
