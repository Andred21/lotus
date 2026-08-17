import { describe, it, expect } from 'vitest'
import { formatDate, formatTime, formatDateTime, formatIsoDate } from './datetime'

describe('formatDateTime', () => {
  const d = new Date(2026, 7, 12, 14, 32)

  it('compõe data e hora do idioma ativo, nesta ordem', () => {
    expect(formatDateTime(d)).toBe(`${formatDate(d)} ${formatTime(d)}`)
  })

  it('inclui a hora — não é formatDate disfarçado', () => {
    expect(formatDateTime(d)).not.toBe(formatDate(d))
    expect(formatDateTime(d)).toContain(formatTime(d))
  })

  it('preserva a data de um horário de meia-noite', () => {
    const meiaNoite = new Date(2026, 7, 12, 0, 0)
    expect(formatDateTime(meiaNoite)).toContain(formatDate(meiaNoite))
  })

  it('formata ISO vindo do backend sem perder o dia', () => {
    const doBackend = new Date('2026-08-12T14:32:00.000Z')
    expect(formatDateTime(doBackend)).toBe(`${formatDate(doBackend)} ${formatTime(doBackend)}`)
  })
})

/** A regra que estas asserções guardam vivia copiada em cinco componentes, e
 * uma cópia que perdesse a âncora mostraria o dia ANTERIOR sem erro nenhum —
 * em início/fim de turma e em vencimento de documento (Q-3 da revisão de
 * 2026-08-17). Agora ela tem um dono só, e é aqui que ela se prova. */
describe('formatIsoDate', () => {
  // Comparar com a `Date` montada por componentes LOCAIS é o que torna a
  // asserção independente do fuso da máquina que roda o teste: a data ISO do
  // backend tem de cair no mesmo dia do calendário local em qualquer um deles.
  it('mantém o dia do calendário local da data ISO', () => {
    expect(formatIsoDate('2026-03-01')).toBe(formatDate(new Date(2026, 2, 1)))
    expect(formatIsoDate('2026-12-31')).toBe(formatDate(new Date(2026, 11, 31)))
  })

  it('não é `new Date(iso)` cru — a âncora é o que separa os dois', () => {
    // `new Date('2026-03-01')` é meia-noite UTC. Num fuso a oeste (offset
    // positivo) isso é 28/02 local, e é exatamente o dia que a âncora salva.
    const semAncora = new Date('2026-03-01')
    const aOeste = semAncora.getTimezoneOffset() > 0

    expect(formatIsoDate('2026-03-01') === formatDate(semAncora)).toBe(!aOeste)
  })
})
