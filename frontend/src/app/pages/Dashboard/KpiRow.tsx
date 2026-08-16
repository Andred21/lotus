import { useTranslation } from 'react-i18next'
import { AppCard } from '@shared/ui'
import type { AppCardTone } from '@shared/ui'
import { formatUf } from '@shared/lib'
import type { AdminKpisData } from '@shared/types/generated'

type Kpi = {
  /** Sufixo da chave `dashboard.kpi.*`. */
  key: string
  value: string
  /** Segunda linha: a chave de rótulo e o valor já formatado. Hoje só as
   * cotações têm (o valor em UF). Nasceu como `string` nunca preenchido, com o
   * JSX decidindo a linha por `key === 'cotacoesPendentes'` — a derivação
   * escapava do módulo puro por uma comparação de string (Q-1, review de
   * 2026-08-16). */
  hint?: { i18nKey: string; value: string }
  tone: AppCardTone
}

/**
 * Campo `null` NÃO vira card (D6). Nada de zero no lugar do que não pode ser
 * lido — essa é a lei do bloco A, e o backend passou a mandar `null` justamente
 * para a tela não ter como mentir — e nada de rótulo "sem acesso", que poluiria
 * a tela de quem nunca terá o módulo. É o mesmo padrão que o Sidebar já aplica
 * ao filtrar item por permissão.
 *
 * Derivação pura, no módulo e não no corpo do componente: o componente fica
 * declarativo, do mesmo jeito que o lint exige nos componentes de feature
 * (ADR-05) e que aqui vale por disciplina — o seletor não alcança `app/`.
 */
function cards(k: AdminKpisData): Kpi[] {
  const lista: Kpi[] = []

  if (k.turmas_em_andamento !== null) {
    lista.push({ key: 'turmasEmAndamento', value: String(k.turmas_em_andamento), tone: 'info' })
  }
  if (k.turmas_encerrando_em_breve !== null) {
    lista.push({ key: 'turmasEncerrandoEmBreve', value: String(k.turmas_encerrando_em_breve), tone: 'warning' })
  }
  if (k.turmas_atrasadas !== null) {
    lista.push({ key: 'turmasAtrasadas', value: String(k.turmas_atrasadas), tone: 'danger' })
  }
  if (k.conclusoes_por_confirmar !== null) {
    lista.push({ key: 'conclusoesPorConfirmar', value: String(k.conclusoes_por_confirmar), tone: 'warning' })
  }
  if (k.cotacoes !== null) {
    lista.push({
      key: 'cotacoesPendentes',
      value: String(k.cotacoes.pending_count),
      hint: { i18nKey: 'dashboard.kpi.cotacoesValor', value: formatUf(k.cotacoes.pending_value_uf) },
      tone: 'neutral',
    })
  }
  if (k.certificados_a_emitir !== null) {
    lista.push({ key: 'certificadosAEmitir', value: String(k.certificados_a_emitir), tone: 'info' })
  }

  return lista
}

export function KpiRow({ kpis }: { kpis: AdminKpisData }) {
  const { t } = useTranslation()
  const lista = cards(kpis)

  if (lista.length === 0) return null

  return (
    // Fileira única a partir de `xl`: travada em 3 colunas, a grade gastava
    // 372px de altura com seis números e empurrava as duas listas 231px para
    // fora da primeira tela em 1440x900 (UI-05 da revisão de 2026-08-16).
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {lista.map((kpi) => (
        <AppCard key={kpi.key} variant="stat" tone={kpi.tone}>
          <p className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>
            {t(`dashboard.kpi.${kpi.key}`)}
          </p>
          <p className="font-display text-3xl font-semibold tabular-nums">{kpi.value}</p>
          {kpi.hint && (
            <p className="text-xs" style={{ color: 'var(--text-color-secondary)' }}>
              {t(kpi.hint.i18nKey, { value: kpi.hint.value })}
            </p>
          )}
        </AppCard>
      ))}
    </div>
  )
}
