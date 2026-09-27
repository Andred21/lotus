import { COL, tableWidths } from '@shared/ui'

/**
 * Classificação das colunas da `RedatoresTable`.
 *
 * `last_login` é `dateTime` e não `date`: `formatDateTime` imprime dia E hora, e
 * a hora é o que distingue dois acessos do mesmo dia — a coluna precisa da fatia
 * maior para não quebrar o carimbo no meio.
 *
 * `rut` usa `COL.short`, não `COL.rut`: com 5 colunas de dado competindo pelo
 * orçamento (a mais desta tabela entre as que mostram RUT), o peso original
 * (9) reservava 92,5px em 1024x768 contra um RUT de 100,8px — o texto vazava
 * ~8px sobre "Cursos habilitados" (UI-02, `2026-09-04-lotus-ui-review-personas.md`).
 * Mesmo precedente do UI-01 da run de Cursos: troca o peso da coluna, não o
 * vocabulário `COL` em si (`courseColumns.ts`).
 */
export const redatorWidths = (archived: boolean) =>
  tableWidths(
    {
      name: COL.identity,
      rut: COL.short,
      courses: COL.count,
      suitability: COL.tag,
      lastLogin: COL.dateTime,
    },
    { archived },
  )
