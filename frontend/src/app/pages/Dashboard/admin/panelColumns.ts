import { tableWidths } from '@shared/ui'

/*
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
 * Peso = mínimo medido da coluna, em px, mais uma parte igual da folga. Mínimos a
 * 1024x768 (tabela de 718px): curso 130, relatores 122 ("Instructors"), período
 * 105 (uma data inteira), presentes 105, faltan 123, habilitada 107 — soma 692,
 * folga de 26px, ~4px para cada coluna. Folga zero numa coluna deixa o cabeçalho
 * à mercê de qualquer diferença de métrica de fonte (o fallback antes do webfont).
 * Abaixo de `sm` a tabela usa o piso de 45rem (720px, ver `CompliancePanel`), e
 * 390x844 repete a geometria de 1024. Entre `sm` e o invólucro de ~690px a
 * tabela fica no piso de 42rem (672px), abaixo da soma dos mínimos: medido a
 * 800x900 nas três línguas, nada transborda, e a rede para palavra longa é o
 * `wrap-break-word` das colunas de texto (medicoes-d73.md §3).
 *
 * `range` não é mais `nowrap` inteiro: cada data é, e o intervalo quebra entre
 * elas — o mínimo dele é UMA data. Com o intervalo inteiro em `nowrap` (UI-10 de
 * 2026-08-17) a célula media 182px numa coluna de 103px e cobria o contador
 * vizinho.
 */
export const complianceWidths = () =>
  tableWidths(
    {
      course: { weight: 134 },
      redatores: { weight: 126 },
      range: { weight: 109 },
      present: { weight: 109 },
      missing: { weight: 127 },
      enabled: { weight: 111 },
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
