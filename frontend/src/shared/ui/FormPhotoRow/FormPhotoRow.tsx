import type { ReactNode } from 'react'
import type { useEntityPhoto } from '@shared/hooks'
import { AppPhotoField } from '../AppPhotoField'

/**
 * A linha "foto à esquerda, campos à direita" dos diálogos de cadastro. O
 * markup era idêntico byte a byte em ClientDialog, StaffUserDialog,
 * StudentDialog e RedatorUserSection (BD-5).
 *
 * Bloco 43: a foto é uma coluna estreita que não encolhe, e a linha vale a
 * partir de `sm`. Antes a foto tomava 3/5 da linha no `lg` e tudo virava
 * coluna abaixo dele — num diálogo de 48rem, os campos empilhavam.
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
  name: string
  photo: ReturnType<typeof useEntityPhoto>
  readOnly: boolean
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
      <div className="flex shrink-0 justify-center sm:w-40">
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
      <div className="flex min-w-0 flex-1 flex-col gap-4">{children}</div>
    </div>
  )
}
