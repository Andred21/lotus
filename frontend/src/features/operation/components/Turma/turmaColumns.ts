import type { CSSProperties } from 'react'

/**
 * Largura das colunas da `TurmasTable`. A política é da TELA, que conhece o
 * dado: o wrapper de tabela não sabe qual coluna carrega identificador e qual
 * carrega nome próprio.
 *
 * Sem ela, a largura vinha 100% do conteúdo, e o resultado medido em 1440x900
 * (UI-02 da revisão de 2026-08-22) foi o inverso da importância dos dados:
 *
 * - CÓDIGO ficava com 67px de `th` em inglês — `CODE` é o rótulo mais curto dos
 *   três idiomas —, e `Scap 1 - Cot 2` quebrava em QUATRO caixas de linha dentro
 *   de um `span` de 34px. As 7 linhas iam a 105px de altura; em espanhol, com
 *   `CÓDIGO` alargando a coluna para 82px, caíam para 85px. O identificador pelo
 *   qual o operador procura a turma era o dado menos legível da tela, e a quebra
 *   inflava a tabela inteira em ~20px por linha.
 * - CLIENTE (249px) e REDATOR (263px) somavam 512px — 45% dos 1147px da tabela —
 *   porque o bloco de texto do `IdentityCell` não encolhia (ver o `min-w-0` de
 *   lá; sem ele, teto de largura aqui não faria efeito nenhum).
 *
 * Vai em `style`, e não em classe do Tailwind, porque no PrimeReact 10.9.8 o
 * `className` genérico da coluna chega só ao `<td>` (`datatable.cjs.js:1742`) e
 * a largura precisa valer também para o `<th>`, que é quem sustenta a coluna.
 *
 * `maxWidth` acompanha `width` nas duas colunas de identidade porque é o teto
 * que o `truncate` do `IdentityCell` precisa ter contra o que medir. As demais
 * colunas (modalidade, alunos, estado, rastreio) ficam sem declaração: são tag e
 * numeral, já estreitos por natureza.
 */
export const TURMA_COLUMN: Record<'code' | 'course' | 'identity', CSSProperties> = {
  // Identificador atômico: acompanha `whitespace-nowrap` no sítio, porque
  // quebrar `Scap 1 - Cot 2` no meio é o defeito, não a largura em si.
  code: { width: '7rem' },
  course: { width: '11rem' },
  identity: { width: '13rem', maxWidth: '13rem' },
}
