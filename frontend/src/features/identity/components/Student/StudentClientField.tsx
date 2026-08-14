import { useTranslation } from "react-i18next";
import { AppDropdown, FormField, InlineLoadState } from "@shared/ui";
import type { DialogMode } from "@shared/lib";

/** Cliente é imutável depois do cadastro: fora do `create` o campo é texto, não
 * input desabilitado — `<AppInputText disabled>` cortava o nome do cliente, que
 * é o débito do BD-3 §4 numa quarta grafia que nenhuma das duas catracas
 * enxerga. Mesmo molde do `BudgetDialog`. */
export function StudentClientField({
  mode,
  value,
  readOnlyLabel,
  error,
  options,
  isError,
  errorDetail,
  showEmptyHint,
  unusable,
  refetch,
  onChange,
}: {
  mode: DialogMode;
  value: number | null;
  /** O rótulo do modo leitura vem do pai, não do `options`: fora do `create` a
   * lista de clientes nem é buscada, e o nome vigente mora na entidade. */
  readOnlyLabel: string;
  error?: string;
  options: { label: string; value: number }[];
  isError: boolean;
  errorDetail?: string | null;
  showEmptyHint: boolean;
  unusable: boolean;
  refetch: () => void;
  onChange: (id: number) => void;
}) {
  const { t } = useTranslation();

  return (
    <div>
      <FormField
        label={t("student.client")}
        error={error}
        readOnly={mode !== "create"}
        value={readOnlyLabel}
      >
        <AppDropdown
          value={value}
          disabled={unusable}
          options={options}
          onChange={(e) => onChange(e.value as number)}
          className="w-full"
        />
        <InlineLoadState
          error={isError ? (errorDetail ?? t("common.loadErrorHint")) : null}
          emptyHint={showEmptyHint ? t("student.noClientsAvailable") : null}
          retryLabel={t("common.retry")}
          onRetry={refetch}
        />
      </FormField>
      {mode === "edit" && (
        <p
          className="mt-1 text-xs"
          style={{ color: "var(--text-color-secondary)" }}
        >
          {t("student.clientLocked")}
        </p>
      )}
    </div>
  );
}
