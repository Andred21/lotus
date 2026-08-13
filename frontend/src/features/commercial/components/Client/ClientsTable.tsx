import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useTableFilter } from "@shared/hooks";
import {
  AppColumn,
  AppAvatar,
  AppTag,
  AppButton,
  AppEmptyState,
  SearchableTableFrame,
} from "@shared/ui";
import type { ClientData } from "@shared/types/generated";

export function ClientsTable({
  clients,
  loading,
  onView,
  actions,
  error,
  onRetry,
}: {
  clients: ClientData[];
  loading: boolean;
  onView: (c: ClientData) => void;
  actions?: ReactNode;
  error?: { detail?: string | null } | null;
  /** Repassa o refetch da página: é a promise que mantém o Reintentar do
   * AppErrorState em `loading` (Q-14). Tipar `() => void` aqui compilaria e
   * faria a camada do meio mentir sobre o contrato. */
  onRetry?: () => void | Promise<unknown>;
}) {
  const { t } = useTranslation();
  const table = useTableFilter(clients, (c) => [c.legal_name, c.rut]);

  return (
    <SearchableTableFrame
      table={table}
      searchPlaceholder={t("client.searchPlaceholder")}
      emptyState={
        <AppEmptyState
          icon="pi pi-building"
          title={t("client.empty")}
          description={t("client.emptyHint")}
          action={actions}
        />
      }
      footerCount={t("client.count", { count: table.rows.length })}
      actions={actions}
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
          <div className="flex  items-center gap-3">
            <AppAvatar name={c.legal_name} image={c.photo_url} size="large" />
            <div className="flex flex-col ">
              <span className="font-semibold">{c.legal_name}</span>
              <span className="text-sm font-medium text-gray-400">{c.email}</span>
            </div>
          </div>
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
      <AppColumn
        body={(c: ClientData) => (
          <AppButton
            icon="pi pi-eye"
            text
            rounded
            aria-label={t("common.view")}
            onClick={() => onView(c)}
          />
        )}
        style={{ width: "4rem" }}
      />
    </SearchableTableFrame>
  );
}
