import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AppCard, AppCardHeader, AppFileActions, AppFilePreviewDialog, AppFileRow, AppFileUpload, AppTag,
  type FileUploadHandlerEvent,
} from '@shared/ui'
import { useFilePreview } from '@shared/hooks'
import { turmaDocumentTypeLabel, turmaDocumentTypeList } from '@shared/lib'
import { dangerText } from '@shared/styles/tokens'
import type { TurmaDocumentData, TurmaDocumentType } from '@shared/types/generated'

/** Os três slots, na ordem de exibição. Cada um acumula: enviar de novo SOMA um
 * arquivo, não substitui (a evaluación de cada aluno ou de cada visita é um PDF). */
const SLOTS = ['EVALUACION_REDATOR', 'EVALUACION_CLIENTE', 'EVALUACION_ALUNO'] as const satisfies TurmaDocumentType[]

type Props = {
  /** Rótulo do slot do cliente: o nome dele. Ausente, cai em "Cliente". */
  clientName: string | undefined
  byType: Record<TurmaDocumentType, TurmaDocumentData[]>
  /** As evaluaciones opcionais que faltam (Cliente e Alumnos), do backend. Aviso,
   * nunca pendência: não entram na habilitação. */
  missingOptional: TurmaDocumentType[]
  uploading: boolean
  onUpload: (type: TurmaDocumentType, file: File) => void
  canUpload: (type: TurmaDocumentType) => boolean
  removing: boolean
  removeError: string | null
  /** Chamado só depois do "sim" da confirmação; a Promise mantém o diálogo aberto. */
  onRemove: (file: TurmaDocumentData) => void | Promise<unknown>
  canRemove: (type: TurmaDocumentType) => boolean
}

/** Cartão de evaluaciones da turma (bloco 60): Instructor, Cliente e Alumnos. */
export function EvaluacionesCard({
  clientName, byType, missingOptional, uploading, onUpload, canUpload, removing, removeError, onRemove, canRemove,
}: Props) {
  const { t } = useTranslation()
  const preview = useFilePreview<TurmaDocumentData>()
  const [sizeError, setSizeError] = useState<string | null>(null)

  const tag = (type: (typeof SLOTS)[number]) =>
    type === 'EVALUACION_CLIENTE'
      ? clientName || t('operation.documents.evaluaciones.tag.clienteFallback')
      : t(`operation.documents.evaluaciones.tag.${type}`)

  // Limpa o input do Prime JÁ, antes da mutação (convenção de todo slot de upload).
  const send = (type: TurmaDocumentType, e: FileUploadHandlerEvent) => {
    setSizeError(null)
    const file = e.files[0]
    if (!file) return
    e.options.clear()
    onUpload(type, file)
  }

  return (
    <AppCard>
      <AppCardHeader
        title={t('operation.documents.evaluaciones.title')}
        count={SLOTS.reduce((n, type) => n + byType[type].length, 0)}
      />
      {missingOptional.length > 0 && (
        <div className="px-4 pt-4">
          <AppCard tone="info" className="px-3 py-2 text-sm">
            {t('operation.documents.evaluaciones.warning', { types: turmaDocumentTypeList(missingOptional, t) })}
          </AppCard>
        </div>
      )}
      <div className="space-y-3 p-4">
        {SLOTS.map((type) => {
          const tipo = turmaDocumentTypeLabel(type, t)
          const files = byType[type]
          // "A turma volta a Em curso" só vale para o tipo que a habilita: Cliente
          // e Alumnos saem com a confirmação padrão.
          const bloqueante = type === 'EVALUACION_REDATOR'
          return (
            <section key={type} className="rounded-surface border p-2" style={{ borderColor: 'var(--surface-border)' }}>
              <header className="flex items-center justify-between gap-2">
                <AppTag value={tag(type)} severity="secondary" className="text-sm px-3 py-1" />
                {canUpload(type) && (
                  <AppFileUpload
                    accept="application/pdf"
                    accessibleName={t('common.uploadNamed', { tipo })}
                    disabled={uploading}
                    onSizeReject={setSizeError}
                    uploadHandler={(e) => send(type, e)}
                  />
                )}
              </header>
              <ul role="list" className="mt-2 space-y-2">
                {files.map((file) => (
                  <li key={file.id}>
                    <AppFileRow
                      name={file.original_name}
                      mime={file.mime}
                      size={file.size}
                      createdAt={file.created_at}
                      actions={
                        <AppFileActions
                          file={file}
                          onPreview={preview.open}
                          onRemove={canRemove(type) ? () => onRemove(file) : undefined}
                          removing={removing}
                          removeLabel={t('common.deleteNamed', { tipo })}
                          removeError={removeError}
                          confirmTitle={bloqueante ? t('operation.documents.removeTitle') : undefined}
                          confirmMessage={bloqueante ? t('operation.documents.removeBody', { name: file.original_name }) : undefined}
                          confirmLabel={bloqueante ? t('operation.documents.remove') : undefined}
                        />
                      }
                    />
                  </li>
                ))}
                {files.length === 0 && (
                  <li className="text-xs" style={{ color: 'var(--text-color-secondary)' }}>{t('common.notLoaded')}</li>
                )}
              </ul>
            </section>
          )
        })}
      </div>
      {sizeError && <p className="px-4 pb-4 text-sm" style={{ color: dangerText }}>{sizeError}</p>}
      <AppFilePreviewDialog file={preview.file} visible={preview.visible} onHide={preview.close} />
    </AppCard>
  )
}
