import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CrudDialog,
  AppButton,
  AppTag,
  AppFileUpload,
  AppFilePreviewDialog,
  AppFileRow,
  FormSection,
  FormErrorBanner,
  AppPhotoField,
  AppErrorState,
  AppSkeleton,
} from "@shared/ui";
import type { FileUploadHandlerEvent } from "@shared/ui";
import type { RedatorData, RedatorDocumentData } from "@shared/types/generated";
import { coursesApi } from "@shared/api/coursesApi";
import { redatoresApi } from "@shared/api/redatoresApi";
import { useEntityPhoto } from "@shared/hooks";
import {
  useUploadDocument,
  useRemoveDocument,
} from "../../api/useRedatorDocuments";
import {
  useRedatorForm,
  type RedatorDialogMode,
} from "../../hooks/useRedatorForm";
import { useEnabledFirstCourses } from "../../hooks/useEnabledFirstCourses";
import { docStatus, idoneidade, type DocStatus, type DocType } from "@shared/lib";
import { CourseCard } from "./CourseCard";
import { RedatorIdentityFields } from "./RedatorIdentityFields";

const DOC_TYPES = ["CV", "REUF", "TITULO", "POSTGRADO"] as const;

const STATUS_SEVERITY: Record<DocStatus, "success" | "warning" | "danger"> = {
  sin_venc: "success",
  vigente: "success",
  por_vencer: "warning",
  vencido: "danger",
};

