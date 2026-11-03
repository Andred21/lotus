import type { DashboardVisibilityData } from '@shared/types/generated'

/** Quais seções do admin aparecem, uma flag por seção. */
export type SecoesAdmin = {
  turmas: boolean
  cotacoes: boolean
  certificadosAEmitir: boolean
  agenda: boolean
  compliance: boolean
  pipeline: boolean
  redatores: boolean
  series: boolean
  rankings: boolean
  ufMetrica: boolean
}

/**
 * Da visibilidade por módulo (D8) à visibilidade por seção — o ÚNICO lugar que
 * combina as flags. `AdminView`, `kpiCards`, `SeriesPanel` e `RankingsPanel`
 * leem o resultado; nenhum deles decide por conta própria nem fareja `null`.
 *
 * A regra espelha o `AdminDashboardAssembler`: seção que lê de dois módulos
 * exige os dois (funil e rankings = operação e certificação; carga de
 * relatores = identidade e operação), e só as séries degradam módulo a módulo —
 * a seção abre se QUALQUER módulo dela abre, e cada série decide pelo próprio.
 * A identidade sozinha não abre seção nenhuma: ela só governa alertas de
 * documento de relator, que vêm na lista de alertas.
 *
 * O `null` que o backend manda no dado proibido segue existindo e segue sendo
 * o que impede o vazamento; aqui ele deixa de ser o critério de exibição.
 */
export function secoesVisiveis(v: DashboardVisibilityData): SecoesAdmin {
  return {
    turmas: v.operation,
    cotacoes: v.commercial,
    certificadosAEmitir: v.certification,
    agenda: v.operation,
    compliance: v.operation,
    pipeline: v.operation && v.certification,
    redatores: v.identity && v.operation,
    series: v.operation || v.commercial || v.certification,
    rankings: v.operation && v.certification,
    ufMetrica: v.commercial,
  }
}
