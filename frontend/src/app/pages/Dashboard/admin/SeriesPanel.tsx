import { useTranslation } from 'react-i18next'
import { AppCard, AppCardHeader, AppEmptyState, AppLineChart } from '@shared/ui'
import type { ChartSeries } from '@shared/ui'
import { formatMonthYear, formatUf } from '@shared/lib'
import type { SeriesData } from '@shared/types/generated'

/** As 4 séries de CONTAGEM, na ordem do ciclo: a turma começa, termina, o aluno
 * se matricula e o certificado sai.
 *
 * `as const` e não `(keyof SeriesData)[]`: tipada pela chave inteira, o
 * elemento alarga para `MonthlyCountData[] | MonthlyAmountData[] | null` e o
 * `.map` sobre a união de dois tipos de array não é chamável. Com as 4 chaves
 * literais, `series[chave]` é `MonthlyCountData[] | null` — um tipo só, e
 * `p.count` existe sem guarda. Guarda que nunca dispara é ramo órfão, e o
 * review do B1 matou três. */
const CONTAGENS = ['turmas_iniciadas', 'turmas_concluidas', 'matriculas', 'certificados_emitidos'] as const

/** `YYYY-MM` -> "ago 2026". O backend projeta o mês em `Y-m`
 * (`AnalyticsQuery.php:230`); `formatMonthYear` ancora ao meio-dia para o fuso
 * a oeste não devolver o mês anterior. */
const mes = (x: string) => formatMonthYear(`${x}-01`)

/**
 * As 5 séries mensais. Série nula SOME — do gráfico e da legenda (D7): o
 * backend manda `null` no que o papel não pode ler, e desenhar uma linha em
 * zero afirmaria "não aconteceu nada" onde a verdade é "não se pode saber".
 * Mesmo molde da D6 do B1: uma tela, uma gramática de ausência.
 *
 * Dois gráficos porque são duas UNIDADES: as quatro contagens são inteiros e
 * dividem o eixo; `uf_aprovada` é decimal em UF, e no mesmo eixo uma das duas
 * escalas achata a outra contra a linha de base.
 *
 * A UF nunca passa por `Number` no VALOR exibido — `formatUf` corta zeros e
 * troca o separador sobre a string do backend. No eixo do gráfico ela precisa
 * ser número (é geometria), e é a única conversão: o rótulo do tooltip e do
 * eixo volta pelo formatador.
 */
export function SeriesPanel({ series }: { series: SeriesData }) {
  const { t } = useTranslation()

  const contagens: ChartSeries[] = CONTAGENS.flatMap((chave) => {
    const pontos = series[chave]
    if (pontos === null) return []
    return [
      {
        key: chave,
        label: t(`dashboard.series.${chave}`),
        points: pontos.map((p) => ({ x: p.month, y: p.count })),
      },
    ]
  })

  const uf: ChartSeries[] =
    series.uf_aprovada === null
      ? []
      : [
          {
            key: 'uf_aprovada',
            label: t('dashboard.series.uf_aprovada'),
            points: series.uf_aprovada.map((p) => ({ x: p.month, y: Number(p.total_uf) })),
          },
        ]

  // Todas as 5 fechadas por gate: a seção inteira some, sem card vazio (D7).
  if (contagens.length === 0 && uf.length === 0) return null

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {contagens.length > 0 && (
        <AppCard>
          <AppCardHeader title={t('dashboard.series.countsTitle')} />
          {contagens.every((s) => s.points.length === 0) ? (
            <AppEmptyState icon="pi pi-chart-line" title={t('dashboard.series.empty')} />
          ) : (
            <div className="px-2 pb-2">
              <AppLineChart series={contagens} ariaLabel={t('dashboard.series.countsTitle')} formatX={mes} />
            </div>
          )}
        </AppCard>
      )}

      {uf.length > 0 && (
        <AppCard>
          <AppCardHeader title={t('dashboard.series.ufTitle')} />
          {uf[0].points.length === 0 ? (
            <AppEmptyState icon="pi pi-chart-line" title={t('dashboard.series.empty')} />
          ) : (
            <div className="px-2 pb-2">
              <AppLineChart
                series={uf}
                ariaLabel={t('dashboard.series.ufTitle')}
                inkOffset={4}
                formatX={mes}
                formatY={(v) => formatUf(v.toFixed(4))}
              />
            </div>
          )}
        </AppCard>
      )}
    </div>
  )
}
