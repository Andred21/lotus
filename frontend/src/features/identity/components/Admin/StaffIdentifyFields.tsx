import { useTranslation } from "react-i18next";
import { AppInputText, AppPassword, type FieldComponent } from "@shared/ui";
import type { StaffUserFormFields } from "../../hooks/useStaffUserForm";

/** Os quatro campos de identificação do aluno, no grid 2×2 de sempre.
 *
 * Não é um `PersonFields` genérico de propósito: os grids de Redator, Aluno e
 * Staff divergem (o aluno tem nome em linha inteira e empresa ao lado do
 * telefone), e unificá-los mudaria o que três telas renderizam. */
export function StaffIdentityFields({
  Field,
  mode,
}: {
  Field: FieldComponent<StaffUserFormFields>;
  mode: "create" | "edit" | "view";
}) {
  const { t } = useTranslation();

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-1">
        <Field name="name" label={t("admin.name")}>
          <AppInputText className="w-full" />
        </Field>
        <Field name="rut" label={t("common.rut")}>
          <AppInputText className="w-full" />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="email" label={t("common.email")}>
          <AppInputText className="w-full" />
        </Field>

        <Field name="phone" label={t("common.phone")}>
          <AppInputText className="w-full" />
        </Field>

        {mode === "create" && (
          <Field name="password" label={t("common.password")}>
            <AppPassword className="w-full" inputClassName="w-full" />
          </Field>
        )}
      </div>
    </>
  );
}
