/** Formata um valor em UF para exibição, SEM passar por float: o backend manda
 * decimal(12,4) como string ("450.0000") e converter para Number reintroduziria
 * o erro de representação que o decimal existe para evitar. Só corta zeros à
 * direita e troca o ponto pela vírgula (es-CL). */
export function formatUf(value: string): string {
  const [int, frac = ''] = value.split('.')
  const trimmed = frac.replace(/0+$/, '')
  return trimmed ? `${int},${trimmed}` : int
}
