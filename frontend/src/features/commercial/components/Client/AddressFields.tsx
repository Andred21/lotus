import { useTranslation } from "react-i18next";
import { AppInputText, AppDropdown, FormField } from "@shared/ui";
import { CHILE_REGIONS } from "@shared/lib";
import type { ClientAddressData } from "@shared/types/generated";

/** Bloco de endereço do cliente. Só o 1º endereço é editável nesta tela; o
 * dono (ClientDialog via useClientForm) preserva os demais. */
export function AddressFields({
  value,
  readOnly,
  onChange,
}: {
  value: ClientAddressData;
  readOnly: boolean;
  onChange: (patch: Partial<ClientAddressData>) => void;
}) {
  const { t } = useTranslation();
  return (
    <>
      <div className="grid gap-4 lg:grid-cols-4">
        <FormField label={t("client.street")} readOnly={readOnly} value={value.line1 ?? ""}>
          <AppInputText
            value={value.line1 ?? ""}
            onChange={(e) => onChange({ line1: e.target.value })}
            className="w-full"
          />
        </FormField>

        <FormField label={t("client.number")} readOnly={readOnly} value={value.number ?? ""}>
          <AppInputText
            value={value.number ?? ""}
            onChange={(e) => onChange({ number: e.target.value })}
            className="w-full"
          />
        </FormField>

        <FormField label={t("client.complement")} readOnly={readOnly} value={value.line2 ?? ""}>
          <AppInputText
            value={value.line2 ?? ""}
            onChange={(e) => onChange({ line2: e.target.value })}
            className="w-full"
          />
        </FormField>

        <FormField label={t("client.zipCode")} readOnly={readOnly} value={value.zip_code ?? ""}>
          <AppInputText
            value={value.zip_code ?? ""}
            onChange={(e) => onChange({ zip_code: e.target.value })}
            className="w-full"
          />
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <FormField label={t("client.commune")} readOnly={readOnly} value={value.commune ?? ""}>
          <AppInputText
            value={value.commune ?? ""}
            onChange={(e) => onChange({ commune: e.target.value })}
            className="w-full"
          />
        </FormField>

        <FormField label={t("client.city")} readOnly={readOnly} value={value.city ?? ""}>
          <AppInputText
            value={value.city ?? ""}
            onChange={(e) => onChange({ city: e.target.value })}
            className="w-full"
          />
        </FormField>

        <FormField label={t("client.region")} readOnly={readOnly} value={value.region ?? ""}>
          <AppDropdown
            value={value.region}
            options={CHILE_REGIONS}
            onChange={(e) => onChange({ region: e.value })}
          />
        </FormField>
      </div>
    </>
  );
}
