export type ChartPoint = { x: string; y: number }

export type ChartSeries = {
  /** Chave de dado no gráfico. Precisa ser estável e única entre as séries do
   * MESMO gráfico — é ela que amarra a linha ao ponto depois do pivot. */
  key: string
  /** Rótulo já traduzido. O wrapper não conhece i18n. */
  label: string
  points: ChartPoint[]
}

/**
 * Lista de séries -> lista de linhas, uma por valor de `x`, com uma chave por
 * série. É o formato que o Recharts consome, e a única lógica de verdade dos
 * wrappers — por isso mora fora do componente e é o que se testa.
 *
 * O backend preenche a janela inteira com zero (D-2 do bloco 66): mês sem
 * registro chega como `0`, então a linha desenha o vale. Série que o chamador
 * não pode ver chega nula e SOME do gráfico pela D7 — desenhar 0 ali afirmaria
 * "aconteceu nada" onde a verdade é "não se sabe". Aqui o pivot não inventa
 * ponto: se a chave de uma série falta numa linha, o Recharts pula o ponto.
 *
 * A ordenação é do `x` como string: o backend manda `YYYY-MM`
 * (`AnalyticsQuery::month()`), formato em que a ordem lexicográfica É a
 * cronológica. Ordenar por data exigiria parse e traria fuso para dentro de um
 * módulo que não tem nada com isso.
 */
export function pivot(series: ChartSeries[]): Record<string, string | number>[] {
  const porX = new Map<string, Record<string, string | number>>()

  for (const serie of series) {
    for (const ponto of serie.points) {
      const linha = porX.get(ponto.x) ?? { x: ponto.x }
      linha[serie.key] = ponto.y
      porX.set(ponto.x, linha)
    }
  }

  return [...porX.values()].sort((a, b) => String(a.x).localeCompare(String(b.x)))
}
