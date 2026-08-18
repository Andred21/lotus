import { useTranslation } from "react-i18next";
import { usePermissions } from "@shared/hooks";
import { AppButton } from "@shared/ui";
import type { ClientData } from "@shared/types/generated";

/**
 * Ações por linha da tabela de clientes. Extraído da `ClientsTable` porque a
 * célula ramifica por modo e a régua de 150 linhas de `features/<x>/components/`
 * vale sem exceção.
 *
 * Esconder o botão é conveniência de interface — a autorização real é da API
 * (ADR-07).
 */
export function ClientRowActions({
  client,
  archived,
  busy,
  onView,
  onArchive,
  onRestore,
}: {
  client: ClientData;
  archived: boolean;
  /** Mutation em voo: sem isto o clique duplo dispara dois POSTs (Q-2). */
  busy: boolean;
  onView: (c: ClientData) => void;
  onArchive: (c: ClientData) => void;
  onRestore: (c: ClientData) => void;
}) {
  const { t } = useTranslation();
  const { can } = usePermissions();

  if (archived) {
    return can("commercial.client.restore") ? (
      <AppButton
        label={t("archive.restoreAction")}
        icon="pi pi-undo"
        text
        size="small"
        disabled={busy}
        onClick={() => onRestore(client)}
      />
    ) : null;
  }

  return (
    <div className="flex justify-end gap-1">
      {can("commercial.client.delete") && (
        <AppButton
          icon="pi pi-inbox"
          text
          rounded
          aria-label={t("archive.archiveAction")}
          disabled={busy}
          onClick={() => onArchive(client)}
        />
      )}
      <AppButton
        icon="pi pi-eye"
        text
        rounded
        aria-label={t("common.view")}
        onClick={() => onView(client)}
      />
    </div>
  );
}
