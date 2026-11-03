import { formatUf } from '@shared/lib'
import type { AdminKpisData, DashboardVisibilityData } from '@shared/types/generated'
import type { Kpi } from '../KpiRow'
import { secoesVisiveis } from './secoes'

/**
 * O gate fechado NÃO vira card (D6 do B1, D8 do bloco 54). Nada de zero no
 * lugar do que não pode ser lido — essa é a lei do bloco A — e nada de rótulo
 * "sem acesso", que poluiria a tela de quem nunca terá o módulo. É o mesmo
 * padrão que o Sidebar já aplica ao filtrar item por permissão.
 *
 * Quem decide é a visibilidade (`v`), que o backend manda explícita; o `null`
 * do campo só estreita o tipo dentro do ramo já decidido. Por isso zero com o
 * gate aberto é card: "não há turma atrasada" é a informação mais
 * tranquilizadora da tela.
 *
 * Saiu do `KpiRow` porque o segundo consumidor chegou: o render já era genérico
 * sobre `Kpi[]` e só esta derivação era do admin, então o Redator escreve a
 * dele em `redator/resumoCards.ts` e ninguém abstrai nada de especulativo
 * (D13, lição 3).
 *
 * A chave é a chave i18n COMPLETA. O `KpiRow` montava `dashboard.kpi.${key}`
 * dentro do render, e com o segundo consumidor esse prefixo implícito quebra:
 * as chaves do Redator vivem em `dashboard.redator.kpi.*`. É a mesma correção
 * que o Q-1 do review de 2026-08-16 já fez neste arquivo — derivação não
 * escapa do módulo puro para dentro do JSX (Emenda 3 da spec).
 */
export function kpiCards(k: AdminKpisData, v: DashboardVisibilityData): Kpi[] {
  const secoes = secoesVisiveis(v)
  const lista: Kpi[] = []

  if (secoes.turmas && k.turmas_em_andamento !== null) {
    lista.push({ key: 'dashboard.kpi.turmasEmAndamento', value: String(k.turmas_em_andamento), tone: 'info' })
  }
  if (secoes.turmas && k.turmas_encerrando_em_breve !== null) {
    lista.push({
      key: 'dashboard.kpi.turmasEncerrandoEmBreve',
      value: String(k.turmas_encerrando_em_breve),
      tone: 'warning',
    })
  }
  if (secoes.turmas && k.turmas_atrasadas !== null) {
    lista.push({ key: 'dashboard.kpi.turmasAtrasadas', value: String(k.turmas_atrasadas), tone: 'danger' })
  }
  if (secoes.turmas && k.conclusoes_por_confirmar !== null) {
    lista.push({
      key: 'dashboard.kpi.conclusoesPorConfirmar',
      value: String(k.conclusoes_por_confirmar),
      tone: 'warning',
    })
  }
  if (secoes.cotacoes && k.cotacoes !== null) {
    lista.push({
      key: 'dashboard.kpi.cotacoesPendentes',
      value: String(k.cotacoes.pending_count),
      hint: { i18nKey: 'dashboard.kpi.cotacoesValor', value: formatUf(k.cotacoes.pending_value_uf) },
      tone: 'neutral',
    })
  }
  if (secoes.certificadosAEmitir && k.certificados_a_emitir !== null) {
    lista.push({ key: 'dashboard.kpi.certificadosAEmitir', value: String(k.certificados_a_emitir), tone: 'info' })
  }

  return lista
}
