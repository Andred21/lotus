import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { chartInks } from '../../styles/tokens'

export type BarDatum = { label: string; value: number }

export type AppBarChartProps = {
  data: BarDatum[]
  ariaLabel: string
  height?: number
  /** Índice em `chartInks`. Índice, nunca cor (D11). */
  inkIndex?: number
  formatValue?: (v: number) => string
}

/**
 * Barra HORIZONTAL (`layout="vertical"` no vocabulário do Recharts: é o eixo
 * de categoria que fica na vertical). Ranking tem rótulo longo — nome de curso
 * e razão social de cliente —, e em barra vertical esse rótulo só cabe girado
 * ou truncado. Deitada, ele ocupa uma faixa de largura fixa e é lido na
 * horizontal como qualquer outro texto da tela.
 *
 * Mesma tese de cor do irmão de linha: tudo por `chartInks` e vars do tema, e
 * o call-site passa índice.
 */
export function AppBarChart({ data, ariaLabel, height = 260, inkIndex = 0, formatValue }: AppBarChartProps) {
  return (
    <div role="img" aria-label={ariaLabel} style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 24, bottom: 0, left: 8 }}>
          <CartesianGrid stroke="var(--surface-border)" strokeDasharray="3 3" horizontal={false} />
          <XAxis
            type="number"
            allowDecimals={false}
            tickFormatter={formatValue}
            tick={{ fill: 'var(--text-color-secondary)', fontSize: 12 }}
            stroke="var(--surface-border)"
          />
          <YAxis
            type="category"
            dataKey="label"
            width={160}
            tick={{ fill: 'var(--text-color-secondary)', fontSize: 12 }}
            stroke="var(--surface-border)"
          />
          <Tooltip
            cursor={{ fill: 'var(--surface-hover)' }}
            // Mesmo estreitamento do irmão de linha: `ValueType | undefined`,
            // não `number` (`DefaultTooltipContent.d.ts:8-10`).
            formatter={(valor) => (formatValue && typeof valor === 'number' ? formatValue(valor) : valor)}
            contentStyle={{
              background: 'var(--surface-card)',
              border: '1px solid var(--surface-border)',
              borderRadius: '6px',
              color: 'var(--text-color)',
            }}
          />
          <Bar dataKey="value" fill={chartInks[inkIndex % chartInks.length]} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
