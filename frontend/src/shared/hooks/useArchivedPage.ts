import { useMemo, useState } from "react";
import type { ProblemDetails } from "@shared/api/axios";
import { useRestoreAction, type RestoreOptions } from "./useRestoreAction";
import { listSource } from "./listSource";

export type ArchiveMode = "active" | "archived";

/** O que o hook exige do DTO composto — os dois campos do arquivamento. O
 * agregado em si (`client`, `course`) é a terceira chave e chega pelo seletor,
 * não por adivinhação. Restringir a `Record<string, unknown>` excluiria toda
 * `interface`, que não tem index signature implícita. */
interface ArchivedRow {
  archived_at: string;
  archived_by: string | null;
}

/** Contrato mínimo, tipado por estrutura — o hook não depende da fábrica
 * inteira, mesmo molde do `ListableResource` de `useCrudPage`. */
interface ArchivableResource<TArchived> {
  useArchivedList: (enabled: boolean) => {
    data?: TArchived[];
    isLoading: boolean;
    isError: boolean;
    error: ProblemDetails | null;
    refetch: () => Promise<unknown>;
  };
  useRestore: () => {
    mutate: (id: number, options?: RestoreOptions) => void;
    isPending: boolean;
  };
}

/**
 * Estado da visão de Arquivados: o modo, a lista e o restore.
 *
 * O ACHATAMENTO vive aqui de propósito. O backend devolve o DTO composto
 * (`{ client, archived_at, archived_by }`) porque `ClientData` não muda (spec
 * D8); a tabela, porém, não pode ter duas formas. Achatar na tela obrigaria
 * cada tabela a repetir a mesma desestruturação.
 *
 * O agregado chega por `select`, EXPLÍCITO. A primeira versão o pescava com
 * `Object.values(resto)[0]`, o que fazia o contrato depender da contagem e da
 * ordem das chaves do DTO: um campo novo em `ArchivedClientData` — regenerado
 * do backend, sem tocar em linha nenhuma daqui — trocaria o agregado por outra
 * coisa em silêncio, e o cast calava o `tsc` (Q-3 do review de 2026-08-18).
 */
export function useArchivedPage<T, TArchived extends ArchivedRow>(
  resource: ArchivableResource<TArchived>,
  select: (row: TArchived) => T,
) {
  const [mode, setMode] = useState<ArchiveMode>("active");
  const query = resource.useArchivedList(mode === "archived");
  const restore = useRestoreAction(resource.useRestore());

  const items = useMemo(() => {
    return (query.data ?? []).map((row) => ({
      ...select(row),
      archived_at: row.archived_at,
      archived_by: row.archived_by,
    }));
    // `select` é literal de seta no chamador: incluí-lo refaria o map a cada
    // render, que é o oposto do que o memo existe para fazer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data]);

  return {
    mode,
    setMode,
    ...listSource(query),
    // O `items` do `listSource` é `query.data ?? []`; o desta tela carrega o
    // rastro de arquivamento e vem memoizado acima. O override vem DEPOIS do
    // spread de propósito — invertê-los devolveria a linha sem `archived_at`.
    items,
    ...restore,
  };
}

export type { RestoreOptions };
