import type { LegendPayload } from 'recharts'

/**
 * Conteúdo próprio da legenda. O default do Recharts pinta o texto com a cor
 * da série, e a rampa de tokens de série foi calibrada para TRAÇO (3:1), não
 * para texto de 12px: no claro as cinco ficavam entre 3,41 e 4,47:1 (f2 UI-09,
 * run de 2026-08-28). Aqui o texto sai na tinta secundária e o marcador carrega
 * a série. A cor do marcador vem do `payload` — é o `stroke` que o
 * `AppLineChart` já resolve por índice em `chartInks`; este arquivo não nomeia
 * token nenhum (D11, `tests/chart-tokens.test.ts` é quem guarda isso).
 *
 * `role="list"`: o mini-reset da P-46 zera `list-style` em todo `ul` e o
 * WebKit tira a semântica junto; a régua de lint só alcança JSX nosso, e a
 * legenda do Recharts era a lista de terceiro que ficava de fora (P-63).
 */
export function ChartLegend({ payload }: { payload?: ReadonlyArray<LegendPayload> }) {
  if (!payload?.length) return null
  return (
    <ul
      role="list"
      className="flex flex-wrap justify-center gap-x-4 gap-y-1 pt-2 text-xs"
      style={{ color: 'var(--text-color-secondary)' }}
    >
      {payload.map((item) => (
        <li key={String(item.value)} className="flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block h-0.5 w-3.5 rounded-full" style={{ background: item.color }} />
          {item.value}
        </li>
      ))}
    </ul>
  )
}
