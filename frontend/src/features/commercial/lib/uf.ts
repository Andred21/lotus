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
 * dígitos e UM ponto decimal, como string. A UI mostra UF em formato chileno
 * (vírgula), então aceita vírgula OU ponto como separador — mas só o
 * PRIMEIRO separador digitado sobrevive; qualquer caractere depois disso que
 * não seja dígito (inclusive um segundo separador) é descartado. Nunca passa
 * por Number()/parseFloat(): a troca de caractere aqui é textual, não
 * aritmética — é exatamente o texto que evita o erro de representação de
 * ponto flutuante que o decimal(12,4) do backend existe para prevenir. */
export function parseUfInput(raw: string): string {
  let seenSeparator = false
  let result = ''
  for (const char of raw) {
    if (char >= '0' && char <= '9') {
      result += char
    } else if ((char === '.' || char === ',') && !seenSeparator) {
      result += '.'
      seenSeparator = true
    }
  }
  return result
}
