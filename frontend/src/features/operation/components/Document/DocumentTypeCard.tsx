import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppButton, AppFileUpload, AppTag, AppFileRow, AppFilePreviewDialog } from '@shared/ui'
import type { FileUploadHandlerEvent } from '@shared/ui'
import type { TurmaDocumentData, TurmaDocumentType } from '@shared/types/generated'

type Props = {
  type: TurmaDocumentType
  files: TurmaDocumentData[]
  uploading: boolean
  onUpload: (file: File) => void
  onRemove: (file: TurmaDocumentData) => void
  removing: boolean
  canSubmit: boolean
}

export function DocumentTypeCard({
  type,
  files,
  uploading,
  onUpload,
  onRemove,
  removing,
  canSubmit,
}: Props) {
  const { t } = useTranslation()
  const [preview, setPreview] = useState<TurmaDocumentData | null>(null)
  const [sizeError, setSizeError] = useState<string | null>(null)
  const delivered = files.length > 0

  return (
    <section className="rounded border p-4" style={{ borderColor: 'var(--surface-border)' }}>
      <header className="flex items-center justify-between gap-4">
        <h4 className="font-medium">{t(`operation.documents.type.${type}`)}</h4>
        <AppTag
          value={t(delivered ? 'operation.documents.delivered' : 'operation.documents.pending')}
          severity={delivered ? 'success' : 'warning'}
        />
        {canSubmit && (
          <AppFileUpload
            accept="application/pdf"
            chooseLabel={t('operation.documents.upload')}
            disabled={uploading}
            onSizeReject={setSizeError}
            uploadHandler={(e: FileUploadHandlerEvent) => {
              setSizeError(null)
              const file = e.files[0]
              if (!file) return
              // Limpa o filesState/input do Prime JÁ, antes de disparar a mutação
              // (diferente do useBudgetDetail, que limpa só no onSuccess): com
              // filesState não-vazio o input some do DOM e o clique seguinte
              // reenvia o MESMO arquivo em vez de reabrir o seletor — no sucesso
              // (arquivo errado subiu) e na falha (422 rejeitado) igual. `file`
              // já foi capturado no fechamento, então segue válido para
              // `onUpload` mesmo depois do clear resetar o estado do Prime.
              e.options.clear()
              onUpload(file)
            }}
          />
        )}
      </header>

      <ul className="mt-3 space-y-2">
        {files.map((file) => (
          <li key={file.id}>
            <AppFileRow
              name={file.original_name}
              mime={file.mime}
              size={file.size}
              createdAt={file.created_at}
              actions={
                <>
                  <AppButton
                    icon="pi pi-eye"
                    text
                    rounded
                    aria-label={t('common.preview')}
                    onClick={() => setPreview(file)}
                  />
                  <a href={file.download_url} target="_blank" rel="noreferrer">
                    <AppButton icon="pi pi-download" text rounded aria-label={t('common.download')} />
                  </a>
                  {canSubmit && (
                    <AppButton
                      icon="pi pi-trash"
                      text
                      rounded
                      severity="danger"
                      aria-label={t('operation.documents.remove')}
                      disabled={removing}
                      onClick={() => onRemove(file)}
                    />
                  )}
                </>
              }
            />
          </li>
        ))}
        {!delivered && <li className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>{t('operation.documents.empty')}</li>}
      </ul>

      {sizeError && <p className="mt-2 text-sm" style={{ color: 'var(--red-500)' }}>{sizeError}</p>}

      <AppFilePreviewDialog file={preview} visible={preview !== null} onHide={() => setPreview(null)} />

      {canSubmit && <p className="mt-2 text-xs" style={{ color: 'var(--text-color-secondary)' }}>{t('operation.documents.uploadHint')}</p>}
    </section>
  )
}
