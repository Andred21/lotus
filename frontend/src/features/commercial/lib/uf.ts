/** Formata um valor em UF para exibição, SEM passar por float: o backend manda
 * decimal(12,4) como string ("450.0000") e converter para Number reintroduziria
 * o erro de representação que o decimal existe para evitar. Só corta zeros à
 * direita e troca o ponto pela vírgula (es-CL). */
export function formatUf(value: string): string {
  const [int, frac = ''] = value.split('.')
  const trimmed = frac.replace(/0+$/, '')
  return trimmed ? `${int},${trimmed}` : int
}

/** Normaliza o que o usuário digita (ou o que o campo pré-preenche em modo
 * edição, via `formatUf`) para o formato canônico que o backend espera:
 * dígitos e UM ponto decimal, como string.
 *
 * O ÚLTIMO separador é o decimal; os anteriores são agrupamento de milhar e
 * caem fora. É a convenção es-CL ("1.250,75" = mil duzentos e cinquenta vírgula
 * setenta e cinco). Tratar o primeiro como decimal e colar o resto dos dígitos
 * transformava "1.250,75" em "1.25075" — um número que o backend ACEITA e grava
 * errado (1,2508 UF), sem 422 nenhum. Valor rejeitado é aceitável; valor
 * silenciosamente errado, não — dinheiro aqui tem peso legal.
 *
 * Nunca passa por Number()/parseFloat(): tudo aqui é troca de caractere, não
 * aritmética — é o que evita o erro de representação de ponto flutuante que o
 * decimal(12,4) do backend existe para prevenir. */
export function parseUfInput(raw: string): string {
  const cleaned = raw.replace(/[^\d.,]/g, '')
  const lastSeparator = Math.max(cleaned.lastIndexOf('.'), cleaned.lastIndexOf(','))
  if (lastSeparator === -1) return cleaned

  const integer = cleaned.slice(0, lastSeparator).replace(/[.,]/g, '')
  const fraction = cleaned.slice(lastSeparator + 1).replace(/[.,]/g, '')
  return `${integer}.${fraction}`
}
