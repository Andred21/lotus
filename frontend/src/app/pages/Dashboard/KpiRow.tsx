import { useTranslation } from 'react-i18next'
import { AppCard } from '@shared/ui'
import type { AppCardTone } from '@shared/ui'

export type Kpi = {
  /** Chave i18n COMPLETA — `dashboard.kpi.*` no admin, `dashboard.redator.kpi.*`
   * no Redator. Completa e não sufixo: com dois consumidores, um prefixo
   * montado dentro do render põe metade da chave no módulo puro e metade no
   * JSX (Emenda 3). Serve também de `key` do React: é única por card. */
  key: string
  value: string
  /** Grandeza secundária do mesmo card, já formatada. Hoje só as cotações têm
   * (o valor em UF). Nasceu como `string` nunca preenchido, com o JSX decidindo
   * a linha por `key === 'cotacoesPendentes'` — a derivação escapava do módulo
   * puro por uma comparação de string (Q-1, review de 2026-08-16). */
  hint?: { i18nKey: string; value: string }
  tone: AppCardTone
}

/**
 * Fileira de contadores. Genérico sobre `Kpi[]` desde o B1 — só a DERIVAÇÃO era
 * do admin, e ela saiu para `admin/kpiCards.ts` quando o segundo consumidor
 * chegou (D13). O Redator monta duas instâncias, resumo e histórico, cada uma
 * com sua faixa de seção.
 */
export function KpiRow({ items }: { items: Kpi[] }) {
  const { t } = useTranslation()

  if (items.length === 0) return null

  return (
    // Fileira única a partir de `xl`: travada em 3 colunas, a grade gastava
    // 372px de altura com seis números e empurrava as duas listas 231px para
    // fora da primeira tela em 1440x900 (UI-05 da revisão de 2026-08-16).
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {items.map((kpi) => (
        <AppCard key={kpi.key} variant="stat" tone={kpi.tone}>
          {/* Duas arrumações, um markup só. Abaixo de `sm` o card ocupa a
            * largura inteira e vira LINHA — rótulo à esquerda, número à
            * direita, na mesma base —, que é o que traz as duas listas de volta
            * para perto do topo em 390px. De `sm` para cima a coluna é estreita
            * e o card empilha. */}
          <div className="flex items-baseline justify-between gap-4 sm:block">
            {/* `min-h-8` = duas linhas de `text-xs`. É o que põe os seis números
              * na MESMA base: sem o piso, o número nasce logo abaixo de um
              * rótulo de altura variável e a fileira ficava em dois patamares,
              * 81px e 101px, conforme a locale quebrasse o rótulo (UI-03 do
              * review de 2026-08-17). Piso, não altura fixa — rótulo de três
              * linhas ainda cresce, e cresce para todos. */}
            {/* `min-w-0` para o rótulo longo quebrar DENTRO da própria caixa em
              * vez de empurrar o número para a linha de baixo: envolvido, o
              * número perdia o `justify-between` e voltava para a esquerda, e a
              * fileira do mobile ficava com quatro números à direita e dois à
              * esquerda. */}
            <p
              className="min-w-0 text-xs font-semibold tracking-wider uppercase sm:min-h-8"
              style={{ color: 'var(--text-color-secondary)' }}
            >
              {t(kpi.key)}
            </p>
            <p className="flex shrink-0 items-baseline gap-2 sm:mt-1 sm:justify-between">
              <span className="font-display text-3xl leading-none font-semibold tabular-nums">{kpi.value}</span>
              {/* Grandeza secundária na MESMA linha do número, nunca numa
                * terceira: como linha própria, o único card que a tinha definia
                * a altura da grade e os outros cinco herdavam ~95px de vazio.
                * Aqui ela é o algarismo com unidade ao lado do algarismo
                * principal — mono, que é o papel de dado técnico da spec §5. */}
              {kpi.hint && (
                <span className="font-mono text-xs tabular-nums" style={{ color: 'var(--text-color-secondary)' }}>
                  {t(kpi.hint.i18nKey, { value: kpi.hint.value })}
                </span>
              )}
            </p>
          </div>
        </AppCard>
      ))}
    </div>
  )
}
