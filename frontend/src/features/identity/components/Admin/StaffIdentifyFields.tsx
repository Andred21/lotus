import { useTranslation } from "react-i18next";
import { AppInputText, AppPassword, FormField } from "@shared/ui";
import type { StaffUserFormFields } from "../../hooks/useStaffUserForm";

/** Os quatro campos de identificação do aluno, no grid 2×2 de sempre.
 *
 * Não é um `PersonFields` genérico de propósito: os grids de Redator, Aluno e
 * Staff divergem (o aluno tem nome em linha inteira e empresa ao lado do
 * telefone), e unificá-los mudaria o que três telas renderizam. */
export function StaffIdentityFields({
  form,
  set,
  readOnly,
  fieldErrors,
  mode,
}: {
  form: StaffUserFormFields;
  set: <K extends keyof StaffUserFormFields>(
    key: K,
    value: StaffUserFormFields[K],
  ) => void;
  readOnly: boolean;
  fieldErrors?: Record<string, string[]> | null;
  mode: "create" | "edit" | "view";
}) {
  const { t } = useTranslation();

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-1">
        <FormField
          label={t("admin.name")}
          error={fieldErrors?.name?.[0]}
          readOnly={readOnly}
          value={form.name}
        >
          <AppInputText
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            className="w-full"
          />
        </FormField>
        <FormField
          label={t("common.rut")}
          error={fieldErrors?.rut?.[0]}
          readOnly={readOnly}
          value={form.rut}
        >
          <AppInputText
            value={form.rut}
            onChange={(e) => set("rut", e.target.value)}
            className="w-full"
          />
        </FormField>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label={t("common.email")}
          error={fieldErrors?.email?.[0]}
          readOnly={readOnly}
          value={form.email}
        >
          <AppInputText
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            className="w-full"
          />
        </FormField>

        <FormField label={t("common.phone")} readOnly={readOnly} value={form.phone}>
          <AppInputText
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
            className="w-full"
          />
        </FormField>

        {mode === "create" && (
          <FormField
            label={t("common.password")}
            error={fieldErrors?.password?.[0]}
          >
            <AppPassword
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              className="w-full"
              inputClassName="w-full"
            />
          </FormField>
        )}
        
      </div>
    </>
  );
}
