import type { CSSProperties } from 'react'

/**
 * Vocabulário de largura de coluna, em PESO — e a repartição do orçamento da
 * tabela entre os pesos declarados.
 *
 * **Peso, e não porcentagem literal, porque a mesma classe de conteúdo aparece
 * em tabela de 3 e de 8 colunas.** Um RUT é um RUT nas duas; o que muda é a
 * fatia que ele merece do que sobra. Porcentagem literal só fecharia numa
 * aridade — em qualquer outra, ou sobra faixa para o navegador sortear (o
 * defeito que este bloco corrige) ou a soma estoura.
 *
 * Os números não são chute: são os que a `TurmasTable` pagou em três medições,
 * registradas no `turmaColumns.ts`, generalizados pela classe de conteúdo.
 *
 * **Orçamento = 100 menos o que não está em porcentagem.** A coluna de ações
 * fica em `rem` de propósito (`stickyActionsColumn`) — é a única que não deve
 * escalar, porque carrega ícone e não texto —, e o rastreio de arquivados tem
 * par fixo aqui embaixo. Os dois saem do orçamento em vez de estourarem os 100%
 * e deixarem a repartição por conta da normalização do navegador.
 *
 * **Normalizar mata a sobra na origem.** A soma é sempre o orçamento, em
 * qualquer aridade: não há resto a sortear.
 */
export type ColClass = { readonly peso: number; readonly teto?: true }

export const COL = {
  /** Identificador atômico, mono, que não quebra: `Scap 1 - Cot 2`, código de certificado. */
  code: { peso: 8 },
  /** `IdentityCell`: avatar + duas linhas. Único com teto — é contra ele que o `truncate` mede. */
  identity: { peso: 18, teto: true },
  /** O texto livre e mais longo da tabela: nome de curso, nome de papel. */
  text: { peso: 21 },
  /** Texto curto e de tamanho conhecido: comuna, nome técnico, papel do usuário. */
  short: { peso: 13 },
  /** Mono de tamanho conhecido. */
  rut: { peso: 9 },
  /** `AppTag` — quem manda é a mais longa das três traduções. */
  tag: { peso: 10 },
  /** Numeral. */
  count: { peso: 7 },
  /** Data sem hora. */
  date: { peso: 10 },
  /** Data com hora (`last_login`). */
  dateTime: { peso: 12 },
  /** Valor + unidade. */
  money: { peso: 10 },
} as const satisfies Record<string, ColClass>

/**
 * O par do rastreio de arquivados, em porcentagem fixa e não em peso: o
 * conteúdo é o mesmo nas 7 tabelas que o mostram — uma data e um nome —, e
 * medir sete vezes o mesmo dado seria desproporcional. Somam os 24 que
 * `tableWidths({ archived: true })` desconta.
 */
export const ARCHIVED_COLUMN = {
  archived_at: { width: '10%' },
  archived_by: { width: '14%' },
} as const satisfies Record<string, CSSProperties>

const RESERVA_ACAO = 10
const RESERVA_ARQUIVADO = 24

export type OrcamentoOpcoes = {
  /** `false` na tabela sem coluna de ação: os 10% reservados a ela viram faixa
   * sem dono, e faixa sem dono é o sorteio do `table-layout: auto` de volta. */
  acao?: boolean
  /** `true` na visão de arquivados, que acrescenta as duas colunas de `ARCHIVED_COLUMN`. */
  archived?: boolean
}

export function tableWidths<K extends string>(
  pesos: Record<K, ColClass>,
  { acao = true, archived = false }: OrcamentoOpcoes = {},
): Record<K, CSSProperties> {
  const chaves = Object.keys(pesos) as K[]
  const orcamento = 100 - (acao ? RESERVA_ACAO : 0) - (archived ? RESERVA_ARQUIVADO : 0)
  const total = chaves.reduce((acumulado, chave) => acumulado + pesos[chave].peso, 0)
  // Contas em centésimos inteiros: somar float de duas casas não fecha o
  // orçamento exato, e a última chave absorve a sobra do arredondamento —
  // no máximo 0,01 ponto por coluna.
  const centesimos = chaves.map((chave) => Math.round((pesos[chave].peso / total) * orcamento * 100))
  centesimos[centesimos.length - 1] += orcamento * 100 - centesimos.reduce((a, b) => a + b, 0)

  const larguras = {} as Record<K, CSSProperties>
  chaves.forEach((chave, indice) => {
    const largura = `${centesimos[indice] / 100}%`
    larguras[chave] = pesos[chave].teto ? { width: largura, maxWidth: largura } : { width: largura }
  })
  return larguras
}
