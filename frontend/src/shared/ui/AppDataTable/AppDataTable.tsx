import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { DataTable } from 'primereact/datatable'
import type { DataTableProps, DataTableValueArray, DataTablePassThroughOptions } from 'primereact/datatable'
import { Column } from 'primereact/column'
import { loadErrorHint, screenDetail, type ScreenDetailSource } from '@shared/lib'
import { AppErrorState } from '../AppErrorState'
import { mergePt } from '../mergePt'
import { appDataTablePt, appPaginatorPt } from './style'

export type AppDataTableProps<T extends DataTableValueArray> = DataTableProps<T> & {
  /** Contagem em prosa do rodapé. Passá-la liga a faixa: o paginador do
   * DataTable vira o rodapé do card (spec D12), com a contagem à esquerda e os
   * controles de página à direita — e só quando há mais de uma página. */
  footerCount?: ReactNode
  /** Problema que impediu o carregamento. Truthy => o corpo vira
   * `AppErrorState` (spec D16). `ScreenDetailSource` vem de `shared/lib`, não de
   * `shared/api`: a fronteira registrada aqui — não importar do cliente HTTP —
   * continua de pé, e a política de qual `detail` pode ir à tela deixa de ser
   * duplicada inline. `ProblemDetails` satisfaz a interface. */
  error?: ScreenDetailSource | null
  /** Recarrega a lista. Sem ele o estado de erro não oferece botão.
   * Devolver a promise do refetch faz o Reintentar do AppErrorState esperar
   * por ela (Q-14). Tipar `() => void` aqui compilaria — TS aceita descartar o
   * retorno — e faria o tipo mentir sobre o contrato. */
  onRetry?: () => void | Promise<unknown>
}

/** Wrapper do DataTable: paginação/sort/filtro client-side por default; com
 * `lazy` + `totalRecords` (listas que paginam no servidor — `useServerTable`),
 * o DataTable só emite eventos e quem busca é o hook. Colunas via <AppColumn/>.
 *
 * Durante o `loading` o corpo vazio ainda renderiza — passar `undefined` em
 * `emptyMessage` cairia no default inglês do PrimeReact (`No available
 * options`). Um nó vazio truthy mantém a linha e cala o texto; suprimir isso é
 * responsabilidade do wrapper, não de cada tabela.
 *
 * O rodapé é o paginador: com `footerCount`, `alwaysShowPaginator` mantém a
 * faixa mesmo em página única e `paginatorTemplate=''` apaga os controles
 * (template falsy não cria elemento algum; `leftContent` renderiza fora desse
 * ramo). Fatiar a página fora da tabela foi rejeitado: 5 tabelas têm coluna
 * `sortable`, e o DataTable só ordena o que recebe.
 *
 * Em erro (spec D16) o wrapper força três coisas de uma vez: linhas vazias (dado
 * obsoleto de um refetch que falhou não é dado válido), rodapé desligado
 * (contar linhas de uma lista que não carregou é ruído) e o corpo virando
 * `AppErrorState`. O estado de erro vence o de vazio: a tabela nunca convida a
 * cadastrar sobre uma falha. */
