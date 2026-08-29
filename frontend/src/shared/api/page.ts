import { api } from './axios'
import type { PageMetaData } from '@shared/types/generated'

/** O `meta` gerado do backend (`App\Shared\Pagination\PageMetaData`). Alias
 * para as extensões (`CertificatePageMetaData`) entrarem por `M extends PageMeta`. */
export type PageMeta = PageMetaData

/** O envelope `{ data, meta }` de `App\Shared\Pagination\PageData`, tipado à
 * mão porque o transformer não emite genérico (spec §4.1): `data` casa com o
 * tipo gerado do ITEM, `meta` com o gerado do `meta`. Este é o ÚNICO lugar do
 * front que conhece o envelope. */
export interface Page<T, M extends PageMeta = PageMeta> {
  data: T[]
  meta: M
}

/** A query string que o `PageRequest` do backend aceita, mais os filtros
 * nomeados de cada lista (`display_status`, `status`). `undefined` é omitido
 * pelo axios — é assim que "sem filtro" vira "sem parâmetro". */
export type PageQuery = {
  page: number
  per_page: number
  q?: string
  sort?: string
} & Record<string, string | number | undefined>

/** Fábrica do fetch de uma lista paginada. Mora em `shared/api` — e não em
 * `shared/lib` — porque toca o axios; `shared/lib` não importa `shared/api`. */
export function pageEndpoint<T, M extends PageMeta = PageMeta>(url: string) {
  return (query: PageQuery): Promise<Page<T, M>> =>
    api.get<Page<T, M>>(url, { params: query }).then((r) => r.data)
}
