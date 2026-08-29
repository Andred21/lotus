import type { PageQuery } from '@shared/api/page'
import { useServerTable, type ArchiveMode, type ServerTable } from '@shared/hooks'
import type { ArchivableRow } from '@shared/lib'
import type { TurmaData, TurmaDisplayStatus } from '@shared/types/generated'
import { turmaKeys, turmasArchivedPage, turmasPage } from '../api/useTurmas'

/** A mesma linha nos dois modos (D-53). */
export type TurmaRow = ArchivableRow<TurmaData>

/** A página arquivada, achatada no FETCH: `{ turma, archived_at, archived_by }`
 * vira `TurmaRow`, e o hook só vê uma forma. O agregado entra por chave
 * EXPLÍCITA (`row.turma`) — a lição do `useArchivedPage` (Q-3 de 2026-08-18):
 * pescar por posição faria um campo novo no DTO trocar o agregado em silêncio. */
const arquivadas = (query: PageQuery) =>
  turmasArchivedPage(query).then((page) => ({
    meta: page.meta,
    data: page.data.map((row): TurmaRow => ({ ...row.turma, archived_at: row.archived_at, archived_by: row.archived_by })),
  }))

/**
 * A página de turmas, ativa OU arquivada, por `useServerTable` (spec D1: a
 * lista do admin cresce sem teto, e `archivableSource` funde as duas numa
 * fonte só — então uma raiz pagina as duas). Um hook, uma moldura: trocar o
 * modo troca o endpoint e a chave; busca, filtro de estado e sort vão na URL.
 *
 * Alias de página no molde dos `useXPage`: é o que mantém a query fora do
 * componente (`no-restricted-syntax`).
 */
export function useTurmasPage(mode: ArchiveMode, status: TurmaDisplayStatus | null): ServerTable<TurmaRow> {
  const archived = mode === 'archived'

  return useServerTable<TurmaRow>(archived ? arquivadas : turmasPage, {
    key: archived ? turmaKeys.archived() : turmaKeys.list(),
    filters: { status },
  })
}