export function RedatorDialog({
  visible,
  mode,
  redator,
  onHide,
  onEdit,
}: {
  visible: boolean;
  mode: RedatorDialogMode;
  redator: RedatorData | null;
  onHide: () => void;
  /** Presente só em `view`: alterna para `edit` (botão "Editar datos"). */
  onEdit?: () => void;
}) {
  const { t } = useTranslation();
  const photo = useEntityPhoto({
    resource: "redatores",
    id: mode === "create" ? null : (redator?.id ?? null),
    mode,
    url: redator?.photo_url,
    invalidateKey: redatoresApi.keys.all,
  });

  const {
    form,
    set,
    toggleCourse,
    readOnly,
    submit,
    pending,
    stagedDocs,
    stageDoc,
    unstageDoc,
    fieldErrors,
    generalError,
  } = useRedatorForm(redator, mode, onHide, (created) =>
    photo.flush(created.id as number),
  );
  const courses = coursesApi.useList();
  const upload = useUploadDocument();
  const removeDoc = useRemoveDocument();
  const [preview, setPreview] = useState<RedatorDocumentData | null>(null);
  const [sizeError, setSizeError] = useState<string | null>(null);

  // Documentos vêm da entidade viva (derivada da lista), não do estado do form:
  // são geridos por mutações próprias e devem refletir o servidor na hora.
  const existing = redator?.documents ?? [];
  const courseIds = form.course_ids;

  // Em leitura só os habilitados; em seleção todos, com os habilitados primeiro
  // e a ordem congelada na abertura (spec D9).
  const allCourses = courses.data ?? [];
  const enabledCourses = allCourses.filter((c) =>
    courseIds.includes(c.id as number),
  );
  const orderedCourses = useEnabledFirstCourses(
    allCourses,
    courseIds,
    `${redator?.id ?? "new"}:${mode}`,
  );

  function handleUpload(type: DocType, e: FileUploadHandlerEvent) {
    setSizeError(null);
    const file = e.files[0];
    if (file && redator?.id) {
      upload.mutate({ redatorId: redator.id, type, file });
    }
    e.options.clear();
  }

  function handleStage(type: DocType, e: FileUploadHandlerEvent) {
    setSizeError(null);
    const file = e.files[0];
    if (file) stageDoc(type, file);
    e.options.clear();
  }

  return (
    <CrudDialog
      visible={visible}
      mode={mode}
      title={mode === "create" ? t("redator.new") : form.name}
      onHide={onHide}
      onEdit={onEdit}
      onSubmit={submit}
      pending={pending}
      closeBlocked={pending || photo.pending}
      disabled={photo.pending}
      submitLabel={mode === "create" ? t("redator.create") : undefined}
      headerExtra={
        mode !== "create" && redator ? (
          <AppTag
            value={`${t("redator.suitability")}: ${t(`suitability.${idoneidade(redator)}`)}`}
            severity={
              idoneidade(redator) === "idoneo"
                ? "success"
                : idoneidade(redator) === "por_vencer"
                  ? "warning"
                  : "danger"
            }
          />
        ) : null
      }
    >
      <FormErrorBanner message={generalError} />

      {photo.hasBufferedFailure && (
        <FormErrorBanner message={t("photo.createUploadFailed")} />
      )}

      <section className="space-y-4">
        <FormSection title={t("redator.sectionUser")} />

        <div className="flex justify-center">
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
        <RedatorIdentityFields
          form={form}
          set={set}
          readOnly={readOnly}
          fieldErrors={fieldErrors}
        />

        <FormSection title={t("redator.sectionDocuments")} spaced />
        {upload.error && (
          <p className="text-sm text-red-600">{upload.error.detail}</p>
        )}
        {sizeError && <p className="text-sm text-red-600">{sizeError}</p>}
        {DOC_TYPES.map((type) => {
          const doc = existing.find((d) => d.type === type);
          const staged = stagedDocs[type];
          const st = doc ? docStatus(doc.valid_until) : null;
          return (
            <div
              key={type}
              className="rounded border border-slate-200 p-2 dark:border-slate-700"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">
                  {t(`documentType.${type}`)}
                </p>
                {mode !== "create" && st && (
                  <AppTag
                    value={t(`documentStatus.${st}`)}
                    severity={STATUS_SEVERITY[st]}
                  />
                )}
              </div>

              {/* create: arquivo fica só no estado local até o submit (multipart único).
                  `staged` é um File puro (sem download_url ainda), então não há o que
                  pré-visualizar — mesmo comportamento de antes, só a linha ganhou AppFileRow. */}
              {mode === "create" &&
                (staged ? (
                  <div className="mt-2">
                    <AppFileRow
                      name={staged.name}
                      mime={staged.type}
                      size={staged.size}
                      actions={
                        <AppButton
                          icon="pi pi-times"
                          text
                          rounded
                          severity="danger"
                          onClick={() => unstageDoc(type)}
                        />
                      }
                    />
                  </div>
                ) : (
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <p className="text-xs text-slate-500">
                      {t("common.notLoaded")}
                    </p>
                    <AppFileUpload
                      chooseOptions={{
                        icon: "pi pi-upload",
                        className: "p-button-text p-button-rounded",
                      }}
                      chooseLabel=""
                      onSizeReject={setSizeError}
                      uploadHandler={(e) => handleStage(type, e)}
                    />
                  </div>
                ))}

              {/* view: só status + ver/baixar, documento é imutável */}
              {mode === "view" &&
                (doc ? (
                  <div className="mt-2">
                    <AppFileRow
                      name={doc.original_name}
                      mime={doc.mime}
                      size={doc.size}
                      createdAt={doc.created_at}
                      actions={
                        <>
                          <AppButton
                            icon="pi pi-eye"
                            text
                            rounded
                            aria-label={t("common.preview")}
                            onClick={() => setPreview(doc)}
                          />
                          <a
                            href={doc.download_url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <AppButton icon="pi pi-download" text rounded />
                          </a>
                        </>
                      }
                    />
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-slate-500">
                    {t("common.notLoaded")}
                  </p>
                ))}

              {/* edit: ver + upload/substituição imediata via endpoint aninhado + exclusão */}
              {mode === "edit" &&
                (doc ? (
                  <div className="mt-2">
                    <AppFileRow
                      name={doc.original_name}
                      mime={doc.mime}
                      size={doc.size}
                      createdAt={doc.created_at}
                      actions={
                        <>
                          <AppButton
                            icon="pi pi-eye"
                            text
                            rounded
                            aria-label={t("common.preview")}
                            onClick={() => setPreview(doc)}
                          />
                          <a
                            href={doc.download_url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <AppButton icon="pi pi-download" text rounded />
                          </a>
                          <AppFileUpload
                            chooseOptions={{
                              icon: "pi pi-upload",
                              className: "p-button-text p-button-rounded",
                            }}
                            chooseLabel=""
                            disabled={
                              upload.isPending &&
                              upload.variables?.type === type
                            }
                            onSizeReject={setSizeError}
                            uploadHandler={(e) => handleUpload(type, e)}
                          />
                          {redator?.id && (
                            <AppButton
                              icon="pi pi-trash"
                              text
                              rounded
                              severity="danger"
                              onClick={() =>
                                removeDoc.mutate({
                                  redatorId: redator.id!,
                                  fileId: doc.id,
                                })
                              }
                            />
                          )}
                        </>
                      }
                    />
                  </div>
                ) : (
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <p className="text-xs text-slate-500">
                      {t("common.notLoaded")}
                    </p>
                    <AppFileUpload
                      chooseOptions={{
                        icon: "pi pi-upload",
                        className: "p-button-text p-button-rounded",
                      }}
                      chooseLabel=""
                      disabled={
                        upload.isPending && upload.variables?.type === type
                      }
                      onSizeReject={setSizeError}
                      uploadHandler={(e) => handleUpload(type, e)}
                    />
                  </div>
                ))}
            </div>
          );
        })}
        <AppFilePreviewDialog
          file={preview}
          visible={preview !== null}
          onHide={() => setPreview(null)}
        />

        <FormSection title={t("redator.sectionCourses")} spaced />

        {/* Mesmos três estados do lado do curso (spec D11): `?? []` fazia falha
            de GET virar "sem cursos habilitados". */}
        {courses.isLoading ? (
          <div className="grid gap-2 sm:grid-cols-2" aria-busy="true">
            <AppSkeleton height="3.5rem" />
            <AppSkeleton height="3.5rem" />
          </div>
        ) : courses.isError ? (
          <AppErrorState
            title={t("common.loadError")}
            detail={courses.error?.detail ?? t("common.loadErrorHint")}
            retryLabel={t("common.retry")}
            onRetry={() => {
              void courses.refetch();
            }}
          />
        ) : allCourses.length === 0 ? (
          <p
            className="text-sm"
            style={{ color: "var(--text-color-secondary)" }}
          >
            {t("course.empty")}
          </p>
        ) : readOnly ? (
          enabledCourses.length === 0 ? (
            <p
              className="text-sm"
              style={{ color: "var(--text-color-secondary)" }}
            >
              {t("redator.noCourses")}
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {enabledCourses.map((c) => (
                <CourseCard key={c.id} course={c} />
              ))}
            </div>
          )
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {orderedCourses.map((c) => (
              <CourseCard
                key={c.id}
                course={c}
                selected={courseIds.includes(c.id as number)}
                onToggle={() => toggleCourse(c.id as number)}
              />
            ))}
          </div>
        )}
      </section>
    </CrudDialog>
  );
}
