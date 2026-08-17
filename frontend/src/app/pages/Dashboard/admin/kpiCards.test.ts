import { describe, expect, it } from 'vitest'
import { kpiCards } from './kpiCards'
import type { AdminKpisData } from '@shared/types/generated'

const cheio: AdminKpisData = {
  turmas_em_andamento: 4,
  turmas_encerrando_em_breve: 1,
  turmas_atrasadas: 0,
  conclusoes_por_confirmar: 2,
  cotacoes: { pending_count: 3, pending_value_uf: '450.0000' },
  certificados_a_emitir: 5,
}

describe('kpiCards', () => {
  // A chave é a chave i18n COMPLETA, não um sufixo montado dentro do render.
  // Ver a nota "A chave i18n do KPI" no Step 5 — vira a Emenda 3 da spec.
  it('os 6 KPIs viram 6 cards, na ordem do contrato', () => {
    expect(kpiCards(cheio).map((c) => c.key)).toEqual([
      'dashboard.kpi.turmasEmAndamento',
      'dashboard.kpi.turmasEncerrandoEmBreve',
      'dashboard.kpi.turmasAtrasadas',
      'dashboard.kpi.conclusoesPorConfirmar',
      'dashboard.kpi.cotacoesPendentes',
      'dashboard.kpi.certificadosAEmitir',
    ])
  })

  // A lei do bloco A: o backend manda `null` justamente para a tela não ter
  // como mentir. Zero no lugar de "não posso ler" seria a mentira (D6 do B1).
  it('campo null não vira card', () => {
    const cards = kpiCards({ ...cheio, turmas_atrasadas: null, cotacoes: null })
    expect(cards.map((c) => c.key)).toEqual([
      'dashboard.kpi.turmasEmAndamento',
      'dashboard.kpi.turmasEncerrandoEmBreve',
      'dashboard.kpi.conclusoesPorConfirmar',
      'dashboard.kpi.certificadosAEmitir',
    ])
  })

  // ZERO não é null: o KPI de turmas atrasadas vale 0 no seed, e sumi-lo
  // esconderia a informação mais tranquilizadora da tela.
  it('zero vira card — só null some', () => {
    expect(kpiCards(cheio).find((c) => c.key === 'dashboard.kpi.turmasAtrasadas')?.value).toBe('0')
  })

  it('a cotação leva o valor em UF como grandeza secundária do mesmo card', () => {
    const cotacoes = kpiCards(cheio).find((c) => c.key === 'dashboard.kpi.cotacoesPendentes')
    expect(cotacoes?.value).toBe('3')
    expect(cotacoes?.hint).toEqual({ i18nKey: 'dashboard.kpi.cotacoesValor', value: '450' })
  })

  // O contrato tem 6 chaves e a derivação é medida por `Object.values` no hook.
  // Se o backend ganhar um KPI e esta lista não, o teste cai aqui em vez de a
  // tela esconder o campo novo em silêncio.
  it('a derivação cobre todas as chaves do contrato', () => {
    expect(kpiCards(cheio)).toHaveLength(Object.keys(cheio).length)
  })
})
