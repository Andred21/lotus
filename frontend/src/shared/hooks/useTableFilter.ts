import { useState } from 'react'

export interface TableFilter<T> {
  /** Termo cru — alimenta o input e é o que se cita no empty state. */
  filter: string
  /** Termo normalizado (trim + lowercase); `''` quando não há busca. */
  term: string
  /** `true` quando há busca ativa OU filtro próprio da tela (`where`). É a
   * resposta autoritativa para "mostrar o empty state de filtro ou o de lista
   * vazia?" — a tela não recalcula essa pergunta. */
  filtering: boolean
  /** Linhas depois do `where` e da busca. */
  rows: T[]
  /** Índice da primeira linha da página (controlado — volta a 0 ao filtrar).
   * Também clampada: se apontar além do fim de `rows` (lista encolheu, ex.
   * deleção na última página), devolve 0 em vez do valor obsoleto. */
  first: number
  /** Troca o termo e volta à primeira página. */
  onFilterChange: (value: string) => void
  /** Handler de página do `AppDataTable`. */
  onPage: (event: { first: number }) => void
  /** Volta à primeira página sem mexer no termo — para o filtro próprio da tela. */
  resetPage: () => void
  /** Limpa a busca e volta à primeira página. */
  clear: () => void
}

/**
 * Estado de busca e paginação de uma tabela em card. Os 6 consumidores repetiam
 * este bloco literalmente, e a duplicação rendeu dois defeitos no review da
 * Parte 2: o paginador default ligado na `RolesTable` (duas faixas, contra D6) e
 * o empty state falso durante o loading. Contrato fixado em
 * `.claude/rules/frontend-fsliced.md`.
 *
 * Quando ligar o paginador não é decisão do hook nem da tela: quem sabe quantas
 * linhas cabem na página é o `AppDataTable`, que exibe os controles só quando
 * `value.length > rows` (spec D12).
 *
 * `searchable` devolve os campos que a busca varre — `null`/`undefined` são
 * ignorados. É OPCIONAL: uma tabela em card pode não ter busca (a aba Alumnos
 * não tem, por decisão do protótipo) e ainda assim precisa do estado de página
 * e do clamp — sem isso o consumidor reimplementa o bloco, que é a duplicação
 * que este hook existe para matar. `where` é o filtro próprio da tela (estado,
 * tipo) e roda ANTES da busca.
 *
 * **Saber se há filtro ativo é do hook, não da tela** (`filtering`). Era o
 * contrário até 2026-08-03, e as duas telas que reimplementaram a pergunta
 * erraram junto: `TurmasTable` e `BudgetsTable` comparavam o estado do
 * dropdown com `=== null`, mas o PrimeReact devolve o OBJETO da opção quando
 * `option.value` é vazio (`dropdown.cjs.js:1441`, `ObjectUtils.isEmpty(null)`
 * é `true`). Com "Todos" selecionado a tela dizia "sem resultados para os
 * filtros aplicados" sobre uma lista que só estava vazia.
 */
export function useTableFilter<T>(
  items: T[],
  searchable?: (item: T) => (string | null | undefined)[],
  where?: (item: T) => boolean,
): TableFilter<T> {
  const [filter, setFilter] = useState('')
  const [first, setFirst] = useState(0)

  const term = filter.trim().toLowerCase()
  const scoped = where ? items.filter(where) : items
  const rows =
    term === '' || !searchable
      ? scoped
      : scoped.filter((item) =>
          searchable(item).some((value) => (value ?? '').toLowerCase().includes(term)),
        )

  const onFilterChange = (value: string) => {
    setFilter(value)
    setFirst(0)
  }

  // Clamp do ESTADO, não só da leitura: a lista pode encolher (ex. deleção na
  // última página) e depois crescer de novo sem o usuário trocar de página —
  // sem isto, a página obsoleta reaparece. Ajuste durante o render (mesmo
  // padrão do reset de form via useState condicional), não useEffect: teria um
  // frame de atraso.
  if (first >= rows.length && first !== 0) {
    setFirst(0)
  }

  return {
    filter,
    term,
    filtering: term !== '' || where !== undefined,
    rows,
    first: first >= rows.length ? 0 : first,
    onFilterChange,
    onPage: (event) => setFirst(event.first),
    resetPage: () => setFirst(0),
    clear: () => onFilterChange(''),
  }
}
