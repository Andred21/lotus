import { useTranslation } from "react-i18next";
import {
  CrudDialog,
  FormSection,
  FormErrorBanner,
  FormErrorSummary,
  FormPhotoRow,
  useFormField,
} from "@shared/ui";
import type { StudentData } from "@shared/types/generated";
import type { DialogMode } from "@shared/lib";
import { useStudentDetail } from "../../api/useStudentDetail";
import { useStudentForm } from "../../hooks/useStudentForm";
import { useStudentClients } from "../../hooks/useStudentClients";
import { StudentIdentityFields } from "./StudentIdentifyFields";
import { StudentClientField } from "./StudentClientField";
import { StudentDetailSections } from "./StudentDetailSections";

export function StudentDialog({
  visible,
  mode,
  student,
  onHide,
  onEdit,
}: {
  visible: boolean;
  mode: DialogMode;
  student: StudentData | null;
  onHide: () => void;
  onEdit?: () => void;
}) {
  const { t } = useTranslation();
  const f = useStudentForm(student, mode, onHide);
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
  const clients = useStudentClients(mode);
  const clientsUnusable = clients.unusable;
  const detail = useStudentDetail(mode === "create" ? null : student?.id);

  return (
    <CrudDialog
      visible={visible}
      mode={mode}
      title={mode === "create" ? t("student.new") : form.name}
      onHide={onHide}
      onEdit={onEdit}
      onSubmit={submit}
      pending={pending}
      disabled={clientsUnusable || busy}
      closeBlocked={busy}
      submitLabel={mode === "create" ? t("student.create") : undefined}
    >
      <FormErrorBanner message={generalError} />
      <FormErrorSummary errors={fieldErrors} {...errorSummary} />
      {photo.hasBufferedFailure && (
        <FormErrorBanner message={t("photo.createUploadFailed")} />
      )}

      <section className="space-y-4">
        <FormSection title={t("student.sectionPersonal")} />

        <FormPhotoRow name={form.name} photo={photo} readOnly={readOnly}>
          <StudentIdentityFields Field={campo.Field} />
        </FormPhotoRow>

        <StudentClientField
          mode={mode}
          Field={campo.Field}
          readOnlyLabel={student?.current_client_name ?? t("student.noClient")}
          options={clients.options}
          isLoading={clients.isLoading}
          isError={clients.isError}
          errorDetail={clients.errorDetail}
          errorHint={clients.errorHint}
          isEmpty={clients.isEmpty}
          unusable={clientsUnusable}
          refetch={clients.refetch}
        />

        {mode === "view" && <StudentDetailSections detail={detail} />}
      </section>
    </CrudDialog>
  );
}
