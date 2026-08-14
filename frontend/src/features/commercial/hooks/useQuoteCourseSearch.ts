import { useState } from 'react'
import { useLoadState } from '@shared/hooks'
import { coursesApi } from '@shared/api/coursesApi'

/** Busca de curso do passo 1 do wizard de cotação: query, termo e lista filtrada.
 *
 * Os estados de carga vêm do `useLoadState` — carregando, falha, falha sem cache,
 * catálogo vazio — porque a tela precisa distingui-los: o `?? []` sozinho fazia um
 * GET falho virar "não há cursos", que é o débito B-7, pago neste bloco. Aqui
 * ficam só os dois estados que são DESTE hook: o termo e o filtro por ele. */
export function useQuoteCourseSearch() {
  const load = useLoadState(coursesApi.useList())
  const [search, setSearch] = useState('')

  const list = load.data.filter((c) => c.name.toLowerCase().includes(search.trim().toLowerCase()))

  return {
    ...load,
    list,
    search,
    setSearch,
    /** Há catálogo, mas o termo não casa com nada. Estado do FILTRO, não do GET. */
    noResults: load.data.length > 0 && list.length === 0,
  }
}
