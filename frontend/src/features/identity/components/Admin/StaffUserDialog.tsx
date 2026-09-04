import { useTranslation } from "react-i18next";
import {
  CrudDialog,
  AppDropdown,
  FormField,
  FormSection,
  FormErrorSummary,
  FormErrorBanner,
  FormPhotoRow,
  AppTag,
  useFormField,
} from "@shared/ui";
import type { UserData } from "@shared/types/generated";
import type { DialogMode } from "@shared/lib";
import { useStaffUserForm } from "../../hooks/useStaffUserForm";
import { useStaffRoleOptions } from "../../hooks/useStaffRoleOptions";
import { StaffIdentityFields } from "./StaffIdentifyFields";

export function StaffUserDialog({
  visible,
  mode,
  user,
  canManage,
  onHide,
  onEdit,
}: {
  visible: boolean;
  mode: DialogMode;
  user: UserData | null;
  canManage: boolean;
  onHide: () => void;
  onEdit?: () => void;
}) {
  const { t } = useTranslation();
  const f = useStaffUserForm(user, mode, onHide);
  const {
    form,
    readOnly,
    submit,
    pending,
    busy,
    photo,
    fieldErrors,
    generalError,
    errorSummary,
  } = f;
  const campo = useFormField(f);
  const { roleOptions } = useStaffRoleOptions();

  const stateOptions = [
    { label: t("common.active"), value: true },
    { label: t("common.inactive"), value: false },
  ];

  return (
    <CrudDialog
      visible={visible}
      mode={mode}
      title={mode === "create" ? t("admin.new") : form.name}
      onHide={onHide}
      onEdit={canManage ? onEdit : undefined}
      onSubmit={submit}
      pending={pending}
      closeBlocked={busy}
      disabled={busy}
      submitLabel={mode === "create" ? t("admin.create") : undefined}
    >
      <FormErrorBanner message={generalError} />
      <FormErrorSummary errors={fieldErrors} {...errorSummary} />
      {photo.hasBufferedFailure && (
        <FormErrorBanner message={t("photo.createUploadFailed")} />
      )}

      <section className="space-y-4">
        <FormSection title={t("admin.sectionUser")} />
        <FormPhotoRow name={form.name} photo={photo} readOnly={readOnly}>
          <StaffIdentityFields Field={campo.Field} mode={mode} />
        </FormPhotoRow>
        <div className="grid gap-4 sm:grid-cols-3 mt-10">
          {/* type é sempre 'admin' para staff — atributo fixo, não editável.
              Tag em vez de input desabilitado: sinaliza "valor imutável", não
              "campo editável acinzentado".

              Entra por `readOnly`, e não por `children`: a pílula não é
              controle, e por `children` a label saía com `htmlFor` apontando
              para um id que nenhum elemento carrega — label morta, o caso que o
              próprio docblock do `FormField` descreve (P-37, medido no gate do
              BD-16). */}
          <FormField
            label={t("admin.type")}
            readOnly
            value={
              <AppTag
                value={t("admin.typeAdmin")}
                severity="info"
                className="mt-2 w-1/2"
              />
            }
          />
          <campo.Field
            name="role"
            label={t("admin.role")}
            value={roleOptions.find((o) => o.value === form.role)?.label ?? form.role}
          >
            <AppDropdown
              options={roleOptions}
              optionLabel="label"
              optionValue="value"
            />
          </campo.Field>
          <campo.Field
            name="is_active"
            label={t("admin.state")}
            value={form.is_active ? t("common.active") : t("common.inactive")}
          >
            <AppDropdown
              options={stateOptions}
              optionLabel="label"
              optionValue="value"
            />
          </campo.Field>
        </div>
      </section>
    </CrudDialog>
  );
}
