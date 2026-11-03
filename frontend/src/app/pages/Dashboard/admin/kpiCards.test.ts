import { describe, expect, it } from 'vitest'
import { kpiCards } from './kpiCards'
import type { AdminKpisData, DashboardVisibilityData } from '@shared/types/generated'

const cheio: AdminKpisData = {
  turmas_em_andamento: 4,
  turmas_encerrando_em_breve: 1,
  turmas_atrasadas: 0,
  conclusoes_por_confirmar: 2,
  cotacoes: { pending_count: 3, pending_value_uf: '450.0000' },
  certificados_a_emitir: 5,
}

const tudoVisivel: DashboardVisibilityData = { operation: true, commercial: true, certification: true, identity: true }

describe('kpiCards', () => {
  // A chave é a chave i18n COMPLETA, não um sufixo montado dentro do render.
  // Ver a nota "A chave i18n do KPI" no Step 5 — vira a Emenda 3 da spec.
  it('os 6 KPIs viram 6 cards, na ordem do contrato', () => {
    expect(kpiCards(cheio, tudoVisivel).map((c) => c.key)).toEqual([
      'dashboard.kpi.turmasEmAndamento',
      'dashboard.kpi.turmasEncerrandoEmBreve',
      'dashboard.kpi.turmasAtrasadas',
      'dashboard.kpi.conclusoesPorConfirmar',
      'dashboard.kpi.cotacoesPendentes',
      'dashboard.kpi.certificadosAEmitir',
    ])
  })

  // A decisão é do gate (D8), não do campo: o gate fechado não vira card, e o
  // `null` que o backend manda junto só estreita o tipo. Zero no lugar de "não
  // posso ler" seria a mentira (D6 do B1).
  it('gate fechado não vira card', () => {
    const k: AdminKpisData = {
      ...cheio,
      turmas_em_andamento: null,
      turmas_encerrando_em_breve: null,
      turmas_atrasadas: null,
      conclusoes_por_confirmar: null,
      cotacoes: null,
    }
    const cards = kpiCards(k, { ...tudoVisivel, operation: false, commercial: false })
    expect(cards.map((c) => c.key)).toEqual(['dashboard.kpi.certificadosAEmitir'])
  })

  // Quem decide é o gate: mesmo com o campo preenchido, módulo fechado não
  // desenha card. Sem este caso, o teste passaria também com a regra antiga de
  // farejar `null`.
  it('a decisão é do gate, não do campo: campo preenchido com módulo fechado não vira card', () => {
    const cards = kpiCards(cheio, { ...tudoVisivel, operation: false, commercial: false, certification: false })
    expect(cards).toEqual([])
  })

  it('operação visível e tudo zero: os quatro cards de turma aparecem com 0', () => {
    const zerado: AdminKpisData = {
      ...cheio,
      turmas_em_andamento: 0,
      turmas_encerrando_em_breve: 0,
      turmas_atrasadas: 0,
      conclusoes_por_confirmar: 0,
    }
    const cards = kpiCards(zerado, tudoVisivel).filter((c) => c.key !== 'dashboard.kpi.cotacoesPendentes' && c.key !== 'dashboard.kpi.certificadosAEmitir')
    expect(cards.map((c) => [c.key, c.value])).toEqual([
      ['dashboard.kpi.turmasEmAndamento', '0'],
      ['dashboard.kpi.turmasEncerrandoEmBreve', '0'],
      ['dashboard.kpi.turmasAtrasadas', '0'],
      ['dashboard.kpi.conclusoesPorConfirmar', '0'],
    ])
  })

  // ZERO não é null: o KPI de turmas atrasadas vale 0 no seed, e sumi-lo
  // esconderia a informação mais tranquilizadora da tela.
  it('zero vira card — só o gate fechado some', () => {
    expect(kpiCards(cheio, tudoVisivel).find((c) => c.key === 'dashboard.kpi.turmasAtrasadas')?.value).toBe('0')
  })

  it('a cotação leva o valor em UF como grandeza secundária do mesmo card', () => {
    const cotacoes = kpiCards(cheio, tudoVisivel).find((c) => c.key === 'dashboard.kpi.cotacoesPendentes')
    expect(cotacoes?.value).toBe('3')
    expect(cotacoes?.hint).toEqual({ i18nKey: 'dashboard.kpi.cotacoesValor', value: '450' })
  })

  // O contrato tem 6 chaves e a derivação é medida por `Object.values` no hook.
  // Se o backend ganhar um KPI e esta lista não, o teste cai aqui em vez de a
  // tela esconder o campo novo em silêncio.
  it('a derivação cobre todas as chaves do contrato', () => {
    expect(kpiCards(cheio, tudoVisivel)).toHaveLength(Object.keys(cheio).length)
  })
})
