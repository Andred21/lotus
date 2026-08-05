import { useTranslation } from "react-i18next";
import {
  CrudDialog,
  FormSection,
  FormErrorSummary,
  FormErrorBanner,
  AppPhotoField,
} from "@shared/ui";
import type { ClientData } from "@shared/types/generated";
import { clientsApi } from "@shared/api/clientsApi";
import { useEntityPhoto } from "@shared/hooks";
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
  const photo = useEntityPhoto({
    resource: "clients",
    id: mode === "create" ? null : (client?.id ?? null),
    mode,
    url: client?.photo_url,
    invalidateKey: clientsApi.keys.all,
  });

  const {
    form,
    set,
    readOnly,
    submit,
    pending,
    fieldErrors,
    generalError,
    errorSummary,
    addr,
    setAddr,
    patchContact,
    setPrimaryContact,
    addContact,
    removeContact,
  } = useClientForm(client, mode, onHide, (created) =>
    photo.flush(created.id as number),
  );

  return (
    <CrudDialog
      visible={visible}
      mode={mode}
      title={mode === "create" ? t("client.new") : form.legal_name || form.name}
      onHide={onHide}
      onEdit={onEdit}
      onSubmit={submit}
      pending={pending}
      closeBlocked={pending || photo.pending}
      disabled={photo.pending}
      submitLabel={mode === "create" ? t("client.create") : undefined}
    >
      <FormErrorBanner message={generalError} />
      <FormErrorSummary errors={fieldErrors} {...errorSummary} />
      {photo.hasBufferedFailure && (
        <FormErrorBanner message={t("photo.createUploadFailed")} />
      )}
      <section className="space-y-4 ">
        <FormSection title={t("client.sectionGeneral")} />

        <div className="flex flex-col lg:flex-row justify-between">
          <div className="flex flex-col sm:justify-center py-10 gap-4 lg:w-3/5 w-full">
            <AppPhotoField
              name={form.legal_name}
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
            <ClientGeneralFields
              form={form}
              readOnly={readOnly}
              fieldErrors={fieldErrors}
              onChange={set}
            />
          </div>
        </div>

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
