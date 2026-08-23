import { useTranslation } from "react-i18next";
import { AppButton, AppTag, DetailHeader, IdentityCell, type DetailHeaderProps } from "@shared/ui";
import type { TurmaData } from "@shared/types/generated";
import {
  turmaDisplayStatus,
  turmaStatusSeverity,
  turmaModalidadeTagProps,
} from "../../lib/turmaStatus";

type Props = {
  turma: TurmaData;
  /** Volta ao módulo. Mora na página porque os ramos de carga e de erro — que
   * não têm turma para este cabeçalho montar — usam o MESMO objeto. */
  back: DetailHeaderProps["back"];
  onGoToBudget: (budgetId: number) => void;
};

/** Cabeçalho da turma: identificação do cliente, vínculo com o orçamento e as
 * duas tags de estado. Extraído da `TurmaDetailPage` como movimento literal —
 * o `DetailHeader` continua sendo o filho direto do `<div>` da página, sem nó
 * novo a alterar espaçamento — porque a página passou da régua de 150 linhas
 * ao ganhar o cartão de registro trancado (UI-01). */
export function TurmaDetailHeader({ turma, back, onGoToBudget }: Props) {
  const { t } = useTranslation();
  const status = turmaDisplayStatus(turma);

  return (
    <DetailHeader
      back={back}
      title={turma.course_name ?? "—"}
      subtitle={
        <IdentityCell
          inline
          title={turma.client_name ?? "—"}
          image={turma.client_photo_url}
          size="normal"
          description={
            turma.budget_id != null && (
              <AppButton
                text
                className="underline hover:no-underline"
                onClick={() => onGoToBudget(turma.budget_id!)}
              >
                {t("operation.detail.relatedTo", {
                  budget: turma.budget_code ?? "—",
                  quote: turma.quote_code ?? "—",
                })}
              </AppButton>
            )
          }
        />
      }
      tags={
        <>
          <AppTag
            value={t(`operation.status.${status}`)}
            severity={turmaStatusSeverity(status)}
          />
          <AppTag
            value={t(`operation.modality.${turma.modalidade}`)}
            {...turmaModalidadeTagProps(turma.modalidade)}
          />
        </>
      }
    />
  );
}
