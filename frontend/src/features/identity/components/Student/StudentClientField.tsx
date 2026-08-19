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
  isLoading,
  isError,
  errorDetail,
  errorHint,
  isEmpty,
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
  isLoading: boolean;
  isError: boolean;
  errorDetail?: string | null;
  /** Chave i18n da dica, escolhida pelo status no `useLoadState`: um 403 no GET
   * de clientes não é problema de conexão, e o campo é a única superfície onde
   * o motivo aparece. */
  errorHint: string;
  isEmpty: boolean;
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
        {/* Carregando, o controle fica desabilitado E dá o sinal: sem `loading`
         * ele vira controle morto sem explicação — o disfarce que o BD-6
         * existe para matar, na escala de um campo (review do BD-6, Q-3). */}
        <AppDropdown
          value={value}
          disabled={unusable}
          loading={isLoading}
          aria-busy={isLoading}
          options={options}
          onChange={(e) => onChange(e.value as number)}
          className="w-full"
        />
        <InlineLoadState
          error={isError ? (errorDetail ?? t(errorHint)) : null}
          emptyHint={isEmpty ? t("student.noClientsAvailable") : null}
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
