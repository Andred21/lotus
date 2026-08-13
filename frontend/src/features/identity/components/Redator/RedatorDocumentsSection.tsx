import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AppFilePreviewDialog,
  FormSection,
  FormErrorBanner,
} from "@shared/ui";
import type { FileUploadHandlerEvent } from "@shared/ui";
import type { RedatorData, RedatorDocumentData } from "@shared/types/generated";
import { useFilePreview, useMutationErrors } from "@shared/hooks";
import {
  useUploadDocument,
  useRemoveDocument,
} from "../../api/useRedatorDocuments";
import type { RedatorDialogMode } from "../../hooks/useRedatorForm";
import { DOC_TYPES, type DocType } from "@shared/lib";
import { RedatorDocumentSlot } from "./RedatorDocumentSlot";

/** Seção de documentos do `RedatorDialog`: upload, staging (create) e
 * preview. Fica à parte porque tem hooks e handlers próprios — as mutations
 * de upload/remoção e o estado do preview não pertencem ao form principal. */
export function RedatorDocumentsSection({
  mode,
  redator,
  stagedDocs,
  stageDoc,
  unstageDoc,
}: {
  mode: RedatorDialogMode;
  redator: RedatorData | null;
  stagedDocs: Partial<Record<DocType, File>>;
  stageDoc: (type: DocType, file: File) => void;
  unstageDoc: (type: DocType) => void;
}) {
  const { t } = useTranslation();
  const upload = useUploadDocument();
  const removeDoc = useRemoveDocument();
  const preview = useFilePreview<RedatorDocumentData>();
  const [sizeError, setSizeError] = useState<string | null>(null);
  // As DUAS mutações num banner só, molde do `useBudgetDetail`: a exclusão que
  // falha devolve 4xx, a lista é reinvalidada e o documento reaparece na tela —
  // sem isto, em silêncio. Documento de redator alimenta idoneidade, que tem
  // peso legal; falha silenciosa aqui é o D16 (review do BD-4, Q-1).
  const { message: docError } = useMutationErrors([
    upload.error,
    removeDoc.error,
  ]);

  // Documentos vêm da entidade viva (derivada da lista), não do estado do form:
  // são geridos por mutações próprias e devem refletir o servidor na hora.
  const existing = redator?.documents ?? [];
  // Só há exclusão quando o redator já existe: sem id não há endpoint aninhado.
  // A ausência do callback é o que desliga a lixeira (mesmo contrato do
  // `AppFileActions.onRemove`) — assim o id chega ao `mutate` estreitado pelo
  // compilador, sem asserção.
  const redatorId = redator?.id;

  function handleUpload(type: DocType, e: FileUploadHandlerEvent) {
    setSizeError(null);
    const file = e.files[0];
    if (file && redator?.id) {
      upload.mutate({ redatorId: redator.id, type, file });
    }
    e.options.clear();
  }

  function handleStage(type: DocType, e: FileUploadHandlerEvent) {
    setSizeError(null);
    const file = e.files[0];
    if (file) stageDoc(type, file);
    e.options.clear();
  }

  return (
    <>
      <FormSection title={t("redator.sectionDocuments")} spaced />
      <FormErrorBanner message={docError} />
      <FormErrorBanner message={sizeError} />
      {DOC_TYPES.map((type) => (
        <RedatorDocumentSlot
          key={type}
          type={type}
          mode={mode}
          doc={existing.find((d) => d.type === type)}
          staged={stagedDocs[type]}
          uploading={upload.isPending && upload.variables?.type === type}
          onStage={handleStage}
          onUnstage={unstageDoc}
          onUpload={handleUpload}
          onRemoveDoc={
            redatorId != null
              ? (fileId) => removeDoc.mutate({ redatorId, fileId })
              : undefined
          }
          onPreview={preview.open}
          onSizeReject={setSizeError}
        />
      ))}
      <AppFilePreviewDialog
        file={preview.file}
        visible={preview.visible}
        onHide={preview.close}
      />
    </>
  );
}
