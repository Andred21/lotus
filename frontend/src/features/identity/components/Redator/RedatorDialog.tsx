import { useTranslation } from "react-i18next";
import {
  CrudDialog,
  AppTag,
  FormSection,
  FormErrorBanner,
  FormErrorSummary,
} from "@shared/ui";
import type { RedatorData } from "@shared/types/generated";
import { redatoresApi } from "@shared/api/redatoresApi";
import { useEntityPhoto } from "@shared/hooks";
import {
  useRedatorForm,
  type RedatorDialogMode,
} from "../../hooks/useRedatorForm";
import { idoneidade, IDONEIDADE_SEVERITY } from "@shared/lib";
import { RedatorCourseSelector } from "./RedatorCourseSelector";
import { RedatorDocumentsSection } from "./RedatorDocumentsSection";
import { RedatorUserSection } from "./RedatorUserSection";

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
  const courseIds = form.course_ids;

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

      <FormErrorSummary
        errors={fieldErrors}
        // `useRedatorForm` não roda sobre `useCrudForm` (decisão do BD-5), então
        // não há `errorSummary` a espalhar: a lista é literal, no estilo do
        // CourseDialog/QuoteWizard. Só name, rut e email têm `error=` no campo;
        // phone, course_ids e documents[<tipo>] caem aqui.
        mapped={['name', 'rut', 'email']}
      />

      {photo.hasBufferedFailure && (
        <FormErrorBanner message={t("photo.createUploadFailed")} />
      )}

      <section className="space-y-4">
        <RedatorUserSection
          form={form}
          set={set}
          readOnly={readOnly}
          fieldErrors={fieldErrors}
          photo={photo}
        />

        <RedatorDocumentsSection
          mode={mode}
          redator={redator}
          stagedDocs={stagedDocs}
          stageDoc={stageDoc}
          unstageDoc={unstageDoc}
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
