import { useEffect, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { ProblemDetails } from '@shared/api/axios'
import type { Page, PageMeta, PageQuery } from '@shared/api/page'
import type { ScreenDetailSource } from '@shared/lib'
import { loadFailure } from './listSource'

/** Janela entre a última tecla e o GET. Abaixo disso a API recebe um request
 * por letra; acima, a busca parece travada. */
export const SERVER_TABLE_DEBOUNCE_MS = 300

/** `null`/`undefined`/`''` = "sem filtro": a chave é OMITIDA da query, não
 * mandada vazia — é o que deixa o backend ler "ausente" como "todos". */
export type ServerTableFilters = Record<string, string | number | null | undefined>

export interface ServerTableOptions {
  /** Prefixo da query key. A página entra depois dele (`[...key, 'page', query]`),
   * então invalidar o prefixo (`keys.lists()`, `listKey`) repinta toda página. */
  key: readonly unknown[]
  /** Linhas por página — o `per_page` que vai na URL. Default = o do `AppDataTable`. */
  rows?: number
  filters?: ServerTableFilters
  staleTime?: number
  refetchOnWindowFocus?: boolean
}

/** A ordem que o `DataTable` do PrimeReact emite: `1`, `-1` e, com
 * `removableSort`, `0`/`null` no terceiro clique. Declarado por estrutura —
 * `shared/hooks` não importa tipo de `shared/ui` nem de `primereact`. */
export type ServerSortOrder = 1 | 0 | -1 | null | undefined

/**
 * O que o hook devolve: a MESMA forma que `useTableFilter` (`TableFilter<T>`,
 * e por isso `SearchableTableState<T>` da moldura), mais o que só existe no
 * servidor. A moldura não distingue as duas fontes (spec §4.5).
 */
export interface ServerTable<T, M extends PageMeta = PageMeta> {
  filter: string
  term: string
  filtering: boolean
  filteredByScope: boolean
  rows: T[]
  first: number
  onFilterChange: (value: string) => void
  onPage: (event: { first: number }) => void
  resetPage: () => void
  clear: () => void
  /** `meta.total` — o que o paginador e o rodapé contam. `0` antes do primeiro GET. */
  totalRecords: number
  meta: M | undefined
  sortField: string | undefined
  sortOrder: ServerSortOrder
  onSort: (event: { sortField: string; sortOrder: ServerSortOrder }) => void
  /** `isFetching`, não `isLoading`: com `keepPreviousData` a página anterior
   * fica na tela enquanto a próxima chega, e a faixa "carregando" sobre dado
   * válido é o comportamento desejado (spec §8). */
  loading: boolean
  error: ScreenDetailSource | null
  refetch: () => Promise<unknown>
}

/**
 * Estado de uma tabela paginada NO SERVIDOR: termo com debounce, página, sort
 * e filtros nomeados viram a `PageQuery` de um `pageEndpoint`, e o resultado
 * vem por `useQuery` com `placeholderData: keepPreviousData`.
 *
 * `filtering` mede o EFEITO, como o `useTableFilter` (regra do review de
 * 2026-08-04, Q-6): termo digitado OU `meta.total !== meta.total_unfiltered`
 * com filtro nomeado preenchido. `filteredByScope` é só a segunda metade — é
 * o que o botão do vazio usa para prometer "limpar filtros" (UI-09).
 * Aproximação declarada: com termo E filtro, `total` já carrega o corte dos
 * dois, então um filtro que não cortaria nada sozinho conta como cortando
 * enquanto houver termo. Custo: o botão diz "limpar busca e filtros" onde
 * "limpar busca" bastaria — sempre a promessa maior, nunca a menor.
 *
 * Trocar termo ou filtro volta à primeira página DURANTE o render (o mesmo
 * padrão de "adjust state during render" do clamp do `useTableFilter`), e a
 * query deste render já sai com `page: 1` — um `useEffect` pediria a página
 * velha primeiro e a certa depois.
 */
export function useServerTable<T, M extends PageMeta = PageMeta>(
  fetchPage: (query: PageQuery) => Promise<Page<T, M>>,
  { key, rows = 10, filters, staleTime, refetchOnWindowFocus }: ServerTableOptions,
): ServerTable<T, M> {
  const [filter, setFilter] = useState('')
  const [term, setTerm] = useState('')
  const [first, setFirst] = useState(0)
  const [sort, setSort] = useState<{ field: string; order: 1 | -1 } | null>(null)

  useEffect(() => {
    const id = setTimeout(() => setTerm(filter.trim()), SERVER_TABLE_DEBOUNCE_MS)
    return () => clearTimeout(id)
  }, [filter])

  const activeFilters = Object.fromEntries(
    Object.entries(filters ?? {}).filter(([, value]) => value !== null && value !== undefined && value !== ''),
  ) as Record<string, string | number>

  // Chave, termo e filtros formam o "escopo". Escopo novo = página 1, no MESMO
  // render. A `key` entra porque ela é o que troca quando a tela troca de
  // FONTE (Ativas ↔ Arquivadas, `useTurmasPage`): sem ela, sair da página 3 de
  // uma lista para a outra pedia `page=3` do endpoint novo, colhia vazio e só
  // então o clamp voltava à 1 — um GET jogado fora e uma piscada de tabela
  // vazia sobre lista que tinha linhas (Q-3 do review de 2026-08-29).
  const scope = `${JSON.stringify(key)}|${term}|${JSON.stringify(activeFilters)}`
  const [lastScope, setLastScope] = useState(scope)
  const scopeChanged = lastScope !== scope
  if (scopeChanged) {
    setLastScope(scope)
    setFirst(0)
  }
  const currentFirst = scopeChanged ? 0 : first

  const query: PageQuery = {
    page: Math.floor(currentFirst / rows) + 1,
    per_page: rows,
    ...(term !== '' ? { q: term } : {}),
    ...(sort ? { sort: `${sort.order === -1 ? '-' : ''}${sort.field}` } : {}),
    ...activeFilters,
  }

  const result = useQuery<Page<T, M>, ProblemDetails>({
    queryKey: [...key, 'page', query],
    queryFn: () => fetchPage(query),
    placeholderData: keepPreviousData,
    // Só quando pedido: `staleTime: undefined` explícito SOBRESCREVERIA o
    // default do `AppProviders` com o default do TanStack.
    ...(staleTime !== undefined ? { staleTime } : {}),
    ...(refetchOnWindowFocus !== undefined ? { refetchOnWindowFocus } : {}),
  })

  const meta = result.data?.meta
  const total = meta?.total ?? 0

  // Clamp do ESTADO, como no `useTableFilter`: a lista encolheu por baixo da
  // página pedida (deleção na última página, filtro que ficou mais estreito).
  if (currentFirst !== 0 && meta !== undefined && currentFirst >= total) {
    setFirst(0)
  }

  const hasFilters = Object.keys(activeFilters).length > 0
  const filteredByScope = hasFilters && meta !== undefined && meta.total !== meta.total_unfiltered

  return {
    filter,
    term,
    filtering: term !== '' || filteredByScope,
    filteredByScope,
    rows: result.data?.data ?? [],
    first: meta !== undefined && currentFirst >= total ? 0 : currentFirst,
    onFilterChange: (value) => setFilter(value),
    onPage: (event) => setFirst(event.first),
    resetPage: () => setFirst(0),
    clear: () => {
      setFilter('')
      setFirst(0)
    },
    totalRecords: total,
    meta,
    sortField: sort?.field,
    sortOrder: sort?.order ?? 0,
    onSort: (event) => {
      setSort(event.sortOrder === 1 || event.sortOrder === -1 ? { field: event.sortField, order: event.sortOrder } : null)
      setFirst(0)
    },
    loading: result.isFetching,
    error: loadFailure(result),
    refetch: () => result.refetch(),
  }
}
