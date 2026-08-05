import { useTranslation } from "react-i18next";
import {
  CrudDialog,
  AppDropdown,
  FormField,
  FormSection,
  FormErrorSummary,
  FormErrorBanner,
  AppPhotoField,
  AppTag,
} from "@shared/ui";
import type { UserData } from "@shared/types/generated";
import type { DialogMode } from "@shared/lib";
import { usersApi } from "@shared/api/usersApi";
import { useEntityPhoto } from "@shared/hooks";
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
  const photo = useEntityPhoto({
    resource: "users",
    id: mode === "create" ? null : (user?.id ?? null),
    mode,
    url: user?.photo_url,
    invalidateKey: usersApi.keys.all,
  });

  const {
    form,
    set,
    readOnly,
    submit,
    pending,
    fieldErrors,
    generalError,
    errorSummary,
  } = useStaffUserForm(user, mode, onHide, (created) =>
    photo.flush(created.id as number),
  );
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
      closeBlocked={pending || photo.pending}
      disabled={photo.pending}
      submitLabel={mode === "create" ? t("admin.create") : undefined}
    >
      <FormErrorBanner message={generalError} />
      <FormErrorSummary errors={fieldErrors} {...errorSummary} />
      {photo.hasBufferedFailure && (
        <FormErrorBanner message={t("photo.createUploadFailed")} />
      )}

      <section className="space-y-4">
        <FormSection title={t("admin.sectionUser")} />
        <div className="flex flex-col lg:flex-row justify-between">
          <div className="flex flex-col sm:justify-center py-10 gap-4 lg:w-3/5 w-full">
            <AppPhotoField
              name={form.name}
              url={photo.url}
              readOnly={readOnly}
              pending={photo.pending}
              error={photo.error}
              onSelect={photo.onSelect}
              onRemove={photo.onRemove}
              onSizeReject={photo.onSizeReject}
              onRetry={photo.onRetry}
            />
          </div>
          <div className="flex flex-col gap-4 w-full">
            <StaffIdentityFields
              form={form}
              set={set}
              readOnly={readOnly}
              fieldErrors={fieldErrors}
              mode={mode}
            />
          </div>
        </div>
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
          <FormField label={t("admin.role")} error={fieldErrors?.role?.[0]}>
            <AppDropdown
              value={form.role}
              options={roleOptions}
              optionLabel="label"
              optionValue="value"
              disabled={readOnly}
              onChange={(e) => set("role", e.value)}
            />
          </FormField>
          <FormField label={t("admin.state")}>
            <AppDropdown
              value={form.is_active}
              options={stateOptions}
              optionLabel="label"
              optionValue="value"
              disabled={readOnly}
              onChange={(e) => set("is_active", e.value)}
            />
          </FormField>
        </div>
      </section>
    </CrudDialog>
  );
}
