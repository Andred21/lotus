import type { ScreenDetailSource } from './screenDetail'

/** Os dois campos do rastreio de arquivamento, **opcionais**: no modo ativo eles
 * não existem na linha. É a diferença deliberada para o `ArchivedRow` privado do
 * `useArchivedPage`, onde os mesmos dois campos são OBRIGATÓRIOS — aquele é o DTO
 * do backend, este é a linha da tabela. Dois tipos com duas verdades; colidir o
 * nome é o que faria alguém trocar um pelo outro num refactor futuro. */
export type ArchiveTrail = { archived_at?: string; archived_by?: string | null }

/** A linha que a MESMA tabela renderiza nos dois modos. Estava declarada 8 vezes
 * — 6 tabelas e 2 listas —, cada cópia reafirmando os dois campos à mão (D-53). */
export type ArchivableRow<T> = T & ArchiveTrail

/**
 * A forma normalizada de uma lista de página: o que `useCrudPage` e
 * `useArchivedPage` já devolvem, escrita como contrato.
 *
 * `error` é `ScreenDetailSource`, e não `ProblemDetails`, de propósito:
 * `shared/lib` não importa de `shared/api` — mesma fronteira que fez o
 * `screenDetail` nascer aqui em vez de lá, e que `AppDataTable.tsx:16-20`
 * registra. `ProblemDetails` satisfaz a interface, e as 6 tabelas já tipam o
 * `error` delas estruturalmente.
 *
 * `refetch` devolve `Promise`, não `unknown`: é a promise que o `AppErrorState`
 * aguarda para manter o Reintentar em `loading` (Q-14). O tipo do consumidor não
 * pode ser mais preciso que o da fonte.
 */
export interface ListSource<T> {
  items: T[]
  loading: boolean
  error: ScreenDetailSource | null
  refetch: () => Promise<unknown>
}

/** A fonte arquivada é uma `ListSource` que sabe o próprio modo.
 *
 * O `mode` chega por DENTRO dela, e não como terceiro argumento de
 * `archivableSource` (D5): com o modo solto, passar o de uma tabela junto das
 * fontes de outra compilaria. O tipo é declarado estruturalmente aqui, sem
 * importar `ArchiveMode` de `shared/hooks` — mesma direção que o `Mode` do
 * `ArchiveSwitch` já respeita (D6). */
export interface ArchivedListSource<T> extends ListSource<T> {
  mode: 'active' | 'archived'
}

/**
 * A fonte de dados da tela: a ativa ou a arquivada, INTEIRA.
 *
 * Seis páginas repetiam o mesmo quarteto de ternários sobre a mesma condição,
 * dentro das props (`items`, `loading`, `error`, `refetch` — D-52). O que
 * ramifica é a fonte, não cada campo dela: quatro ternários independentes são
 * quatro oportunidades de um deles olhar a condição errada, que foi exatamente
 * o que aconteceu na `OperationPage` (ternário aninhado derivando `loadError` à
 * mão dentro da prop).
 *
 * Função pura, não hook (D2): não tem estado nem efeito, e nomeá-la `use*`
 * mentiria sobre o que ela é e a submeteria às regras de hooks sem motivo.
 */
export function archivableSource<T>(
  active: ListSource<T>,
  archived: ArchivedListSource<T>,
): ListSource<T> {
  return archived.mode === 'archived' ? archived : active
}
