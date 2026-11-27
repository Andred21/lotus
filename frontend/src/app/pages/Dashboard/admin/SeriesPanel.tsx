import { useTranslation } from 'react-i18next'
import { AppCard, AppCardHeader, AppEmptyState, AppLineChart } from '@shared/ui'
import type { ChartSeries } from '@shared/ui'
import { formatMonthYear, formatUf } from '@shared/lib'
import type { DashboardVisibilityData, SeriesData } from '@shared/types/generated'

/** As 4 séries de CONTAGEM, em dois cards pelo que cada par conta: Clases
 * (a turma começa e termina) e Alumnos (o aluno se matricula e o certificado
 * sai). Cada série leva o módulo de que ela lê, que é o que decide se aparece
 * (D8); o card some só quando as duas somem.
 *
 * `as const` e não `(keyof SeriesData)[]`: tipada pela chave inteira, o
 * elemento alarga para `MonthlyCountData[] | MonthlyAmountData[] | null` e o
 * `.map` sobre a união de dois tipos de array não é chamável. Com as 4 chaves
 * literais, `series[chave]` é `MonthlyCountData[] | null` — um tipo só, e
 * `p.count` existe sem guarda. Guarda que nunca dispara é ramo órfão, e o
 * review do B1 matou três. */
const GRUPOS = [
  {
    titulo: 'dashboard.series.turmasTitle',
    inkOffset: 0,
    contagens: [
      { chave: 'turmas_iniciadas', modulo: 'operation' },
      { chave: 'turmas_concluidas', modulo: 'operation' },
    ],
  },
  {
    titulo: 'dashboard.series.alumnosTitle',
    inkOffset: 2,
    contagens: [
      { chave: 'matriculas', modulo: 'operation' },
      { chave: 'certificados_emitidos', modulo: 'certification' },
    ],
  },
] as const

/** `YYYY-MM` -> "ago 2026". O backend projeta o mês em `Y-m`
 * (`AnalyticsQuery.php:230`); `formatMonthYear` ancora ao meio-dia para o fuso
 * a oeste não devolver o mês anterior. */
const mes = (x: string) => formatMonthYear(`${x}-01`)

/** O backend manda a janela INTEIRA, com `0` nos meses sem registro (D-2), então
 * "vazio" não é lista sem ponto: é todo ponto da janela em zero. Lista sem ponto
 * também cai aqui, o que é só a mesma leitura num caso que não deve ocorrer. */
const semMovimento = (series: ChartSeries[]) => series.every((s) => s.points.every((p) => p.y === 0))

/**
 * As 5 séries mensais. Série de módulo fechado SOME — do gráfico e da legenda
 * (D7): desenhar uma linha em zero afirmaria "não aconteceu nada" onde a
 * verdade é "não se pode saber". Quem decide é a visibilidade que o backend
 * manda por módulo (D8); o `null` da série só estreita o tipo. Mesmo molde da
 * D6 do B1: uma tela, uma gramática de ausência.
 *
 * Três gráficos: as contagens são inteiros e dividem o eixo, mas `uf_aprovada`
 * é decimal em UF, e no mesmo eixo uma das duas escalas achata a outra contra a
 * linha de base. E as quatro contagens em um gráfico só eram quatro linhas a
 * distinguir; em dois cards são duas.
 *
 * A UF nunca passa por `Number` no VALOR exibido — `formatUf` corta zeros e
 * troca o separador sobre a string do backend. No eixo do gráfico ela precisa
 * ser número (é geometria), e é a única conversão: o rótulo do tooltip e do
 * eixo volta pelo formatador.
 */
export function SeriesPanel({ series, visibility }: { series: SeriesData; visibility: DashboardVisibilityData }) {
  const { t } = useTranslation()

  const cards = GRUPOS.map((g) => ({
    ...g,
    series: g.contagens.flatMap(({ chave, modulo }): ChartSeries[] => {
      const pontos = series[chave]
      if (!visibility[modulo] || pontos === null) return []
      return [
        {
          key: chave,
          label: t(`dashboard.series.${chave}`),
          points: pontos.map((p) => ({ x: p.month, y: p.count })),
        },
      ]
    }),
  })).filter((c) => c.series.length > 0)

  const uf: ChartSeries[] =
    !visibility.commercial || series.uf_aprovada === null
      ? []
      : [
          {
            key: 'uf_aprovada',
            label: t('dashboard.series.uf_aprovada'),
            points: series.uf_aprovada.map((p) => ({ x: p.month, y: Number(p.total_uf) })),
          },
        ]

  // Os três módulos fechados (ou nenhuma série legível): a seção inteira some, sem card vazio (D7).
  if (cards.length === 0 && uf.length === 0) return null

  const mesLabel = t('dashboard.series.month')

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      {cards.map((c) => (
        <AppCard key={c.titulo}>
          <AppCardHeader title={t(c.titulo)} />
          {semMovimento(c.series) ? (
            <AppEmptyState icon="chartLine" title={t('dashboard.series.empty')} />
          ) : (
            <div className="px-2 pb-2">
              <AppLineChart
                series={c.series}
                ariaLabel={t(c.titulo)}
                xLabel={mesLabel}
                inkOffset={c.inkOffset}
                formatX={mes}
              />
            </div>
          )}
        </AppCard>
      ))}

      {uf.length > 0 && (
        <AppCard>
          <AppCardHeader title={t('dashboard.series.ufTitle')} />
          {semMovimento(uf) ? (
            <AppEmptyState icon="chartLine" title={t('dashboard.series.empty')} />
          ) : (
            <div className="px-2 pb-2">
              <AppLineChart
                series={uf}
                ariaLabel={t('dashboard.series.ufTitle')}
                xLabel={mesLabel}
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
