import { useTranslation } from 'react-i18next'
import { AppFileActions, AppFileRow, AppFileUpload, AppTag } from '@shared/ui'
import type { FileUploadHandlerEvent, PreviewableFile } from '@shared/ui'
import type {
  DocumentValidityStatus,
  RedatorDocumentType,
  RedatorProfileDocumentData,
} from '@shared/types/generated'

/**
 * `ausente` é NEUTRO, não `danger` (spec D10): o perfil não recebe idoneidade
 * no DTO e não a calcula, então pintar ausência de vermelho seria emitir um
 * veredito de compliance que este contrato não fornece. A ausência aparece
 * como ação pendente, pelo botão de envio.
 */
const SEVERIDADE: Record<DocumentValidityStatus, 'success' | 'warning' | 'danger' | 'secondary'> = {
  vigente: 'success',
  vence_em_breve: 'warning',
  vencido: 'danger',
  ausente: 'secondary',
}

const UPLOAD_CHOOSE_OPTIONS = { icon: 'pi pi-upload', className: 'p-button-text p-button-sm' }

export type ProfileDocumentSlotProps = {
  doc: RedatorProfileDocumentData
  uploading: boolean
  onUpload: (type: RedatorDocumentType, e: FileUploadHandlerEvent) => void
  onSizeReject: (message: string) => void
  onPreview: (file: PreviewableFile) => void
}

/**
 * Um tipo documental em Mi perfil.
 *
 * Irmão do `RedatorDocumentSlot`, não reuso dele (spec D3): o slot
 * administrativo deriva o status no front porque `RedatorDocumentData` não tem
 * `status`; este consome `RedatorProfileDocumentData.status` PRONTO do backend,
 * sem recalcular validade. São duas fontes de verdade para a mesma pergunta, e
 * embutir as duas no mesmo componente é o que faria a tela mentir sob refactor.
 */
export function ProfileDocumentSlot({
  doc,
  uploading,
  onUpload,
  onSizeReject,
  onPreview,
}: ProfileDocumentSlotProps) {
  const { t } = useTranslation()

  // `PreviewableFile` exige nome e URL não-nulos; o DTO os traz nullable porque
  // o slot ausente é projetado igual. Montar o literal aqui é o que estreita.
  const file: PreviewableFile | null =
    doc.original_name && doc.download_url
      ? {
          original_name: doc.original_name,
          size: doc.size ?? undefined,
          download_url: doc.download_url,
        }
      : null

  // O RÓTULO muda com o estado, e não é cosmética: substituir apaga o
  // documento anterior de forma irreversível, e o texto é o único aviso disso
  // na tela (spec §6, mesmo contrato do `AppPhotoField`). O slot
  // administrativo usa ícone mudo; aqui quem age é o dono do documento.
  const upload = doc.self_service ? (
    <AppFileUpload
      chooseOptions={UPLOAD_CHOOSE_OPTIONS}
      chooseLabel={file ? t('profile.documents.replace') : t('profile.documents.send')}
      disabled={uploading}
      onSizeReject={onSizeReject}
      uploadHandler={(e) => onUpload(doc.type, e)}
    />
  ) : null

  return (
    <div className="rounded border p-2" style={{ borderColor: 'var(--surface-border)' }}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">{t(`documentType.${doc.type}`)}</p>
        <AppTag value={t(`profile.docStatus.${doc.status}`)} severity={SEVERIDADE[doc.status]} />
      </div>

      <div className="mt-2">
        {file ? (
          <AppFileRow
            name={file.original_name}
            size={file.size}
            createdAt={doc.created_at}
            actions={
              <AppFileActions file={file} onPreview={onPreview}>
                {upload}
              </AppFileActions>
            }
          />
        ) : (
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs" style={{ color: 'var(--text-color-secondary)' }}>
              {t('common.notLoaded')}
            </p>
            {upload}
          </div>
        )}

        {!doc.self_service && (
          <p className="mt-1 text-xs" style={{ color: 'var(--text-color-secondary)' }}>
            {t('profile.documents.managedByAdmin')}
          </p>
        )}

        {file && (
          <p className="mt-1 text-xs" style={{ color: 'var(--text-color-secondary)' }}>
            {doc.valid_until
              ? t('profile.documents.validUntil', {
                  date: new Date(doc.valid_until).toLocaleDateString(),
                })
              : t('profile.documents.noValidity')}
          </p>
        )}
      </div>
    </div>
  )
}
