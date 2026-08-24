import type { CSSProperties } from 'react'

/**
 * Largura das colunas da `TurmasTable`, em PORCENTAGEM. A política é da TELA,
 * que conhece o dado: o wrapper de tabela não sabe qual coluna carrega
 * identificador e qual carrega nome próprio.
 *
 * **Porcentagem, e não `rem`, porque o problema nunca foi o tamanho de uma
 * coluna — foi para onde vai a SOBRA.** Numa tabela de largura fixa em `rem`
 * dentro de um contêiner elástico, o navegador precisa repartir a diferença, e
 * com `table-layout: auto` ela vai inteira para quem não declarou. Em
 * porcentagem não há sobra a repartir: toda coluna cresce e encolhe na mesma
 * proporção, e o `min-content` continua protegendo a tela estreita — coluna que
 * não couber empurra a tabela e o invólucro rola, que é o comportamento que a
 * spec D20 pede.
 *
 * Três medições, na mesma tabela, para chegar aqui:
 *
 * 1. **Sem largura nenhuma** (UI-02 da revisão de 2026-08-22, 1440x900): a
 *    largura vinha 100% do conteúdo e saía o inverso da importância. CÓDIGO
 *    ficava com 67px de `th` em inglês e `Scap 1 - Cot 2` quebrava em QUATRO
 *    caixas de linha dentro de um `span` de 34px — as 7 linhas iam a 105px de
 *    altura. CLIENTE (249px) e REDATOR (263px) somavam 45% dos 1147px da tabela,
 *    porque o bloco de texto do `IdentityCell` não encolhia (ver o `min-w-0` de
 *    lá; sem ele, teto de largura aqui não faz efeito nenhum).
 * 2. **Largura em `rem` em quatro colunas só** (reporte do João, 2026-08-24): as
 *    três que ficaram de fora — MODALIDADE, ALUNOS e ESTADO — abocanharam a
 *    sobra inteira, ~230px cada num contêiner de 1447px, quase metade da tabela
 *    para duas tags e um numeral, enquanto CURSO quebrava em duas linhas dentro
 *    de 173px e os dois `IdentityCell` truncavam.
 * 3. **Largura em `rem` em TODAS as colunas, com CURSO absorvendo** (segundo
 *    reporte do João, mesmo dia): a sobra parou de ser sorteada e passou a ser
 *    entregue a um só — CURSO foi a **519px** num contêiner de 1603px, com
 *    metade daquilo vazio ao lado de "Mantenimiento de subestaciones", enquanto
 *    CLIENTE seguia truncando "Subestación Nort…" em 222px. Trocar o sorteio por
 *    um destinatário fixo não resolve: nenhuma coluna desta tabela quer 500px.
 *
 * Os números abaixo somam **91%**; os 9% restantes são a coluna de ações, que
 * fica em `rem` de propósito — é a única que não deve escalar, porque carrega
 * dois ícones e não texto (a largura dela vem junto do `sticky` que a prende à
 * direita, em `stickyActionsColumn`).
 *
 * `maxWidth` acompanha `width` nas duas colunas de identidade porque é o teto
 * que o `truncate` do `IdentityCell` precisa ter contra o que medir.
 *
 * Vai em `style`, e não em classe do Tailwind, porque no PrimeReact 10.9.8 o
 * `className` genérico da coluna chega só ao `<td>` (`datatable.cjs.js:1742`) e
 * a largura precisa valer também para o `<th>`, que é quem sustenta a coluna.
 *
 * As duas colunas do rastreio de arquivados não estão aqui: são de `shared/ui`,
 * servem 8 tabelas, e dar largura a elas é decisão de quem padronizar as tabelas
 * do sistema (item 17 do backlog).
 */
type TurmaColumnKey = 'code' | 'course' | 'identity' | 'modality' | 'students' | 'status'

export const TURMA_COLUMN: Record<TurmaColumnKey, CSSProperties> = {
  // Identificador atômico: acompanha `whitespace-nowrap` no sítio, porque
  // quebrar `Scap 1 - Cot 2` no meio é o defeito, não a largura em si. É ele
  // quem mais depende do `min-content` na tela estreita.
  code: { width: '8%' },
  // O texto mais longo da tabela, e o único livre — a maior fatia é dele.
  course: { width: '21%' },
  // Avatar + duas linhas: o teto existe para o `truncate` acontecer, e a fatia
  // é a que faz "Subestación Norte" caber inteiro em 1440 e acima.
  identity: { width: '18%', maxWidth: '18%' },
  modality: { width: '8%' },
  students: { width: '7%' },
  // A tag mais longa das três — "En curso" / "In progress" / "Habilitada".
  status: { width: '10%' },
}
