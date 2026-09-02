import { useTranslation } from "react-i18next";
import { FormPhotoRow, FormSection, type FieldComponent } from "@shared/ui";
import type { useEntityPhoto } from "@shared/hooks";
import type { RedatorFormFields } from "../../hooks/useRedatorForm";
import { RedatorIdentityFields } from "./RedatorIdentityFields";

/** Seção de usuário do `RedatorDialog`: foto e campos de identificação.
 * `useEntityPhoto` fica no pai — `photo.pending` alimenta `disabled` e
 * `closeBlocked` do `CrudDialog` — e este componente recebe o objeto `photo`
 * inteiro por prop (D4). `readOnly` continua explícito: é o `FormPhotoRow`
 * quem o consome, não o `Field` — o `Field` já chega ligado ao form. */
export function RedatorUserSection({
  form,
  Field,
  readOnly,
  photo,
}: {
  form: RedatorFormFields;
  Field: FieldComponent<RedatorFormFields>;
  readOnly: boolean;
  photo: ReturnType<typeof useEntityPhoto>;
}) {
  const { t } = useTranslation();

  return (
    <>
      <FormSection title={t("redator.sectionUser")} />

      <FormPhotoRow name={form.name} photo={photo} readOnly={readOnly}>
        <RedatorIdentityFields Field={Field} form={form} />
      </FormPhotoRow>
    </>
  );
}
