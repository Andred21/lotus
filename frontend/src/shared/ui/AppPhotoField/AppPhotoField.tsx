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
 *
 * O par de controles é CENTRADO, e a quebra preserva isso: os rótulos de es-CL
 * e pt-BR são mais longos que os de en e não cabem numa linha da coluna de
 * 22rem do perfil. Alinhados ao fim, a quebra deixava o primário sozinho à
 * esquerda e o secundário desalinhado na linha de baixo — o mesmo bloco mudava
 * de arranjo com o idioma, e o que quebra é justamente o idioma de referência
 * do projeto (UI-07 do review de 2026-08-16).
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
    <div className="flex flex-col items-center">
      {/* Diâmetro REAL de 8rem, não `size="xlarge"` + `transform scale-200`.
          A escala pintava 8rem ocupando caixa de 4rem: o halo saía 32px acima e
          32px abaixo do próprio box, e como o `AppCard` é `overflow-hidden`, o
          topo do círculo era CORTADO pela borda do cartão em `/perfil` — margem
          nenhuma resolvia, porque o que vazava era a pintura, não o fluxo. Com
          a caixa real, o avatar mede o que aparenta e volta a caber onde é
          posto (era a DS-05; autorizada pelo João em 2026-08-24). `fontSize`
          acompanha o dobro do `p-avatar-xl` (2rem) para as iniciais não
          encolherem junto. */}
      <AppAvatar
        name={name}
        image={url}
        size="xlarge"
        // `object-cover` no <img>: o Prime só estica a imagem para 100%/100% do
        // círculo, então foto não quadrada saía deformada.
        className="[&_img]:object-cover"
        style={{ width: '8rem', height: '8rem', fontSize: '4rem' }}
      />

      <div className="flex flex-col gap-2 items-center">
        {!readOnly && (
          <div className="flex flex-wrap items-center justify-center gap-2 pt-4">
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
              // `severity="danger"`, não `dangerText` inline: é BOTÃO, e botão
              // recebe severidade — a tinta vem da folha do Prime, sem hex novo
              // (ADR-16). Antes, `Eliminar foto` era texto celeste logo abaixo do
              // `Reemplazar` celeste PREENCHIDO: das duas, a destrutiva tinha o
              // MENOR peso visual, e lia como "menos importante" em vez de "mais
              // perigosa" (D-30). É o caso pior do acúmulo de papéis que a P-36
              // registra — a mesma tinta em ação primária e em ação que apaga.
              <AppButton
                label={t("photo.remove")}
                icon="pi pi-trash"
                text
                severity="danger"
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
