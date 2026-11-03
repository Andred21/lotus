export type ImportRefusals = {
  /** Linha recusada na confirmação, por número da linha na planilha. */
  row: Map<number, string>
  /** Linha cujo Actualizar foi recusado (a linha em si segue valendo). */
  update: Map<number, string>
}

const KEY = /^import\.(\d+)(\.update)?$/

/**
 * Lê o `errors` do 422 da confirmação (`import.<row>` e `import.<row>.update`).
 * Devolve `null` sem nenhuma chave `import.*`: aí o erro é outro e segue o
 * caminho genérico do `useMutationErrors`.
 */
export function parseImportRefusals(errors: Record<string, string[]> | undefined): ImportRefusals | null {
  const refusals: ImportRefusals = { row: new Map(), update: new Map() }
  for (const [key, messages] of Object.entries(errors ?? {})) {
    const match = KEY.exec(key)
    const message = messages[0]
    if (!match || message === undefined) continue
    refusals[match[2] ? 'update' : 'row'].set(Number(match[1]), message)
  }
  return refusals.row.size + refusals.update.size > 0 ? refusals : null
}
