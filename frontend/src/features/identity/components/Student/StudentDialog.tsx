import { useTranslation } from "react-i18next";
import {
  CrudDialog,
  FormSection,
  FormErrorBanner,
  FormErrorSummary,
  AppPhotoField,
} from "@shared/ui";
import type { StudentData } from "@shared/types/generated";
import type { DialogMode } from "@shared/lib";
import { studentsApi } from "@shared/api/studentsApi";
import { useEntityPhoto } from "@shared/hooks";
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
  const photo = useEntityPhoto({
    resource: "students",
    id: mode === "create" ? null : (student?.id ?? null),
    mode,
    url: student?.photo_url,
    invalidateKey: studentsApi.keys.all,
  });

  // `flush` sobe a foto bufferizada com o id recém-criado. Não lança: a
  // entidade já existe, e fechar o diálogo aqui esconderia a falha (D11).
  const {
    form,
    set,
    readOnly,
    submit,
    pending,
    fieldErrors,
    generalError,
    errorSummary,
  } = useStudentForm(student, mode, onHide, (created) =>
    photo.flush(created.id as number),
  );
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
      disabled={clientsUnusable || photo.pending}
      closeBlocked={pending || photo.pending}
      submitLabel={mode === "create" ? t("student.create") : undefined}
    >
      <FormErrorBanner message={generalError} />
      <FormErrorSummary errors={fieldErrors} {...errorSummary} />
      {photo.hasBufferedFailure && (
        <FormErrorBanner message={t("photo.createUploadFailed")} />
      )}

      <section className="space-y-4">
        <FormSection title={t("student.sectionPersonal")} />

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
            <StudentIdentityFields
              form={form}
              set={set}
              readOnly={readOnly}
              fieldErrors={fieldErrors}
            />
          </div>
        </div>

        <StudentClientField
          mode={mode}
          value={form.client_id}
          readOnlyLabel={student?.current_client_name ?? t("student.noClient")}
          error={fieldErrors?.client_id?.[0]}
          // `ClientData.id` é `undefined | number` no DTO gerado (molde de
          // create/edit); um cliente vindo da listagem sempre tem id
          // persistido — mesmo cast de `x.id as number` usado no resto do
          // código (ex.: StaffUserDialog, RedatorDialog).
          options={clients.options as { label: string; value: number }[]}
          isError={clients.isError}
          errorDetail={clients.errorDetail}
          showEmptyHint={clients.showEmptyHint}
          unusable={clientsUnusable}
          refetch={clients.refetch}
          onChange={(id) => set("client_id", id)}
        />

        {mode === "view" && <StudentDetailSections detail={detail} />}
      </section>
    </CrudDialog>
  );
}