export function AppDataTable<T extends DataTableValueArray>({
  pt,
  loading,
  emptyMessage,
  footerCount,
  error,
  onRetry,
  value,
  rows = 10,
  totalRecords,
  ...props
}: AppDataTableProps<T>) {
  const { t } = useTranslation()
  const errored = error != null
  const data = (errored ? [] : value) as T | undefined
  // Em modo `lazy` a página tem no máximo `rows` linhas por construção, então
  // `data.length > rows` nunca ligaria os controles: quem sabe quantas linhas
  // existem é `totalRecords`. `hasRows`, logo abaixo, continua por página —
  // largura mínima e cabeçalho são sobre o que está na tela.
  const paginated = (totalRecords ?? data?.length ?? 0) > rows
  // A largura mínima só faz sentido protegendo colunas de dado real: sem
  // linhas (erro ou vazio), ela empurra o conteúdo centralizado de
  // AppErrorState/AppEmptyState (e o botão Reintentar) para fora da faixa
  // visível numa tela estreita — o oposto do que a Task 33 resolveu nos
  // diálogos.
  const hasRows = (data?.length ?? 0) > 0
  // Sem linhas, sem cabeçalho. A largura mínima já era zerada aqui, e não
  // bastou: os seis `<th>` com `px-4 py-2.5` têm largura intrínseca própria e
  // sustentam a tabela mesmo com o corpo ocupado por um único `<td>` de estado
  // vazio (452px de conteúdo para 276px visíveis, medido em 390x844). Cabeçalho
  // sobre zero linha não informa nada: não há coluna a interpretar.
  //
  // `loading` NÃO é estado vazio, e por isso o cabeçalho fica: durante o GET
  // inicial a lista também está vazia, e esconder o `thead` ali fazia o
  // cabeçalho sumir e voltar a cada carregamento, com o card saltando de altura
  // — exatamente o que a decisão do Q-15, três linhas abaixo, recusou ao manter
  // a faixa do rodapé sempre montada (review do BD-3, Q-3). A largura mínima
  // segue zerada sempre que não há linha, carregando ou não.
  const widthPt: DataTablePassThroughOptions = hasRows
    ? {}
    : { table: { className: '' }, ...(loading ? {} : { thead: { className: 'hidden' } }) }

  const body = errored ? (
    <AppErrorState
      title={t('common.loadError')}
      detail={screenDetail(error) ?? t(loadErrorHint(error))}
      retryLabel={onRetry ? t('common.retry') : undefined}
      onRetry={onRetry}
    />
  ) : loading ? (
    <span />
  ) : (
    emptyMessage
  )

  return (
    <DataTable
      // Default, não lei: o chamador cuja linha não tem `id` passa o seu
      // (`EmissionStudentsTable`, `enrollment_id`) — o spread abaixo vence.
      dataKey="id"
      removableSort
      rowHover
      value={data}
      rows={rows}
      totalRecords={errored ? 0 : totalRecords}
      paginator={footerCount !== undefined && !errored}
      alwaysShowPaginator
      // Desligar o paginador durante o `loading` foi recusado: a faixa some e
      // volta, e o card salta de altura a cada GET. O que muda é o TEXTO.
      paginatorLeft={loading ? t('common.loading') : footerCount}
      paginatorTemplate={paginated ? 'PrevPageLink PageLinks NextPageLink' : ''}
      pt={mergePt<DataTableProps<DataTableValueArray>['pt']>(
        mergePt<DataTablePassThroughOptions>(
          { ...appDataTablePt, paginator: appPaginatorPt },
          widthPt,
        ),
        pt as DataTableProps<DataTableValueArray>['pt'],
      )}
      // O comparador do `BodyCell` compara DADO, não função: `defaultKeysToCompare`
      // lista `rowData` e `field` e não lista `body`
      // (`primereact/datatable/datatable.cjs.js:1795-1808`). A closure nova que a
      // troca de idioma produz nunca chega à célula — o cabeçalho repinta e o
      // valor congela até a recarga (D-55, medido no BD-17). Com `cellMemo`
      // `false` o comparador devolve `false` na primeira linha (`:1799`) e a
      // célula repinta a cada render da tabela.
      //
      // O rekey da tabela em `i18n.language` foi recusado com o custo medido:
      // remontar zera ordenação, página e filtro, que aqui são client-side (ver o
      // docblock acima). Trocar o idioma perderia estado escolhido pelo usuário.
      //
      // ANTES do spread de propósito: a memoização fica desligada em toda tabela
      // — custo aceito na escala do produto —, e uma tabela que um dia cresça a
      // ponto de senti-lo religa o memo passando `cellMemo` como qualquer outra
      // prop do DataTable.
      cellMemo={false}
      loading={loading && !errored}
      emptyMessage={body}
      {...props}
    />
  )
}

export { Column as AppColumn }
export type { ColumnProps as AppColumnProps } from 'primereact/column'
