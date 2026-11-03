import { tableWidths } from '@shared/ui'

/**
 * Largura das duas tabelas do painel administrativo do Dashboard.
 *
 * `{ actions: false }` nas duas: são visões, não superfícies de trabalho — a
 * ação mora no módulo de destino, atrás do link da primeira coluna. Sem o
 * `actions: false` o orçamento reservaria 10% a uma coluna inexistente e a faixa
 * voltaria a ser repartida pelo navegador.
 *
 * **Aqui quem manda na largura é o cabeçalho, não a célula** (D-73 do bloco 54,
 * `docs/superpowers/blocos/54-dashboard-agenda-e-pendencias/medicoes-d73.md`).
 * As classes de `COL` medem o conteúdo do corpo; nestas duas tabelas, contadores e
 * tags vivem sob cabeçalhos de uma palavra longa ("Documentos", "Habilitada",
 * "Instructors"), e a fração de `count`/`tag` ficava menor que palavra + padding
 * — o cabeçalho cobria o vizinho e, no último, criava a rolagem. Os pesos abaixo
 * saem do mínimo medido por coluna, o maior das três línguas, com o ícone de
 * ordenação quebrando para baixo (`wrappingHeaderTablePt`).
 */

/**
 * Mínimos medidos a 1024x768 (tabela de 718px), em px: curso 130, relatores 122
 * ("Instructors"), período 105 (uma data inteira), presentes 105, faltan 123,
 * habilitada 107 — soma 692, folga de 26px. Os pesos somam 100 e dão a cada
 * coluna o mínimo dela a 718px; curso e faltan levam a sobra porque são o texto
 * livre da tabela. Abaixo de `sm` a tabela usa o piso de 45rem (720px, ver
 * `CompliancePanel`), então 390x844 repete a geometria de 1024.
 *
 * `range` não é mais `nowrap` inteiro: cada data é, e o intervalo quebra entre
 * elas — o mínimo dele é UMA data. Com o intervalo inteiro em `nowrap` (UI-10 de
 * 2026-08-17) a célula media 182px numa coluna de 103px e cobria o contador
 * vizinho.
 */
export const complianceWidths = () =>
  tableWidths(
    {
      course: { weight: 19 },
      redatores: { weight: 17 },
      range: { weight: 15 },
      present: { weight: 15 },
      missing: { weight: 18 },
      enabled: { weight: 16 },
    },
    { actions: false },
  )

/**
 * Cinco frações iguais. O contador sob "Documentos vencidos"/"Documentos por
 * vencer" precisa de 123px (palavra + padding, es-CL e pt-BR), e o nome do
 * relator de 114px ("Instructor" com o ícone ao lado, en): soma 561px. A 20% cada
 * coluna tem 134px no piso de 42rem (672px), e o nome — curto, e o único texto
 * livre — não precisa de mais que os contadores.
 */
const FATIA_IGUAL = { weight: 1 } as const

export const redatorLoadWidths = () =>
  tableWidths(
    {
      name: FATIA_IGUAL,
      current: FATIA_IGUAL,
      upcoming: FATIA_IGUAL,
      expired: FATIA_IGUAL,
      expiring: FATIA_IGUAL,
    },
    { actions: false },
  )
