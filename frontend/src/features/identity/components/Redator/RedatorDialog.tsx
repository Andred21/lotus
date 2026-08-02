import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CrudDialog,
  AppTag,
  AppFilePreviewDialog,
  FormSection,
  FormErrorBanner,
  AppPhotoField,
} from "@shared/ui";
import type { FileUploadHandlerEvent } from "@shared/ui";
import type { RedatorData, RedatorDocumentData } from "@shared/types/generated";
import { redatoresApi } from "@shared/api/redatoresApi";
import { useEntityPhoto, useFilePreview } from "@shared/hooks";
import {
  useUploadDocument,
  useRemoveDocument,
} from "../../api/useRedatorDocuments";
import {
  useRedatorForm,
  type RedatorDialogMode,
} from "../../hooks/useRedatorForm";
import { DOC_TYPES, idoneidade, IDONEIDADE_SEVERITY, type DocType } from "@shared/lib";
import { RedatorIdentityFields } from "./RedatorIdentityFields";
import { RedatorCourseSelector } from "./RedatorCourseSelector";
import { RedatorDocumentSlot } from "./RedatorDocumentSlot";

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
  const upload = useUploadDocument();
  const removeDoc = useRemoveDocument();
  const preview = useFilePreview<RedatorDocumentData>();
  const [sizeError, setSizeError] = useState<string | null>(null);

  // Documentos vêm da entidade viva (derivada da lista), não do estado do form:
  // são geridos por mutações próprias e devem refletir o servidor na hora.
  const existing = redator?.documents ?? [];
  const courseIds = form.course_ids;
  // Só há exclusão quando o redator já existe: sem id não há endpoint aninhado.
  // A ausência do callback é o que desliga a lixeira (mesmo contrato do
  // `AppFileActions.onRemove`) — assim o id chega ao `mutate` estreitado pelo
  // compilador, sem asserção.
  const redatorId = redator?.id;

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
            severity={IDONEIDADE_SEVERITY[idoneidade(redator)]}
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
        {DOC_TYPES.map((type) => (
          <RedatorDocumentSlot
            key={type}
            type={type}
            mode={mode}
            doc={existing.find((d) => d.type === type)}
            staged={stagedDocs[type]}
            uploading={upload.isPending && upload.variables?.type === type}
            onStage={handleStage}
            onUnstage={unstageDoc}
            onUpload={handleUpload}
            onRemoveDoc={
              redatorId != null
                ? (fileId) => removeDoc.mutate({ redatorId, fileId })
                : undefined
            }
            onPreview={preview.open}
            onSizeReject={setSizeError}
          />
        ))}
        <AppFilePreviewDialog
          file={preview.file}
          visible={preview.visible}
          onHide={preview.close}
        />

        <FormSection title={t("redator.sectionCourses")} spaced />

        <RedatorCourseSelector
          courseIds={courseIds}
          readOnly={readOnly}
          onToggle={toggleCourse}
          orderKey={`${redator?.id ?? "new"}:${mode}`}
        />
      </section>
    </CrudDialog>
  );
}
