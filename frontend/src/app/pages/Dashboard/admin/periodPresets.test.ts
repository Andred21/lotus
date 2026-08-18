import { describe, expect, it } from 'vitest'
import { periodoDoPreset, periodoPadrao } from './periodPresets'

// Data fixa e injetada, nunca `new Date()` dentro do módulo: preset que lê o
// relógio sozinho não se testa e quebra na virada do mês em produção.
const hoje = new Date(2026, 7, 17) // 17 de agosto de 2026, hora local

describe('periodoDoPreset', () => {
  // O default espelha `DEFAULT_MONTHS = 12` (`DashboardFilterData.php:24`): a
  // primeira carga da tela tem de pedir a MESMA janela que o servidor
  // resolveria sozinho, senão o "Últimos 12 meses" do dropdown mostraria um
  // recorte diferente do que a tela mostrava antes de alguém tocar no filtro.
  it('últimos 12 meses termina hoje e começa 12 meses atrás', () => {
    expect(periodoDoPreset('last12', hoje)).toEqual({ start: '2025-08-17', end: '2026-08-17' })
  })

  it('últimos 6 meses termina hoje e começa 6 meses atrás', () => {
    expect(periodoDoPreset('last6', hoje)).toEqual({ start: '2026-02-17', end: '2026-08-17' })
  })

  it('ano corrente vai de 1º de janeiro até hoje', () => {
    expect(periodoDoPreset('currentYear', hoje)).toEqual({ start: '2026-01-01', end: '2026-08-17' })
  })

  // "Personalizado" não é uma janela: é o modo em que os dois campos mandam.
  it('personalizado não calcula janela nenhuma', () => {
    expect(periodoDoPreset('custom', hoje)).toBeNull()
  })

  // O default da tela não pode divergir do preset que o dropdown mostra
  // selecionado: seriam dois cálculos da mesma janela, e o "Últimos 12 meses"
  // exibiria um recorte diferente do que a tela já mostrava.
  it('a janela padrão é a mesma que o preset de 12 meses calcula', () => {
    expect(periodoPadrao(hoje)).toEqual(periodoDoPreset('last12', hoje))
  })

  // O dia 31 recuando para um mês de 30 não pode virar o dia 1º do mês
  // seguinte, que é o que `setMonth` faz sozinho — a janela ganharia um dia e
  // o rótulo diria "6 meses" sobre outra coisa.
  it('recuar de um dia 31 para um mês curto cai no último dia do mês curto', () => {
    expect(periodoDoPreset('last6', new Date(2026, 7, 31))).toEqual({ start: '2026-02-28', end: '2026-08-31' })
  })

  // ISO pelos componentes LOCAIS, nunca `toISOString()`: em UTC-3/-4 o
  // `toISOString` de uma data à meia-noite local devolve o dia ANTERIOR.
  it('a data sai em ISO local, não em UTC', () => {
    const janeiro = new Date(2026, 0, 1)
    expect(periodoDoPreset('currentYear', janeiro)?.end).toBe('2026-01-01')
  })
})
