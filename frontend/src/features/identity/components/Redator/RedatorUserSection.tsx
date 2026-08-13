import { useTranslation } from "react-i18next";
import { AppPhotoField, FormSection } from "@shared/ui";
import type { useEntityPhoto } from "@shared/hooks";
import type { RedatorFormFields } from "../../hooks/useRedatorForm";
import { RedatorIdentityFields } from "./RedatorIdentityFields";

/** Seção de usuário do `RedatorDialog`: foto e campos de identificação.
 * `useEntityPhoto` fica no pai — `photo.pending` alimenta `disabled` e
 * `closeBlocked` do `CrudDialog` — e este componente recebe o objeto `photo`
 * inteiro por prop (D4). */
export function RedatorUserSection({
  form,
  set,
  readOnly,
  fieldErrors,
  photo,
}: {
  form: RedatorFormFields;
  set: <K extends keyof RedatorFormFields>(key: K, value: RedatorFormFields[K]) => void;
  readOnly: boolean;
  fieldErrors?: Record<string, string[]> | null;
  photo: ReturnType<typeof useEntityPhoto>;
}) {
  const { t } = useTranslation();

  return (
    <>
      <FormSection title={t("redator.sectionUser")} />

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
          <RedatorIdentityFields
            form={form}
            set={set}
            readOnly={readOnly}
            fieldErrors={fieldErrors}
          />
        </div>
      </div>
    </>
  );
}
