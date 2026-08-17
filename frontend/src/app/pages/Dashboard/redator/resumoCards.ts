import type { RedatorHistoricoData, RedatorResumoData } from '@shared/types/generated'
import type { Kpi } from '../KpiRow'

/**
 * Os 4 contadores do "o que tenho agora" do Redator.
 *
 * Sem nenhum `if` de nulidade, ao contrário do `admin/kpiCards.ts`: as 4 chaves
 * de `RedatorResumoData` são NÃO-anuláveis (`generated.ts:433-438`) — não há
 * gate a esconder porque o payload já é o dele. É a mesma razão estrutural pela
 * qual o Redator não tem estado `unauthorized`.
 *
 * Tom só onde há severidade: pendência documental e documento vencendo pedem
 * ação; "tenho 2 turmas em curso" não é aviso de nada.
 */
export function resumoCards(r: RedatorResumoData): Kpi[] {
  return [
    { key: 'dashboard.redator.kpi.turmasEmAndamento', value: String(r.turmas_em_andamento), tone: 'info' },
    { key: 'dashboard.redator.kpi.proximasTurmas', value: String(r.proximas_turmas), tone: 'neutral' },
    { key: 'dashboard.redator.kpi.pendenciasDocumentais', value: String(r.pendencias_documentais), tone: 'warning' },
    { key: 'dashboard.redator.kpi.documentosVencendo', value: String(r.documentos_vencendo), tone: 'warning' },
  ]
}

/**
 * Os 2 contadores do "o que já fiz". Instância SEPARADA de `KpiRow`, e não seis
 * cards numa fileira só: resumo e histórico respondem perguntas diferentes, e o
 * Drive as separa. Neutros os dois — histórico não tem urgência.
 */
export function historicoCards(h: RedatorHistoricoData): Kpi[] {
  return [
    { key: 'dashboard.redator.kpi.turmasConcluidas', value: String(h.turmas_concluidas), tone: 'neutral' },
    { key: 'dashboard.redator.kpi.certificadosEmitidos', value: String(h.certificados_emitidos), tone: 'neutral' },
  ]
}
