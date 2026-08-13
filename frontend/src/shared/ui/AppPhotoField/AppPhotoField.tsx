import { useTranslation } from "react-i18next";
import { AppAvatar } from "../AppAvatar";
import { AppButton } from "../AppButton";
import { AppFileUpload } from "../AppFileUpload";
import type { FileUploadHandlerEvent } from "../AppFileUpload";
import { MAX_PHOTO_BYTES } from "@shared/lib/upload";
import { dangerText } from "../../styles/tokens"

export interface AppPhotoFieldProps {
  /** Nome da pessoa/empresa — vira as duas iniciais quando não há foto. */
  name: string;
  url?: string | null;
  readOnly?: boolean;
  pending?: boolean;
  /** Mensagem de erro do upload/remoção, já traduzida. */
  error?: string | null;
  onSelect: (file: File) => void;
  onRemove: () => void;
  /** Recebe a mensagem já traduzida quando o arquivo passa do teto, antes de
   * qualquer requisição. O hook a exibe no mesmo lugar do erro do backend. */
  onSizeReject?: (message: string) => void;
  /** Quando presente, mostra "Reintentar" ao lado do erro. */
  onRetry?: () => void;
}

/**
 * Campo de foto do corpo dos diálogos de cadastro. Apresentacional puro: não
 * conhece rota, mutation nem modo do diálogo — quem orquestra é
 * `useEntityPhoto` (spec D8).
 *
 * O rótulo do botão muda com o estado ("Seleccionar" vs "Reemplazar") porque
 * substituir apaga a foto anterior de forma irreversível (spec D4) — o texto é
 * o único aviso disso na tela.
 */
export function AppPhotoField({
  name,
  url,
  readOnly = false,
  pending = false,
  error,
  onSelect,
  onRemove,
  onSizeReject,
  onRetry,
}: AppPhotoFieldProps) {
  const { t } = useTranslation();

  const handleUpload = (e: FileUploadHandlerEvent) => {
    const file = e.files[0];
    e.options.clear();
    if (file) onSelect(file);
  };

  return (
    <div className="flex flex-col items-center  ">
      <div className="transform scale-200">
        <AppAvatar name={name} image={url} size="xlarge" />
      </div>

      <div className="flex flex-col gap-2 items-end">
        {!readOnly && (
          <div className="flex flex-wrap  items-end gap-2 pt-10">
            <AppFileUpload
              accept="image/jpeg,image/png,image/webp"
              maxBytes={MAX_PHOTO_BYTES}
              disabled={pending}
              chooseLabel={url ? t("photo.replace") : t("photo.select")}
              chooseOptions={{ icon: "pi pi-camera" }}
              uploadHandler={handleUpload}
              onSizeReject={onSizeReject}
            />
            {url && (
              <AppButton
                label={t("photo.remove")}
                icon="pi pi-trash"
                text
                disabled={pending}
                onClick={onRemove}
              />
            )}
          </div>
        )}

        {error && (
          <p
            className="flex items-center gap-2 text-xs"
            style={{ color: dangerText }}
          >
            <span>{error}</span>
            {onRetry && (
              <AppButton label={t("common.retry")} text onClick={onRetry} />
            )}
          </p>
        )}
      </div>
    </div>
  );
}
