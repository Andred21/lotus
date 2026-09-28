import { afterAll, describe, expect, it } from 'vitest'
import i18n from '@shared/config/i18n'
import { formatDate, formatTime, formatDateTime, formatIsoDate } from './datetime'

/**
 * O `hourCycle` de `formatTime` é explícito por decisão de produto, não
 * default do `Intl`: o CLDR do ICU 78 (Node 22) e do Chromium 152 passou a
 * resolver `es-CL` para `h12` (era `h23`) sem nenhuma troca de código — o
 * relógio do cabeçalho passaria a mostrar "02:05 p. m." em vez de "14:05".
 * O produto quer 24h em es-CL e pt-BR, e mantém 12h com AM/PM em en.
 */
const idiomaOriginal = i18n.language

afterAll(async () => {
  await i18n.changeLanguage(idiomaOriginal)
})

describe('formatTime', () => {
  const QUANDO = new Date(2026, 7, 11, 14, 5)

  it('força 24h em es-CL e pt-BR, mantém 12h com AM/PM em en', async () => {
    await i18n.changeLanguage('es-CL')
    expect(formatTime(QUANDO)).toBe('14:05')

    await i18n.changeLanguage('pt-BR')
    expect(formatTime(QUANDO)).toBe('14:05')

    await i18n.changeLanguage('en')
    expect(formatTime(QUANDO)).toMatch(/^02:05\sPM$/)
  })
})

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
