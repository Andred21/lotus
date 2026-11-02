import { useTranslation } from "react-i18next";
import { AppAvatar } from "../AppAvatar";
import { AppButton } from "../AppButton";
import { AppFileActions } from "../AppFileActions";
import { AppFilePreviewDialog } from "../AppFilePreviewDialog";
import type { PreviewableFile } from "../AppFilePreviewDialog";
import { AppFileUpload } from "../AppFileUpload";
import type { FileUploadHandlerEvent } from "../AppFileUpload";
import { useFilePreview } from "@shared/hooks";
import { MAX_PHOTO_BYTES } from "@shared/lib/upload";
import { dangerText } from "../../styles/tokens"
import { DICA_ESQUERDA } from "../dicaEsquerda";

/** A URL é a única coisa que o `useEntityPhoto` expõe da foto: o arquivo
 * previsualizável é montado em volta dela. O `mime` só serve para o preview
 * escolher imagem. */
const arquivo = (url: string, name: string): PreviewableFile => ({
  original_name: name,
  mime: "image/jpeg",
  download_url: url,
});

export interface AppPhotoFieldProps {
  /** Nome da pessoa/empresa — vira as duas iniciais quando não há foto. */
  name: string;
  url?: string | null;
  /** A foto foi escolhida e ainda não subiu (criação): a `url` é um `blob:` do
   * navegador. Só o tirar do stage, sem confirmação — nada no servidor se
   * perde (spec §4.1; Q-6 da revisão do bloco 47). */
  staged?: boolean;
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
 * Campo de foto do corpo dos diálogos de cadastro. Com foto, as ações vêm
 * embaixo do avatar, só-ícone e com dica: ver (abre o preview no próprio campo),
 * baixar, substituir e excluir (que confirma). Sem foto, só o enviar. Foto em
 * stage (criação, ainda não enviada), só o tirar do stage.
 * Apresentacional puro: não conhece rota, mutation nem modo do diálogo — quem
 * orquestra é `useEntityPhoto` (spec D8).
 *
 * Substituir apaga a foto anterior de forma irreversível (spec D4): por isso o
 * ícone de substituir tem dica e nome próprios (`photo.replace`), distintos do
 * enviar de quando não há foto (`photo.select`), e excluir pede confirmação.
 *
 * As ações ficam numa linha centrada que quebra sem perder o centro, e como são
 * só-ícone o idioma não muda o arranjo (UI-07 do review de 2026-08-16).
 */
export function AppPhotoField({
  name,
  url,
  staged = false,
  readOnly = false,
  pending = false,
  error,
  onSelect,
  onRemove,
  onSizeReject,
  onRetry,
}: AppPhotoFieldProps) {
  const { t } = useTranslation();

  const preview = useFilePreview<PreviewableFile>();

  const handleUpload = (e: FileUploadHandlerEvent) => {
    const file = e.files[0];
    e.options.clear();
    if (file) onSelect(file);
  };

  const picker = (label: string) => (
    <AppFileUpload
      accept="image/jpeg,image/png,image/webp"
      maxBytes={MAX_PHOTO_BYTES}
      disabled={pending}
      accessibleName={label}
      uploadHandler={handleUpload}
      onSizeReject={onSizeReject}
    />
  );

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
        {(url || !readOnly) && (
          <div className="flex flex-wrap items-center justify-center gap-1 pt-4">
            {url && staged && !readOnly ? (
              <AppButton
                icon="pi pi-times"
                text
                rounded
                severity="danger"
                aria-label={t("photo.remove")}
                tooltip={t("photo.remove")}
                tooltipOptions={DICA_ESQUERDA}
                disabled={pending}
                onClick={onRemove}
              />
            ) : url ? (
              <AppFileActions
                file={arquivo(url, t("photo.fileName"))}
                onPreview={preview.open}
                onRemove={readOnly ? undefined : onRemove}
                removing={pending}
                removeLabel={t("photo.remove")}
              >
                {!readOnly && picker(t("photo.replace"))}
              </AppFileActions>
            ) : (
              picker(t("photo.select"))
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

      <AppFilePreviewDialog
        file={preview.file}
        visible={preview.visible}
        onHide={preview.close}
      />
    </div>
  );
}
