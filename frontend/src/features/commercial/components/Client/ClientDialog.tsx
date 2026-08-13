import { useTranslation } from "react-i18next";
import {
  CrudDialog,
  FormSection,
  FormErrorSummary,
  FormErrorBanner,
  FormPhotoRow,
} from "@shared/ui";
import type { ClientData } from "@shared/types/generated";
import {
  useClientForm,
  type ClientDialogMode,
} from "../../hooks/useClientForm";
import { AddressFields } from "./AddressFields";
import { ContactFields } from "./ContactFields";
import { ClientGeneralFields } from "./ClientGeneralFields";

export function ClientDialog({
  visible,
  mode,
  client,
  onHide,
  onEdit,
}: {
  visible: boolean;
  mode: ClientDialogMode;
  client: ClientData | null;
  onHide: () => void;
  onEdit?: () => void;
}) {
  const { t } = useTranslation();
  const {
    form,
    set,
    readOnly,
    submit,
    pending,
    busy,
    photo,
    fieldErrors,
    generalError,
    errorSummary,
    addr,
    setAddr,
    patchContact,
    setPrimaryContact,
    addContact,
    removeContact,
  } = useClientForm(client, mode, onHide);

  return (
    <CrudDialog
      visible={visible}
      mode={mode}
      title={mode === "create" ? t("client.new") : form.legal_name || form.name}
      onHide={onHide}
      onEdit={onEdit}
      onSubmit={submit}
      pending={pending}
      closeBlocked={busy}
      disabled={busy}
      submitLabel={mode === "create" ? t("client.create") : undefined}
    >
      <FormErrorBanner message={generalError} />
      <FormErrorSummary errors={fieldErrors} {...errorSummary} />
      {photo.hasBufferedFailure && (
        <FormErrorBanner message={t("photo.createUploadFailed")} />
      )}
      <section className="space-y-4 ">
        <FormSection title={t("client.sectionGeneral")} />

        <FormPhotoRow name={form.legal_name} photo={photo} readOnly={readOnly}>
          <ClientGeneralFields
            form={form}
            readOnly={readOnly}
            fieldErrors={fieldErrors}
            onChange={set}
          />
        </FormPhotoRow>

        <FormSection title={t("client.sectionAddress")} spaced />
        <AddressFields value={addr} readOnly={readOnly} onChange={setAddr} />

        <FormSection title={t("client.sectionContacts")} spaced />
        <ContactFields
          contacts={form.contacts}
          readOnly={readOnly}
          fieldErrors={fieldErrors}
          onPatch={patchContact}
          onSetPrimary={setPrimaryContact}
          onAdd={addContact}
          onRemove={removeContact}
        />
      </section>
    </CrudDialog>
  );
}
