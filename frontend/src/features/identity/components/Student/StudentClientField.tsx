import { useTranslation } from "react-i18next";
import { AppDropdown, InlineLoadState, type FieldComponent } from "@shared/ui";
import { loadMessage } from "@shared/lib";
import type { DialogMode } from "@shared/lib";
import type { StudentFormFields } from "../../hooks/useStudentForm";

/** Cliente é imutável depois do cadastro: fora do `create` o campo é texto, não
 * input desabilitado — `<AppInputText disabled>` cortava o nome do cliente, que
 * é o débito do BD-3 §4 numa quarta grafia que nenhuma das duas catracas
 * enxerga. Mesmo molde do `BudgetDialog`.
 *
 * `readOnly` e `value` continuam explícitos no `Field`: o modo de leitura
 * deste campo não é o do formulário (`mode !== 'create'`, não o `readOnly` do
 * bundle) e o rótulo em leitura vem da entidade, não da lista de opções —
 * fora do `create` ela nem é buscada (item 24, spec §5). São os dois escapes
 * do `Field`; `value`/`onChange` do `AppDropdown` e `error` do campo somem,
 * o resto (estado de carga) não tem nada a ver com este bloco. */
export function StudentClientField({
  mode,
  Field,
  readOnlyLabel,
  options,
  isLoading,
  isError,
  errorDetail,
  errorHint,
  isEmpty,
  unusable,
  refetch,
}: {
  mode: DialogMode;
  Field: FieldComponent<StudentFormFields>;
  /** O rótulo do modo leitura vem do pai, não do `options`: fora do `create` a
   * lista de clientes nem é buscada, e o nome vigente mora na entidade. */
  readOnlyLabel: string;
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
  /** Aceita a promise do `useLoadState`: é ela que mantém o botão em carga
   * (Q-14). Molde: `QuotesList.tsx:26`. */
  refetch: () => void | Promise<unknown>;
}) {
  const { t } = useTranslation();

  return (
    <div>
      <Field
        name="client_id"
        label={t("student.client")}
        readOnly={mode !== "create"}
        value={readOnlyLabel}
      >
        {/* Carregando, o controle fica desabilitado E dá o sinal: sem `loading`
         * ele vira controle morto sem explicação — o disfarce que o BD-6
         * existe para matar, na escala de um campo (review do BD-6, Q-3). */}
        <AppDropdown
          disabled={unusable}
          loading={isLoading}
          aria-busy={isLoading}
          options={options}
          className="w-full"
        />
        <InlineLoadState
          error={isError ? loadMessage({ errorDetail, errorHint }, t) : null}
          emptyHint={isEmpty ? t("student.noClientsAvailable") : null}
          retryLabel={t("common.retry")}
          onRetry={refetch}
        />
      </Field>
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
