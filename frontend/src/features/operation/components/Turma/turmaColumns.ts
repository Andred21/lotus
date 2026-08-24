import type { CSSProperties } from 'react'

/**
 * Largura das colunas da `TurmasTable`. A política é da TELA, que conhece o
 * dado: o wrapper de tabela não sabe qual coluna carrega identificador e qual
 * carrega nome próprio.
 *
 * **A regra é: toda coluna declara largura, MENOS a que absorve a sobra.** Com
 * `table-layout: auto`, o espaço que sobra depois das larguras declaradas se
 * reparte entre as colunas que NÃO declararam — e a repartição não pergunta o
 * que a coluna carrega. Declarar só algumas é entregar a sobra por sorteio.
 *
 * Duas medições, na mesma tabela, dizendo a mesma coisa por caminhos opostos:
 *
 * 1. **Sem largura nenhuma** (UI-02 da revisão de 2026-08-22, 1440x900): a
 *    largura vinha 100% do conteúdo e saía o inverso da importância. CÓDIGO
 *    ficava com 67px de `th` em inglês e `Scap 1 - Cot 2` quebrava em QUATRO
 *    caixas de linha dentro de um `span` de 34px — as 7 linhas iam a 105px de
 *    altura. CLIENTE (249px) e REDATOR (263px) somavam 45% dos 1147px da tabela,
 *    porque o bloco de texto do `IdentityCell` não encolhia (ver o `min-w-0` de
 *    lá; sem ele, teto de largura aqui não faria efeito nenhum).
 * 2. **Com largura em quatro colunas só** (reporte do João, 2026-08-24: a tabela
 *    "parecendo comprimida"): as três que ficaram de fora — MODALIDADE, ALUNOS e
 *    ESTADO — abocanharam a sobra inteira, ~230px cada num contêiner de 1447px,
 *    quase metade da tabela para duas tags e um numeral. No mesmo quadro, CURSO
 *    quebrava em duas linhas dentro de 173px e os dois `IdentityCell`
 *    truncavam ("Subestación No…"). A sobra tinha ido para quem não precisava
 *    dela.
 *
 * Quem absorve é **CURSO**, e por ser o único texto livre e variável da tabela:
 * ele ganha `minWidth` e nenhuma `width`. As colunas de tag e numeral ganham a
 * largura do RÓTULO no idioma mais longo (es-CL, referência do cliente), que é o
 * que sustenta a coluna — o conteúdo delas é sempre mais curto que o cabeçalho.
 *
 * Os dois `IdentityCell` continuam com teto (13rem → 14rem): a decisão de 2026-08-22
 * de capá-los segue de pé, o que muda é o número. `maxWidth` acompanha `width`
 * neles porque é o teto que o `truncate` precisa ter contra o que medir.
 *
 * Vai em `style`, e não em classe do Tailwind, porque no PrimeReact 10.9.8 o
 * `className` genérico da coluna chega só ao `<td>` (`datatable.cjs.js:1742`) e
 * a largura precisa valer também para o `<th>`, que é quem sustenta a coluna.
 *
 * A coluna de ações não está aqui: a largura dela vem junto do `sticky` que a
 * prende à direita, em `stickyActionsColumn`. As duas colunas do rastreio de
 * arquivados também não — são de `shared/ui`, servem 8 tabelas, e dar largura a
 * elas é decisão de quem padronizar as tabelas do sistema (item 17 do backlog).
 */
type TurmaColumnKey = 'code' | 'course' | 'identity' | 'modality' | 'students' | 'status'

export const TURMA_COLUMN: Record<TurmaColumnKey, CSSProperties> = {
  // Identificador atômico: acompanha `whitespace-nowrap` no sítio, porque
  // quebrar `Scap 1 - Cot 2` no meio é o defeito, não a largura em si.
  code: { width: '7rem' },
  // A que ABSORVE: sem `width`, com piso para não colapsar quando a tabela rola.
  course: { minWidth: '13rem' },
  identity: { width: '14rem', maxWidth: '14rem' },
  // Tag "Presencial"/"In person" cabe folgada; quem dita é o `th` "MODALIDAD".
  modality: { width: '8rem' },
  // `th` "ALUMNOS"/"STUDENTS" em versalete espaçado — o numeral nunca passa de
  // três dígitos aqui.
  students: { width: '7rem' },
  // Tag mais longa das três: "En curso" / "In progress" / "Habilitada".
  status: { width: '8rem' },
}
