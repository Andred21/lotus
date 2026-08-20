import type { ReactElement } from 'react'
import { formatDate, type ArchiveTrail } from '@shared/lib'
import { AppColumn } from './AppDataTable'

/**
 * O par de colunas do rastreio de arquivamento — "arquivado em" e "arquivado por".
 *
 * **É uma FUNÇÃO que devolve array, e isso não é estilo.** `AppColumn` é reexport
 * direto do `Column` do PrimeReact (`AppDataTable.tsx:125`), e o DataTable resolve
 * colunas com `Children.toArray(props.children)`
 * (`primereact/datatable/datatable.cjs.js:5973`): ele lê o filho DIRETO e busca
 * `field`/`header`/`body` nas props dele. Um componente `<ArchivedColumns />` — ou
 * um Fragment envolvendo as duas colunas — achata para UM elemento, sem `field`, e
 * renderiza uma coluna vazia **sem estourar**: build, lint e suíte passam. Um array
 * aninhado, ao contrário, o `Children.toArray` achata corretamente. Medido por sonda
 * antes de desenhar (§2 da spec), e guardado pela catraca em `archivedColumns.test.tsx`.
 *
 * `t` é tipado estruturalmente e não como `TFunction`: a peça precisa de "algo que
 * traduz uma chave", não do i18next inteiro, e é o chamador que já tem o `t` do
 * `useTranslation()`. `shared/ui` não vira consumidor do hook por causa disto.
 *
 * A data sai por `formatDate` — o idioma ATIVO da interface. Com a grafia crua
 * (`new Date(x).toLocaleDateString()`, sem argumento), o locale vinha do NAVEGADOR:
 * a interface em es-CL imprimia `8/19/2026` na coluna e `19-08-2026` no resto da
 * tela. É o mesmo defeito do D-18, que `AppFileRow.tsx:42-46` já corrigiu e comenta;
 * a superfície de arquivados era o último lugar do frontend com a grafia crua (D-51).
 * Só a data, sem hora (D1): `archived_at` carrega o timestamp completo, mas a hora
 * seria informação NOVA na tela, e este bloco corrige um defeito de idioma.
 *
 * Sem `sortable`: nenhuma das 6 tabelas o tinha, e acrescentá-lo aqui mudaria o
 * comportamento das 6 de uma vez.
 */
export function archivedColumns(t: (key: string) => string): ReactElement[] {
  return [
    <AppColumn
      key="archived_at"
      field="archived_at"
      header={t('archive.archivedAt')}
      body={(linha: ArchiveTrail) =>
        linha.archived_at ? formatDate(new Date(linha.archived_at)) : '—'
      }
    />,
    <AppColumn
      key="archived_by"
      field="archived_by"
      header={t('archive.archivedBy')}
      body={(linha: ArchiveTrail) => linha.archived_by ?? t('archive.unknownAuthor')}
    />,
  ]
}
