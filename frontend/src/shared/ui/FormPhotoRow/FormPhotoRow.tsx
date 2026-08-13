import type { ReactNode } from "react";
import type { useEntityPhoto } from "@shared/hooks";
import { AppPhotoField } from "../AppPhotoField";

/**
 * A linha "foto à esquerda, campos à direita" dos diálogos de cadastro. O
 * markup era idêntico byte a byte em ClientDialog, StaffUserDialog,
 * StudentDialog e RedatorUserSection (BD-5).
 *
 * `photo` entra inteiro em vez de nove props soltas: o objeto já é o contrato
 * do `useEntityPhoto`, e desmontá-lo aqui só criaria uma segunda grafia dele.
 */
export function FormPhotoRow({
  name,
  photo,
  readOnly,
  children,
}: {
  name: string;
  photo: ReturnType<typeof useEntityPhoto>;
  readOnly: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col lg:flex-row justify-between">
      <div className="flex flex-col sm:justify-center py-10 gap-4 lg:w-3/5 w-full">
        <AppPhotoField
          name={name}
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
      <div className="flex flex-col gap-4 w-full">{children}</div>
    </div>
  );
}
