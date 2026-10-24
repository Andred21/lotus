import { describe, expect, it } from 'vitest'
import type { ApprovalRuleData } from '@shared/types/generated'
import { parseAttendance, parseGrade, suggestedStatus } from './approvalRule'

const RULE: ApprovalRuleData = { min_grade: 4, min_attendance_pct: 70 }

describe('suggestedStatus', () => {
  it.each([
    ['4,0', '70', 'aprobado'],
    ['3,9', '100', 'reprobado'],
    ['7', '69.9', 'reprobado'],
    [' 6,4 ', '80', 'aprobado'],
    ['6.4', '80', 'aprobado'],
  ])('nota %j e presença %j sugerem %s', (grade, attendance, expected) => {
    expect(suggestedStatus(grade, attendance, RULE)).toBe(expected)
  })

  it.each([
    ['', '80'],
    ['6', ''],
    ['bueno', '80'],
    ['35', '80'],
    ['0', '80'],
    ['6', '101'],
  ])('nota %j e presença %j não sugerem nada', (grade, attendance) => {
    expect(suggestedStatus(grade, attendance, RULE)).toBeNull()
  })

  it('sem regra não sugere nada', () => {
    expect(suggestedStatus('6', '80', undefined)).toBeNull()
  })
})

describe('parseGrade / parseAttendance', () => {
  it('lê vírgula, ponto e espaços; recusa fora da escala', () => {
    expect(parseGrade(' 6,4 ')).toBe(6.4)
    expect(parseGrade('1')).toBe(1)
    expect(parseGrade('7')).toBe(7)
    expect(parseGrade('7,1')).toBeNull()
    expect(parseGrade('0,9')).toBeNull()
    expect(parseAttendance('0')).toBe(0)
    expect(parseAttendance('100')).toBe(100)
    expect(parseAttendance('100,1')).toBeNull()
    expect(parseAttendance('-5')).toBeNull()
  })
})
