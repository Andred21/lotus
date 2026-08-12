// O `tsc -b` type-checa os testes (não há `globals` no vitest, por decisão do
// projeto), então o import de `.mjs` precisa de declaração.
export const ORIGEM: string
export const DESTINO: string
/** Recorta o símbolo celeste do wordmark e devolve o PNG do glifo. */
export function gerarGlifo(pngOrigem: Buffer): Buffer
