import { COL, tableWidths } from '@shared/ui'

/**
 * Classificação das colunas da `TurmasTable`. A política é da TELA, que conhece
 * o dado: o wrapper de tabela não sabe qual coluna carrega identificador e qual
 * carrega nome próprio.
 *
 * **Porcentagem, e não `rem`, porque o problema nunca foi o tamanho de uma
 * coluna — foi para onde vai a SOBRA.** Três medições, nesta mesma tabela, para
 * chegar aqui:
 *
 * 1. **Sem largura nenhuma** (UI-02 da revisão de 2026-08-22, 1440x900): a
 *    largura vinha 100% do conteúdo e saía o inverso da importância. CÓDIGO
 *    ficava com 67px de `th` em inglês e `Scap 1 - Cot 2` quebrava em QUATRO
 *    caixas de linha dentro de um `span` de 34px. CLIENTE (249px) e REDATOR
 *    (263px) somavam 45% dos 1147px da tabela, porque o bloco de texto do
 *    `IdentityCell` não encolhia (ver o `min-w-0` de lá; sem ele, teto de
 *    largura aqui não faz efeito nenhum).
 * 2. **Largura em `rem` em quatro colunas só** (reporte do João, 2026-08-24): as
 *    três que ficaram de fora abocanharam a sobra inteira, ~230px cada num
 *    contêiner de 1447px, enquanto CURSO quebrava em duas linhas dentro de
 *    173px.
 * 3. **Largura em `rem` em TODAS, com CURSO absorvendo** (mesmo dia): a sobra
 *    parou de ser sorteada e passou a ser entregue a um só — CURSO foi a
 *    **519px num contêiner de 1603px**, metade daquilo vazio, enquanto CLIENTE
 *    seguia truncando em 222px. Trocar o sorteio por um destinatário fixo não
 *    resolve: nenhuma coluna desta tabela quer 500px.
 *
 * Os números que saíam daqui à mão (8/21/18/8/18/7/10, e o docblock antigo dizia
 * somar 91 quando somavam 90) viraram classes do vocabulário de `shared`, que
 * normaliza a soma para o orçamento em vez de confiar em aritmética escrita à
 * mão. Ver `AppDataTable/columnWidth.ts` para o porquê do orçamento.
 *
 * A coluna de ações NÃO está aqui: fica em `rem`, via `stickyActionsColumn`, no
 * próprio `TurmasTable` — é a única que não deve escalar, porque carrega dois
 * ícones e não texto.
 */
export const turmaWidths = (archived: boolean) =>
  tableWidths(
    {
      code: COL.code,
      course: COL.text,
      client: COL.identity,
      modality: COL.tag,
      redator: COL.identity,
      students: COL.count,
      status: COL.tag,
    },
    { archived },
  )
