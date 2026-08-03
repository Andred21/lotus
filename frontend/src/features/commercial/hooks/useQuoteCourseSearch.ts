import { useState } from 'react'
import { coursesApi } from '@shared/api/coursesApi'

/** Busca de curso do passo 1 do wizard de cotação: query, termo e lista filtrada.
 *
 * O `?? []` é o comportamento de hoje e fica: distinguir GET falho de catálogo
 * vazio muda o que a tela afirma e é o B-7, débito registrado no backlog, fora
 * deste bloco. Por isso o hook NÃO expõe `isError` — API que ninguém consome
 * mentiria sobre o que esta tela trata. */
export function useQuoteCourseSearch() {
  const courses = coursesApi.useList()
  const [search, setSearch] = useState('')

  const list = (courses.data ?? []).filter((c) =>
    c.name.toLowerCase().includes(search.trim().toLowerCase()),
  )

  return { list, search, setSearch }
}
