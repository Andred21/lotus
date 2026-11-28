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
 * O marcador é um segmento SVG que repete o `strokeDasharray` da linha (vem no
 * `payload` do item, é a prop que o `AppLineChart` pôs na `Line`): sem isso a
 * legenda mostraria tracejados que o marcador não explica.
 *
 * `role="list"`: o mini-reset da P-46 zera `list-style` em todo `ul` e o
 * WebKit tira a semântica junto; a régua de lint só alcança JSX nosso, e a
 * legenda do Recharts era a lista de terceiro que ficava de fora (P-63).
 */
/** `''` (série contínua) vira ausência do atributo. */
const tracoDoItem = (item: LegendPayload): string | undefined => {
  const traco = (item.payload as { strokeDasharray?: string | number } | undefined)?.strokeDasharray
  return traco ? String(traco) : undefined
}

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
          <svg aria-hidden="true" width="22" height="4" viewBox="0 0 22 4" className="shrink-0">
            <line
              x1="0"
              y1="2"
              x2="22"
              y2="2"
              stroke={item.color}
              strokeWidth="2"
              strokeDasharray={tracoDoItem(item)}
            />
          </svg>
          {item.value}
        </li>
      ))}
    </ul>
  )
}
