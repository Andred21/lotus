import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { chartInks } from '../../styles/tokens'
import { pivot } from './pivot'
import type { ChartSeries } from './pivot'

export type AppLineChartProps = {
  series: ChartSeries[]
  /** Rótulo acessível do gráfico inteiro. Obrigatório: SVG sem nome é uma
   * mancha para leitor de tela, e o `<title>` do Recharts não cobre o container. */
  ariaLabel: string
  height?: number
  /** Índice inicial em `chartInks`. Existe para dois gráficos IRMÃOS na mesma
   * tela não abrirem os dois no mesmo tom. O call-site passa índice, nunca
   * cor (D11). */
  inkOffset?: number
  formatX?: (x: string) => string
  formatY?: (y: number) => string
}

/**
 * Gráfico de linha. SVG, e é o motivo da escolha (D1): o `stroke` recebe a
 * `var()` do token de série e quem a resolve é o próprio CSS, então a troca de
 * tema — que acontece trocando o `href` de um `<link>`, sem re-render React
 * (`primeTheme.ts:15`) — repinta o traço sozinha. Em canvas a cor é lida em JS
 * e congela até alguém forçar redraw.
 *
 * O docblock não escreve o nome do token de propósito: a catraca da D11
 * (`tests/chart-tokens.test.ts`) é varredura por substring e não distingue
 * prosa de call-site — citar o token aqui a derrubaria.
 *
 * Toda a cor sai de `chartInks` por índice: este arquivo e o irmão de barra são
 * os únicos componentes que a consomem, e nenhum call-site nomeia token (D11).
 * Cor de eixo, grade e tooltip vêm das vars do tema pelo mesmo motivo.
 */
export function AppLineChart({
  series,
  ariaLabel,
  height = 260,
  inkOffset = 0,
  formatX,
  formatY,
}: AppLineChartProps) {
  const linhas = pivot(series)

  return (
    <div role="img" aria-label={ariaLabel} style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={linhas} margin={{ top: 8, right: 16, bottom: 0, left: -8 }}>
          <CartesianGrid stroke="var(--surface-border)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="x"
            tickFormatter={formatX}
            tick={{ fill: 'var(--text-color-secondary)', fontSize: 12 }}
            stroke="var(--surface-border)"
          />
          <YAxis
            tickFormatter={formatY}
            allowDecimals={false}
            tick={{ fill: 'var(--text-color-secondary)', fontSize: 12 }}
            stroke="var(--surface-border)"
          />
          <Tooltip
            // O `value` do formatter é `ValueType | undefined` no Recharts 3.x
            // (`DefaultTooltipContent.d.ts:8-10`), não `number`: o eixo aceita
            // string e array. Sem o estreitamento o `tsc -b` reprova, e é o
            // build que pegou isso — o peer da dependência não diz nada sobre
            // a forma da prop.
            formatter={(valor) => (formatY && typeof valor === 'number' ? formatY(valor) : valor)}
            contentStyle={{
              background: 'var(--surface-card)',
              border: '1px solid var(--surface-border)',
              borderRadius: '6px',
              color: 'var(--text-color)',
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-color-secondary)' }} />
          {series.map((serie, i) => (
            <Line
              key={serie.key}
              type="monotone"
              dataKey={serie.key}
              name={serie.label}
              stroke={chartInks[(inkOffset + i) % chartInks.length]}
              strokeWidth={2}
              dot={false}
              // Buraco no meio da série não vira zero — o pivot omite a chave e
              // esta prop faz o Recharts pular o ponto em vez de fechá-lo em 0.
              connectNulls={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
