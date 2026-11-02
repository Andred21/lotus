/** O arquivo mais recente: maior `created_at`, desempate pelo maior `id`
 * (dois envios no mesmo instante). A cotação mostra um slot só (bloco 47). */
export function latestFile<T extends { created_at?: string | null; id: number }>(
  files: T[],
): T | undefined {
  return files.reduce<T | undefined>((best, f) => {
    if (!best) return f
    const a = f.created_at ?? ''
    const b = best.created_at ?? ''
    return a > b || (a === b && f.id > best.id) ? f : best
  }, undefined)
}
