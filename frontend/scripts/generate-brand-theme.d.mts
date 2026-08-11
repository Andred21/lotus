// O `tsc -b` type-checa os testes (não há `globals` no vitest, por decisão do
// projeto), então o import de `.mjs` precisa de declaração.
export const CELESTE: string
export const AZUL_POSTE: string
export const AZUIS_LIGHT: readonly string[]
export const AZUIS_DARK: readonly string[]
export const LIGHT_MAP: Record<string, string>
export const DARK_MAP: Record<string, string>
export function transform(css: string, map: Record<string, string>): string
