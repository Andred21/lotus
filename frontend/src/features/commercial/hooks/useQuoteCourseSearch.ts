import { useState } from 'react'
import { coursesApi } from '@shared/api/coursesApi'

/** Busca de curso do passo 1 do wizard de cotação: query, termo e lista filtrada.
 *
 * Os estados saem daqui SEPARADOS — carregando, falha, catálogo vazio, termo sem
 * resultado — porque a tela precisa distingui-los: o `?? []` sozinho fazia um GET
 * falho virar "não há cursos", que é o débito B-7, pago neste bloco. O `?? []`
 * fica, mas só para derivar a lista; `isError` viaja ao lado dele, no mesmo
 * desenho do `useRedatorCourses` (D11). */
export function useQuoteCourseSearch() {
  const courses = coursesApi.useList()
  const [search, setSearch] = useState('')

  const all = courses.data ?? []
  const list = all.filter((c) => c.name.toLowerCase().includes(search.trim().toLowerCase()))

  return {
    list,
    search,
    setSearch,
    isLoading: courses.isLoading,
    isError: courses.isError,
    errorDetail: courses.error?.detail,
    refetch: () => {
      void courses.refetch()
    },
    /** Catálogo vazio de verdade: respondeu, sem erro, e não veio curso nenhum. */
    isEmpty: !courses.isError && courses.isSuccess && all.length === 0,
    /** Há catálogo, mas o termo não casa com nada. Estado do FILTRO, não do GET. */
    noResults: all.length > 0 && list.length === 0,
  }
}
