import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useTableFilter } from "@shared/hooks";
import type { ArchiveMode } from "@shared/hooks";
import {
  AppColumn,
  ArchiveSwitch,
  IdentityCell,
  AppTag,
  AppEmptyState,
  SearchableTableFrame,
} from "@shared/ui";
import type { ClientData } from "@shared/types/generated";
import { ClientRowActions } from "./ClientRowActions";

/** A mesma tabela serve as duas fontes. Em `archived` as duas colunas do
 * rastreio vêm preenchidas pelo achatamento do `useArchivedPage`; em `active`
 * elas nem são renderizadas. */
export type ClientRow = ClientData & {
  archived_at?: string;
  archived_by?: string | null;
};

export function ClientsTable({
  clients,
  loading,
  onView,
  actions,
  error,
  onRetry,
  mode,
  onModeChange,
  onArchive,
  onRestore,
}: {
  clients: ClientRow[];
  loading: boolean;
  onView: (c: ClientData) => void;
  mode: ArchiveMode;
  onModeChange: (mode: ArchiveMode) => void;
  onArchive: (c: ClientData) => void;
  onRestore: (c: ClientData) => void;
  actions?: ReactNode;
  error?: { detail?: string | null } | null;
  /** Repassa o refetch da página: é a promise que mantém o Reintentar do
   * AppErrorState em `loading` (Q-14). Tipar `() => void` aqui compilaria e
   * faria a camada do meio mentir sobre o contrato. */
  onRetry?: () => void | Promise<unknown>;
}) {
  const { t } = useTranslation();
  const archived = mode === "archived";
  const table = useTableFilter(clients, (c) => [c.legal_name, c.rut]);

  return (
    <SearchableTableFrame
      table={table}
      searchPlaceholder={t("client.searchPlaceholder")}
      emptyState={
        <AppEmptyState
          icon={archived ? "pi pi-inbox" : "pi pi-building"}
          title={archived ? t("archive.empty") : t("client.empty")}
          description={archived ? t("archive.emptyHint") : t("client.emptyHint")}
          action={archived ? undefined : actions}
        />
      }
      footerCount={t("client.count", { count: table.rows.length })}
      actions={archived ? undefined : actions}
      viewSwitch={<ArchiveSwitch value={mode} onChange={onModeChange} />}
      loading={loading}
      error={error}
      onRetry={onRetry}
    >
      <AppColumn
        field="legal_name"
        header={t("client.legalName")}
        sortable
        className="w-1/3"
        body={(c: ClientData) => (
          <IdentityCell title={c.legal_name} description={c.email} image={c.photo_url} />
        )}
      />
      <AppColumn
        header={t("common.rut")}
        body={(c: ClientData) => (
          <span className="font-semibold text-sm">{c.rut}</span>
        )}
      />
      <AppColumn
        header={t("client.type")}
        body={(c: ClientData) => (
          <AppTag value={t(`clientType.${c.type}`)} severity="secondary" />
        )}
      />
      <AppColumn
        header={t("client.commune")}
        body={(c: ClientData) => c.addresses?.[0]?.commune ?? "—"}
      />
      <AppColumn
        header={t("client.contacts")}
        body={(c: ClientData) => (
          <span className="font-semibold">{c.contacts?.length ?? 0}</span>
        )}
      />
      {archived && (
        <AppColumn
          field="archived_at"
          header={t("archive.archivedAt")}
          body={(c: ClientRow) =>
            c.archived_at ? new Date(c.archived_at).toLocaleDateString() : "—"
          }
        />
      )}
      {archived && (
        <AppColumn
          field="archived_by"
          header={t("archive.archivedBy")}
          body={(c: ClientRow) => c.archived_by ?? t("archive.unknownAuthor")}
        />
      )}
      <AppColumn
        body={(c: ClientRow) => (
          <ClientRowActions
            client={c}
            archived={archived}
            onView={onView}
            onArchive={onArchive}
            onRestore={onRestore}
          />
        )}
        style={{ width: "8rem" }}
      />
    </SearchableTableFrame>
  );
}
