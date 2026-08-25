import { COL, tableWidths } from '@shared/ui'

/**
 * Largura das duas tabelas do painel administrativo do Dashboard.
 *
 * `{ acao: false }` nas duas: são visões, não superfícies de trabalho — a ação
 * mora no módulo de destino, atrás do link da primeira coluna. Sem o `acao:
 * false` o orçamento reservaria 10% a uma coluna inexistente e a faixa voltaria
 * a ser repartida pelo navegador.
 *
 * Na conformidade, `missing` é `text` e não `count`: a célula imprime a LISTA de
 * tipos de documento traduzida (`turmaDocumentTypeList`), não a quantidade — é o
 * campo mais longo da tabela junto com o nome do curso. E `range` é `dateTime`
 * porque a célula carrega DUAS datas com `whitespace-nowrap` (UI-10 de
 * 2026-08-17: comprimida, a coluna quebrava uma data em quatro linhas). Sendo
 * `nowrap`, o `min-content` dela é alto e pode vencer a preferência em tela
 * estreita — é o risco R1 da spec, e a medição do Passo 6 o registra.
 */
export const LARGURA_COMPLIANCE = tableWidths(
  {
    course: COL.text,
    redatores: COL.short,
    range: COL.dateTime,
    present: COL.count,
    missing: COL.text,
    enabled: COL.tag,
  },
  { acao: false },
)

/**
 * `name` é o `text` desta tabela: a célula imprime o nome do relator dentro de um
 * `Link`, e os outros quatro campos são contadores.
 */
export const LARGURA_CARGA_RELATOR = tableWidths(
  {
    name: COL.text,
    current: COL.count,
    upcoming: COL.count,
    expired: COL.count,
    expiring: COL.count,
  },
  { acao: false },
)
