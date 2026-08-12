// O `tsc -b` type-checa os testes (não há `globals` no vitest, por decisão do
// projeto), então o import de `.mjs` precisa de declaração.
export const CELESTE: string
export const AZUL_POSTE: string
/** Degrau 700 da rampa: celeste como PRIMEIRO PLANO no tema claro (achado 3). */
export const TINTA_CLARA: string
export const AZUIS_LIGHT: readonly string[]
export const AZUIS_DARK: readonly string[]
/** Descendentes que herdam o fundo primário — a guarda da D-P10 itera esta lista. */
export const HERDEIROS: readonly string[]
export const LIGHT_MAP: Record<string, string>
export const DARK_MAP: Record<string, string>
/** `tinta` só no claro — no escuro o celeste de primeiro plano mede 6,76:1. */
export function transform(css: string, map: Record<string, string>, tinta?: string): string
