import { useTranslation } from "react-i18next";
import { FormPhotoRow, FormSection } from "@shared/ui";
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

      <FormPhotoRow name={form.name} photo={photo} readOnly={readOnly}>
        <RedatorIdentityFields
          form={form}
          set={set}
          readOnly={readOnly}
          fieldErrors={fieldErrors}
        />
      </FormPhotoRow>
    </>
  );
}
