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
/** Borda de controle (D-68, A-1): slate-500 — 4,76:1 no claro, 3,07:1 sobre o card do escuro. */
export const CINZA_BORDA: string
/** Os seletores de controle, a mesma lista nos dois temas; hairline estrutural fica de fora. */
export const SELETORES_DE_CONTROLE: string[]
/** Receita do botão filled de uma severidade no claro (P-74): chaves de `fundo` e `anel` são hex de STOCK. */
export interface SeveridadeClara {
  hue: string
  fundo: Record<string, string>
  tintaLara: string
  tinta: string
  anel: Record<string, string>
}
export const SEVERIDADES_CLARAS: Record<'success' | 'info' | 'danger' | 'help', SeveridadeClara>
/** `tinta` só no claro — no escuro o celeste de primeiro plano mede 6,76:1. */
export function transform(css: string, map: Record<string, string>, tinta?: string): string
