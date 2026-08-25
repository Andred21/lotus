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
 * **Normalizar mata a sobra na origem.** A soma do que se DECLARA é sempre o
 * orçamento, em qualquer aridade: não há resto a sortear.
 *
 * **Mas o que se declara é RAZÃO, não pixel.** `ACTIONS_RESERVE` são 10 pontos
 * fixos e a coluna de ação mede em `rem`; quando os dois não coincidem, o
 * navegador reescala as porcentagens sobre os pixels que sobram — preservando
 * com exatidão as razões entre as colunas de dado, e só elas. Medido: a
 * `HistorialTable`, com ação de `16rem` (256px = 22,9% a 1440x900), entrega
 * 18,0% na coluna que declara 21,04%. Quem acrescentar tabela declara proporção,
 * não largura final. As leituras estão na §4 de
 * `docs/superpowers/audits/2026-08-24-tabelas-coluna-de-acoes-e-largura-medicoes.md`.
 *
 * **Léxico:** a infraestrutura fala inglês (`weight`, `cap`, `actions`), como o
 * resto de `shared/ui`; português fica para o vocabulário de domínio, que é o do
 * backend (`.claude/rules/frontend-fsliced.md`). Os consumidores exportam sempre
 * `<entidade>Widths`, sempre função — o sítio nunca precisa adivinhar a forma.
 */
export type ColClass = { readonly weight: number; readonly cap?: true }

export const COL = {
  /** Identificador atômico, mono, que não quebra: `Scap 1 - Cot 2`, código de certificado. */
  code: { weight: 8 },
  /** `IdentityCell`: avatar + duas linhas. Único com teto — é contra ele que o `truncate` mede. */
  identity: { weight: 18, cap: true },
  /** O texto livre e mais longo da tabela: nome de curso, nome de papel. */
  text: { weight: 21 },
  /** Texto curto e de tamanho conhecido: comuna, nome técnico, papel do usuário. */
  short: { weight: 13 },
  /** Mono de tamanho conhecido. */
  rut: { weight: 9 },
  /** `AppTag` — quem manda é a mais longa das três traduções. */
  tag: { weight: 10 },
  /** Numeral. */
  count: { weight: 7 },
  /** Data sem hora. */
  date: { weight: 10 },
  /** Data com hora (`last_login`). */
  dateTime: { weight: 12 },
  /** Valor + unidade. */
  money: { weight: 10 },
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

const ACTIONS_RESERVE = 10
const ARCHIVED_RESERVE = 24

export type TableWidthOptions = {
  /** `false` na tabela sem coluna de ação: os 10% reservados a ela viram faixa
   * sem dono, e faixa sem dono reescala tudo o que sobra — inclusive o par fixo
   * de `ARCHIVED_COLUMN`, que existe para render igual nas 7 arquivadas.
   *
   * **É parâmetro, e não constante, sempre que a coluna PODE sair da tabela** —
   * por permissão ou por estado. Quem só decide na hora do render passa a
   * decisão adiante em vez de congelar o orçamento errado. */
  actions?: boolean
  /** `true` na visão de arquivados, que acrescenta as duas colunas de `ARCHIVED_COLUMN`. */
  archived?: boolean
}

export function tableWidths<K extends string>(
  pesos: Record<K, ColClass>,
  { actions = true, archived = false }: TableWidthOptions = {},
): Record<K, CSSProperties> {
  const chaves = Object.keys(pesos) as K[]
  const orcamento = 100 - (actions ? ACTIONS_RESERVE : 0) - (archived ? ARCHIVED_RESERVE : 0)
  const total = chaves.reduce((acumulado, chave) => acumulado + pesos[chave].weight, 0)
  // Contas em centésimos inteiros: somar float de duas casas não fecha o
  // orçamento exato, e a última chave absorve a sobra do arredondamento —
  // no máximo 0,01 ponto por coluna.
  const centesimos = chaves.map((chave) => Math.round((pesos[chave].weight / total) * orcamento * 100))
  centesimos[centesimos.length - 1] += orcamento * 100 - centesimos.reduce((a, b) => a + b, 0)

  const larguras = {} as Record<K, CSSProperties>
  chaves.forEach((chave, indice) => {
    const largura = `${centesimos[indice] / 100}%`
    larguras[chave] = pesos[chave].cap ? { width: largura, maxWidth: largura } : { width: largura }
  })
  return larguras
}
