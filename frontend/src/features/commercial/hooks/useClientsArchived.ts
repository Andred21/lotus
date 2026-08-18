import { useTranslation } from "react-i18next";
import { useArchivedPage } from "@shared/hooks";
import { useToast } from "@shared/ui";
import { clientsApi } from "@shared/api/clientsApi";
import { problemMessage } from "@shared/api/problemMessage";
import type { ArchivedClientData, ClientData } from "@shared/types/generated";

/** Mesma razão do `useClientsPage`: é este arquivo que mantém a query fora do
 * componente. Eliminá-lo moveria `clientsApi` para dentro de `CommercialPage`.
 *
 * O TOAST mora aqui, nos dois sentidos: sem o `onError` um 403 de quem não tem
 * `commercial.client.restore` não muda nada na tela — a linha continua lá e o
 * usuário não sabe se clicou (Q-2 do review de 2026-08-18). O sucesso é o par
 * pedido pela spec D9. */
export function useClientsArchived() {
  const { t } = useTranslation();
  const toast = useToast();
  const page = useArchivedPage<ClientData, ArchivedClientData>(
    clientsApi,
    (row) => row.client,
  );
  // O arquivar mora aqui pela MESMA razão: `useRemove` é mutação de recurso e
  // não pode ser chamada de dentro de `CommercialPage` (lint
  // `no-restricted-syntax`).
  const archiveMutation = clientsApi.useRemove();

  const falhou = (problem: Parameters<typeof problemMessage>[0]) => {
    const message = problemMessage(problem);
    if (message) toast.error(message);
  };

  return {
    ...page,
    restore: (id: number) =>
      page.restore(id, {
        onSuccess: () => toast.success(t("archive.restoredToast")),
        onError: falhou,
      }),
    /** `onSuccess` do chamador fecha o ConfirmDialog — ele só fecha no sucesso,
     * para o 403/422 ter onde pousar. */
    archive: (id: number, options?: { onSuccess?: () => void }) =>
      archiveMutation.mutate(id, {
        onSuccess: () => {
          toast.success(t("archive.archivedToast"));
          options?.onSuccess?.();
        },
        onError: falhou,
      }),
    archiving: archiveMutation.isPending,
  };
}
