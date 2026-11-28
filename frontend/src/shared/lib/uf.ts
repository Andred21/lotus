// A instância global do i18next, e não `@shared/config/i18n`: importar o módulo de
// init arrasta o efeito colateral (inicialização) para todo consumidor do barrel
// `@shared/lib`. Mesma razão do `primeLocale.ts`.
import i18n from 'i18next'

/** Formata um valor em UF para exibição no idioma ativo (es-CL "12.345,67",
 * en "12,345.67"), SEM passar por float: o backend manda decimal(12,4) como
 * string ("450.0000") e converter para Number reintroduziria o erro de
 * representação que o decimal existe para evitar. O Intl lê a string como
 * decimal exato; zeros à direita somem e o sinal negativo é mantido. */
export function formatUf(value: string, locale: string = i18n.language): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 4 }).format(value as unknown as number)
}

/** Valor para PRÉ-PREENCHER o campo de UF em modo edição: sem agrupamento de
 * milhar, vírgula decimal, zeros à direita cortados. Não é o `formatUf`
 * (exibição, agrupa milhar): `parseUfInput` trata o último separador como
 * decimal e leria "1.234" como 1,234 UF. Sem Intl e sem Number — só troca de
 * caractere. */
export function formatUfField(value: string): string {
  const [int, frac = ''] = value.split('.')
  let trimmed = frac.replace(/0+$/, '')
  // Até três dígitos inteiros e exatamente três casas ("12,345") é a forma que
  // `isAmbiguousUfInput` recusa: o campo não pode pré-preencher o que ele mesmo
  // reprova. A quarta casa volta ("12,3450") e o valor não muda.
  if (trimmed.length === 3 && /^-?[1-9]\d{0,2}$/.test(int)) trimmed += '0'
  return trimmed ? `${int},${trimmed}` : int
}

/** A entrada de UF que nenhuma convenção decide sozinha, e que por isso o campo
 * recusa em qualquer idioma (Q-2 da revisão do bloco 66):
 *
 * - um separador só, com um a três dígitos antes (o primeiro não é zero) e
 *   exatamente três depois ("1,500", "1.500"): mil e quinhentos em inglês ou em
 *   es-CL, conforme o separador, e 1,5 para o `parseUfInput`. "0,125" passa:
 *   milhar não começa com zero;
 * - o separador que seria o decimal aparece mais de uma vez ("1.500.000"):
 *   repetido, ele só pode ser agrupamento de milhar, e o parser o leria como
 *   decimal.
 *
 * O `formatUf` da lista agrupa milhar pelo idioma ativo, e é essa grafia que o
 * usuário copia. Valor rejeitado é aceitável; valor silenciosamente errado,
 * não. Quem quer decimal escreve "1,5"; quem quer mil e quinhentos, "1500". */
export function isAmbiguousUfInput(raw: string): boolean {
  const cleaned = raw.replace(/[^\d.,]/g, '')
  if (/^[1-9]\d{0,2}[.,]\d{3}$/.test(cleaned)) return true

  const last = Math.max(cleaned.lastIndexOf('.'), cleaned.lastIndexOf(','))
  if (last === -1) return false
  const separador = cleaned[last]
  return cleaned.split(separador).length > 2
}

/** Normaliza o que o usuário digita (ou o que o campo pré-preenche em modo
 * edição, via `formatUfField`) para o formato canônico que o backend espera:
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
