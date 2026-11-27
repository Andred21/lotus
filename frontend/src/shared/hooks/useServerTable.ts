import { useEffect, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { ProblemDetails } from '@shared/api/axios'
import type { Page, PageMeta, PageQuery } from '@shared/api/page'
import { retryFor, type ScreenDetailSource } from '@shared/lib'
import { loadFailure } from './listSource'
import { useTableUrlState } from './useTableUrlState'

/** Janela entre a última tecla e o GET. Abaixo disso a API recebe um request
 * por letra; acima, a busca parece travada. */
export const SERVER_TABLE_DEBOUNCE_MS = 300

/** `null`/`undefined`/`''` = "sem filtro": a chave é OMITIDA da query, não
 * mandada vazia — é o que deixa o backend ler "ausente" como "todos". */
export type ServerTableFilters = Record<string, string | number | null | undefined>

/** Liga a tabela à query string (C-3): `q`, `page` e `sort` — mais os filtros
 * nomeados, que quem os possui lê e escreve pelo `useTableUrlState`. */
export interface ServerTableUrlOptions {
  /** Isola duas tabelas na mesma URL (`b_q`, `c_q`). Sem ele, chaves nuas. */
  prefix?: string
  /** Os `field` das colunas `sortable`. É a única lista que valida o `sort` da
   * URL: campo fora dela (ou lista ausente) cai no sort do servidor. */
  sortable?: readonly string[]
}

export interface ServerTableOptions {
  /** Prefixo da query key. A página entra depois dele (`[...key, 'page', query]`),
   * então invalidar o prefixo (`keys.lists()`, `listKey`) repinta toda página. */
  key: readonly unknown[]
  /** Linhas por página — o `per_page` que vai na URL. Default = o do `AppDataTable`. */
  rows?: number
  filters?: ServerTableFilters
  staleTime?: number
  refetchOnWindowFocus?: boolean
  /** Default `false`: o estado vive só em memória, como antes do C-3. Com
   * `{}` (ou `{ prefix, sortable }`) ele nasce da URL e volta para ela. */
  url?: ServerTableUrlOptions | false
}

/** Página 1-based da URL → `first`. Qualquer coisa que não seja inteiro >= 1
 * é a primeira página, nunca erro. */
function firstFromUrl(raw: string | null, rows: number): number {
  if (raw === null || !/^[1-9]\d*$/.test(raw)) return 0
  const page = Number(raw)
  return Number.isSafeInteger(page) ? (page - 1) * rows : 0
}

/** `campo` ou `-campo` → sort, só se o campo é uma coluna `sortable`. */
function sortFromUrl(raw: string | null, sortable: readonly string[] = []): { field: string; order: 1 | -1 } | null {
  if (raw === null) return null
  const order = raw.startsWith('-') ? -1 : 1
  const field = order === -1 ? raw.slice(1) : raw
  return sortable.includes(field) ? { field, order } : null
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
  /** `undefined` no 403 (`retryFor`): sem handler a tela não desenha o botão. */
  refetch: (() => Promise<unknown>) | undefined
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
  { key, rows = 10, filters, staleTime, refetchOnWindowFocus, url = false }: ServerTableOptions,
): ServerTable<T, M> {
  // O estado NASCE da URL (lazy: lido uma vez, no mount) e é espelhado nela
  // pelo efeito mais abaixo; entre os dois, `useState` segue sendo a fonte.
  const urlState = useTableUrlState({ prefix: url === false ? undefined : url.prefix, enabled: url !== false })
  const [filter, setFilter] = useState(() => urlState.read('q') ?? '')
  const [term, setTerm] = useState(() => (urlState.read('q') ?? '').trim())
  const [first, setFirst] = useState(() => firstFromUrl(urlState.read('page'), rows))
  const [sort, setSort] = useState<{ field: string; order: 1 | -1 } | null>(() =>
    sortFromUrl(urlState.read('sort'), url === false ? undefined : url.sortable),
  )

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

  const shownFirst = meta !== undefined && currentFirst >= total ? 0 : currentFirst

  // Espelho do estado na URL, SEM `deps`: roda a cada commit e só escreve o que
  // difere — idempotente, então não há laço, e a URL acompanha a tela até
  // quando o clamp ou a troca de escopo mexem na página por baixo. Termo, e
  // não o texto digitado: a URL recebe a busca depois do debounce, não a tecla.
  useEffect(() => {
    if (url === false) return
    const wanted: Record<string, string | null> = {
      q: term !== '' ? term : null,
      page: shownFirst > 0 ? String(Math.floor(shownFirst / rows) + 1) : null,
      sort: sort ? `${sort.order === -1 ? '-' : ''}${sort.field}` : null,
    }
    const patch = Object.fromEntries(Object.entries(wanted).filter(([key, value]) => urlState.read(key) !== value))
    if (Object.keys(patch).length > 0) urlState.write(patch)
  })

  const hasFilters = Object.keys(activeFilters).length > 0
  const filteredByScope = hasFilters && meta !== undefined && meta.total !== meta.total_unfiltered

  return {
    filter,
    term,
    filtering: term !== '' || filteredByScope,
    filteredByScope,
    rows: result.data?.data ?? [],
    first: shownFirst,
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
    refetch: retryFor(result.error, () => result.refetch()),
  }
}
