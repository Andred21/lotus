import { useTranslation } from "react-i18next";
import { AppInputText, AppPassword, PhoneInput, RutInput, type FieldComponent } from "@shared/ui";
import { formatPhoneDisplay } from "@shared/lib";
import type { StaffUserFormFields } from "../../hooks/useStaffUserForm";

/** Os quatro campos de identificação do aluno, no grid 2×2 de sempre.
 *
 * Não é um `PersonFields` genérico de propósito: os grids de Redator, Aluno e
 * Staff divergem (o aluno tem nome em linha inteira e empresa ao lado do
 * telefone), e unificá-los mudaria o que três telas renderizam. */
export function StaffIdentityFields({
  Field,
  form,
  mode,
}: {
  Field: FieldComponent<StaffUserFormFields>;
  form: StaffUserFormFields;
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
          <RutInput className="w-full" />
        </Field>
        {/* Email e telefone em linha inteira, em qualquer largura: ao lado da
            coluna da foto, meia linha deixava 116px para o número a 1440px
            (pedido do João, bloco 60). */}
        <Field name="email" label={t("common.email")}>
          <AppInputText className="w-full" />
        </Field>

        <Field name="phone" label={t("common.phone")} value={formatPhoneDisplay(form.phone)}>
          <PhoneInput />
        </Field>
      </div>
      {mode === "create" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="password" label={t("common.password")}>
            <AppPassword className="w-full" inputClassName="w-full" />
          </Field>
        </div>
      )}
    </>
  );
}
