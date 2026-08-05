import { useTranslation } from "react-i18next";
import {
  CrudDialog,
  AppButton,
  AppInputText,
  AppDropdown,
  AppTag,
  AppDataTable,
  AppColumn,
  AppSkeleton,
  AppErrorState,
  FormField,
  FormSection,
  FormErrorBanner,
  AppPhotoField,
} from "@shared/ui";
import type {
  StudentData,
  StudentTurmaData,
  StudentClientLogData,
} from "@shared/types/generated";
import type { DialogMode } from "@shared/lib";
import {
  enrollmentStatusLabelKey,
  enrollmentStatusSeverity,
  formatMonthYear,
} from "@shared/lib";
import { studentsApi } from "@shared/api/studentsApi";
import { useEntityPhoto } from "@shared/hooks";
import { useStudentDetail } from "../../api/useStudentDetail";
import { useStudentForm } from "../../hooks/useStudentForm";
import { useStudentClients } from "../../hooks/useStudentClients";
import { StudentIdentityFields } from "./StudentIdentifyFields";

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
  const { form, set, readOnly, submit, pending, fieldErrors, generalError } =
    useStudentForm(student, mode, onHide, (created) =>
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

        <FormField
          label={t("student.client")}
          error={fieldErrors?.client_id?.[0]}
        >
          {mode === "create" ? (
            <>
              <AppDropdown
                value={form.client_id}
                disabled={clientsUnusable}
                options={clients.options}
                onChange={(e) => set("client_id", e.value as number)}
                className="w-full"
              />
              {clients.isError && (
                <p
                  className="mt-1 flex items-center justify-between gap-2 text-xs"
                  style={{
                    color:
                      "color-mix(in srgb, var(--red-500) 70%, var(--text-color))",
                  }}
                >
                  <span>
                    {clients.errorDetail ?? t("common.loadErrorHint")}
                  </span>
                  <AppButton
                    label={t("common.retry")}
                    text
                    onClick={clients.refetch}
                  />
                </p>
              )}
              {clients.showEmptyHint && (
                <p
                  className="mt-1 flex items-center justify-between gap-2 text-xs"
                  style={{ color: "var(--text-color-secondary)" }}
                >
                  <span>{t("student.noClientsAvailable")}</span>
                  <AppButton
                    label={t("common.retry")}
                    text
                    onClick={clients.refetch}
                  />
                </p>
              )}
            </>
          ) : (
            <AppInputText
              value={student?.current_client_name ?? t("student.noClient")}
              disabled
              className="w-full"
            />
          )}
          {mode === "edit" && (
            <p
              className="mt-1 text-xs"
              style={{ color: "var(--text-color-secondary)" }}
            >
              {t("student.clientLocked")}
            </p>
          )}
        </FormField>

        {mode === "view" &&
          (detail.isError ? (
            /* O erro cobre as DUAS seções, não só a primeira. Mostrar o
             AppErrorState nos vínculos e deixar "Historial de turmas" com o
             cabeçalho e nada abaixo faz a falha de rede se parecer com "este
             aluno não tem turma" — vazio silencioso proibido (D16), e aqui o
             dado tem peso legal. */
            <AppErrorState
              title={t("common.loadError")}
              detail={detail.error?.detail ?? t("common.loadErrorHint")}
              retryLabel={t("common.retry")}
              onRetry={() => void detail.refetch()}
            />
          ) : (
            <>
              <FormSection title={t("student.sectionLinks")} spaced />

              {detail.isLoading && <AppSkeleton height="4rem" />}
              {detail.data &&
                (detail.data.links.length === 0 ? (
                  <p
                    className="text-sm"
                    style={{ color: "var(--text-color-secondary)" }}
                  >
                    {t("student.noLinks")}
                  </p>
                ) : (
                  <ul className="sp">
                    {detail.data.links.map((link: StudentClientLogData) => (
                      <li
                        key={link.id}
                        className="flex items-center justify-between rounded border p-3 "
                        style={{ borderColor: "var(--surface-border)" }}
                      >
                        <span className="text-sm font-medium ">
                          {link.client_name}
                        </span>
                        <span
                          className="flex items-center gap-3 text-xs"
                          style={{ color: "var(--text-color-secondary)" }}
                        >
                          {link.ended_on === null && (
                            <AppTag
                              value={t("student.linkCurrent")}
                              severity="info"
                            />
                          )}
                          {link.ended_on === null
                            ? t("student.linkSince", {
                                date: formatMonthYear(link.started_on),
                              })
                            : t("student.linkRange", {
                                from: formatMonthYear(link.started_on),
                                to: formatMonthYear(link.ended_on),
                              })}
                        </span>
                      </li>
                    ))}
                  </ul>
                ))}

              <FormSection title={t("student.sectionTurmas")} spaced />
              {detail.isLoading && <AppSkeleton height="6rem" />}
              {detail.data && (
                <AppDataTable
                  value={detail.data.turmas}
                  emptyMessage={t("student.noTurmas")}
                >
                  <AppColumn
                    header={t("student.turmaCode")}
                    body={(turma: StudentTurmaData) => (
                      <span
                        className="font-bold text-sm"
                        style={{ color: "var(--primary-color)" }}
                      >
                        {turma.quote_code}
                      </span>
                    )}
                  />
                  <AppColumn
                    header={t("student.turmaCourse")}
                    body={(turma: StudentTurmaData) => turma.course_name}
                  />
                  <AppColumn
                    header={t("student.turmaDate")}
                    body={(turma: StudentTurmaData) =>
                      formatMonthYear(turma.start_date)
                    }
                  />
                  <AppColumn
                    header={t("student.turmaStatus")}
                    body={(turma: StudentTurmaData) => (
                      <AppTag
                        value={t(
                          enrollmentStatusLabelKey(turma.approval_status),
                        )}
                        severity={enrollmentStatusSeverity(
                          turma.approval_status,
                        )}
                      />
                    )}
                  />
                </AppDataTable>
              )}
            </>
          ))}
      </section>
    </CrudDialog>
  );
}
