import { useTranslation } from 'react-i18next'
import { AppCard, StatValue, sectionLabelClass } from '@shared/ui'
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
 * Colunas por QUANTIDADE de cards. Uma grade fixa de 6 servia à fileira do
 * admin e sobrava nas duas do Redator: 4 cards deixavam 384px (34%) vazios à
 * direita em 1440 e viravam 3 + 1, com um órfão, em 1024; os 2 do histórico
 * gastavam duas colunas de seis (UI-06 da revisão de 2026-08-17).
 *
 * Classes LITERAIS numa tabela, não string montada em runtime: o scanner do
 * Tailwind v4 lê o código-fonte, e `xl:grid-cols-${n}` não existiria no CSS
 * gerado. A fileira única a partir de `xl` continua sendo a razão de o admin
 * chegar a 6 — travada em 3, a grade gastava 372px de altura com seis números e
 * empurrava as duas listas 231px para fora da primeira tela (UI-05 da revisão de
 * 2026-08-16).
 */
const COLUNAS: Record<number, string> = {
  1: '',
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-2 lg:grid-cols-3',
  4: 'sm:grid-cols-2 lg:grid-cols-4',
  5: 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
  6: 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6',
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

  // Acima de 6 a fileira volta ao molde do admin: mais que isso não existe hoje,
  // e inventar coluna para um caso inexistente é grade especulativa.
  const colunas = COLUNAS[items.length] ?? COLUNAS[6]

  return (
    <div className={`grid gap-4 ${colunas}`}>
      {items.map((kpi) => (
        // `flex flex-col` no card e `sm:flex-1` no corpo: a grade já estica cada
        // card até a altura do mais alto da fileira, e é isto que transmite essa
        // altura ao conteúdo sem depender de porcentagem resolvida contra um
        // `height: auto`.
        <AppCard key={kpi.key} variant="stat" tone={kpi.tone} className="flex flex-col">
          {/* Duas arrumações, um markup só. Abaixo de `sm` o card ocupa a
            * largura inteira e vira LINHA — rótulo à esquerda, número à
            * direita, na mesma base —, que é o que traz as duas listas de volta
            * para perto do topo em 390px. De `sm` para cima a coluna é estreita,
            * o card empilha e ocupa a ALTURA INTEIRA da fileira, que é o que
            * ancora o número na base. */}
          <div className="flex items-baseline justify-between gap-4 sm:flex-1 sm:flex-col sm:items-stretch sm:gap-0">
            {/* `min-w-0` para o rótulo longo quebrar DENTRO da própria caixa em
              * vez de empurrar o número para a linha de baixo: envolvido, o
              * número perdia o `justify-between` e voltava para a esquerda, e a
              * fileira do mobile ficava com quatro números à direita e dois à
              * esquerda. */}
            <p className={`min-w-0 ${sectionLabelClass}`} style={{ color: 'var(--text-color-secondary)' }}>
              {t(kpi.key)}
            </p>
            {/* O `justify-between` do corpo é o que põe todos os números na
              * MESMA base: dois filhos numa coluna que a grade já esticou até a
              * altura do card mais alto da fileira — rótulo no topo, número no
              * pé, independente de quantas linhas o rótulo ocupe. O piso de duas
              * linhas no rótulo (`min-h-8`) resolvia só até duas: com um rótulo
              * de três — "Clases con documentación pendiente" — o número caía
              * 16px abaixo dos três vizinhos (UI-06 da revisão de 2026-08-17).
              *
              * O afastamento vem de `pt`, não de `mt-*`, por DESENHO de layout:
              * `justify-between` distribui os dois filhos na altura da coluna, e
              * padding no filho de baixo não briga com essa distribuição — margem
              * brigaria.
              *
              * Este comentário dizia outra coisa até 2026-08-27: que `mt-*` era
              * IMPOSSÍVEL, porque o `[&_p]:m-0` do `AppCard` casava `<p>` por
              * elemento (0,1,1) e vencia a classe (0,1,0). Aquela classe não
              * existe mais — o mini-reset da P-46 a substituiu — e o substituto
              * mora em `@layer base`, que PERDE para `utilities`: hoje um `mt-*`
              * ganharia. Comentário invertido custa mais que comentário ausente,
              * porque manda contornar restrição que já não existe (Q-3 do review
              * de 2026-08-27). */}
            <p className="flex shrink-0 items-baseline gap-2 sm:justify-between sm:pt-2">
              <StatValue size="page">{kpi.value}</StatValue>
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
