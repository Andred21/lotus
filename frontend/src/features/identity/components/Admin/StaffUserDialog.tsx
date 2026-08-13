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
  const {
    form,
    set,
    readOnly,
    submit,
    pending,
    busy,
    photo,
    fieldErrors,
    generalError,
    errorSummary,
  } = useStaffUserForm(user, mode, onHide);
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
          <StaffIdentityFields
            form={form}
            set={set}
            readOnly={readOnly}
            fieldErrors={fieldErrors}
            mode={mode}
          />
        </FormPhotoRow>
        <div className="grid gap-4 sm:grid-cols-3 mt-10">
          {/* type é sempre 'admin' para staff — atributo fixo, não editável.
              Tag em vez de input desabilitado: sinaliza "valor imutável", não
              "campo editável acinzentado". */}
          <FormField label={t("admin.type")}>
            <AppTag
              value={t("admin.typeAdmin")}
              severity="info"
              className="mt-2 w-1/2"
            />
          </FormField>
          <FormField
            label={t("admin.role")}
            error={fieldErrors?.role?.[0]}
            readOnly={readOnly}
            value={roleOptions.find((o) => o.value === form.role)?.label ?? form.role}
          >
            <AppDropdown
              value={form.role}
              options={roleOptions}
              optionLabel="label"
              optionValue="value"
              onChange={(e) => set("role", e.value)}
            />
          </FormField>
          <FormField
            label={t("admin.state")}
            readOnly={readOnly}
            value={form.is_active ? t("common.active") : t("common.inactive")}
          >
            <AppDropdown
              value={form.is_active}
              options={stateOptions}
              optionLabel="label"
              optionValue="value"
              onChange={(e) => set("is_active", e.value)}
            />
          </FormField>
        </div>
      </section>
    </CrudDialog>
  );
}
