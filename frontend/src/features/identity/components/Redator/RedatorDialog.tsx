import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CrudDialog, AppButton, AppInputText, AppTag, AppFileUpload, AppFilePreviewDialog, AppFileRow, FormField, FormSection, FormErrorBanner } from '@shared/ui'
import type { FileUploadHandlerEvent } from '@shared/ui'
import type { RedatorData, RedatorDocumentData } from '@shared/types/generated'
import { coursesApi } from '@shared/api/coursesApi'
import { useUploadDocument, useRemoveDocument } from '../../api/useRedatorDocuments'
import { useRedatorForm, type RedatorDialogMode } from '../../hooks/useRedatorForm'
import { docStatus, idoneidade, type DocStatus } from '../../lib/redatorStatus'

const DOC_TYPES = ['CV', 'REUF', 'TITULO', 'POSTGRADO'] as const

const STATUS_SEVERITY: Record<DocStatus, 'success' | 'warning' | 'danger'> = {
  sin_venc: 'success', vigente: 'success', por_vencer: 'warning', vencido: 'danger',
}

export function RedatorDialog({
  visible, mode, redator, onHide, onEdit,
}: {
  visible: boolean
  mode: RedatorDialogMode
  redator: RedatorData | null
  onHide: () => void
  /** Presente só em `view`: alterna para `edit` (botão "Editar datos"). */
  onEdit?: () => void
}) {
  const { t } = useTranslation()
  const {
    form, set, toggleCourse, readOnly, submit, pending,
    stagedDocs, stageDoc, unstageDoc, fieldErrors, generalError,
  } = useRedatorForm(redator, mode, onHide)
  const courses = coursesApi.useList()
  const upload = useUploadDocument()
  const removeDoc = useRemoveDocument()
  const [preview, setPreview] = useState<RedatorDocumentData | null>(null)
  const [sizeError, setSizeError] = useState<string | null>(null)

  // Documentos vêm da entidade viva (derivada da lista), não do estado do form:
  // são geridos por mutações próprias e devem refletir o servidor na hora.
  const existing = redator?.documents ?? []
  const courseIds = form.course_ids

  function handleUpload(type: string, e: FileUploadHandlerEvent) {
    setSizeError(null)
    const file = e.files[0]
    if (file && redator?.id) {
      upload.mutate({ redatorId: redator.id, type, file })
    }
    e.options.clear()
  }

  function handleStage(type: string, e: FileUploadHandlerEvent) {
    setSizeError(null)
    const file = e.files[0]
    if (file) stageDoc(type, file)
    e.options.clear()
  }

  return (
    <CrudDialog
      visible={visible}
      mode={mode}
      title={mode === 'create' ? t('redator.new') : form.name}
      onHide={onHide}
      onEdit={onEdit}
      onSubmit={submit}
      pending={pending}
      submitLabel={mode === 'create' ? t('redator.create') : undefined}
      headerExtra={
        mode !== 'create' && redator ? (
          <AppTag
            value={`${t('redator.suitability')}: ${t(`suitability.${idoneidade(redator)}`)}`}
            severity={idoneidade(redator) === 'idoneo' ? 'success' : idoneidade(redator) === 'por_vencer' ? 'warning' : 'danger'}
          />
        ) : null
      }
    >
      <FormErrorBanner message={generalError} />

      <section className="space-y-4">
        
        <FormSection title={t('redator.sectionUser')} />
        <FormField label={t('redator.name')} error={fieldErrors?.name?.[0]}>
          <AppInputText value={form.name} disabled={readOnly} onChange={(e) => set('name', e.target.value)} className="w-full" />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label={t('common.rut')} error={fieldErrors?.rut?.[0]}>
            <AppInputText value={form.rut} disabled={readOnly} onChange={(e) => set('rut', e.target.value)} className="w-full" />
          </FormField>
          <FormField label={t('common.email')} error={fieldErrors?.email?.[0]}>
            <AppInputText value={form.email} disabled={readOnly} onChange={(e) => set('email', e.target.value)} className="w-full" />
          </FormField>
        </div>
        <FormField label={t('common.phone')}>
          <AppInputText value={form.phone ?? ''} disabled={readOnly} onChange={(e) => set('phone', e.target.value)} className="w-full" />
        </FormField>

        <FormSection title={t('redator.sectionDocuments')} spaced />
        {upload.error && (
          <p className="text-sm text-red-600">{upload.error.detail}</p>
        )}
        {sizeError && <p className="text-sm text-red-600">{sizeError}</p>}
        {DOC_TYPES.map((type) => {
          const doc = existing.find((d) => d.type === type)
          const staged = stagedDocs[type]
          const st = doc ? docStatus(doc.valid_until) : null
          return (
            <div key={type} className="rounded border border-slate-200 p-2 dark:border-slate-700">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">{t(`documentType.${type}`)}</p>
                {mode !== 'create' && st && <AppTag value={t(`documentStatus.${st}`)} severity={STATUS_SEVERITY[st]} />}
              </div>

              {/* create: arquivo fica só no estado local até o submit (multipart único).
                  `staged` é um File puro (sem download_url ainda), então não há o que
                  pré-visualizar — mesmo comportamento de antes, só a linha ganhou AppFileRow. */}
              {mode === 'create' && (
                staged ? (
                  <div className="mt-2">
                    <AppFileRow
                      name={staged.name}
                      mime={staged.type}
                      size={staged.size}
                      actions={<AppButton icon="pi pi-times" text rounded severity="danger" onClick={() => unstageDoc(type)} />}
                    />
                  </div>
                ) : (
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <p className="text-xs text-slate-500">{t('common.notLoaded')}</p>
                    <AppFileUpload
                      chooseOptions={{ icon: 'pi pi-upload', className: 'p-button-text p-button-rounded' }}
                      chooseLabel=""
                      onSizeReject={setSizeError}
                      uploadHandler={(e) => handleStage(type, e)}
                    />
                  </div>
                )
              )}

              {/* view: só status + ver/baixar, documento é imutável */}
              {mode === 'view' && (
                doc ? (
                  <div className="mt-2">
                    <AppFileRow
                      name={doc.original_name}
                      mime={doc.mime}
                      size={doc.size}
                      createdAt={doc.created_at}
                      actions={
                        <>
                          <AppButton
                            icon="pi pi-eye"
                            text
                            rounded
                            aria-label={t('common.preview')}
                            onClick={() => setPreview(doc)}
                          />
                          <a href={doc.download_url} target="_blank" rel="noreferrer"><AppButton icon="pi pi-download" text rounded /></a>
                        </>
                      }
                    />
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-slate-500">{t('common.notLoaded')}</p>
                )
              )}

              {/* edit: ver + upload/substituição imediata via endpoint aninhado + exclusão */}
              {mode === 'edit' && (
                doc ? (
                  <div className="mt-2">
                    <AppFileRow
                      name={doc.original_name}
                      mime={doc.mime}
                      size={doc.size}
                      createdAt={doc.created_at}
                      actions={
                        <>
                          <AppButton
                            icon="pi pi-eye"
                            text
                            rounded
                            aria-label={t('common.preview')}
                            onClick={() => setPreview(doc)}
                          />
                          <a href={doc.download_url} target="_blank" rel="noreferrer"><AppButton icon="pi pi-download" text rounded /></a>
                          <AppFileUpload
                            chooseOptions={{ icon: 'pi pi-upload', className: 'p-button-text p-button-rounded' }}
                            chooseLabel=""
                            disabled={upload.isPending && upload.variables?.type === type}
                            onSizeReject={setSizeError}
                            uploadHandler={(e) => handleUpload(type, e)}
                          />
                          {redator?.id && (
                            <AppButton icon="pi pi-trash" text rounded severity="danger" onClick={() => removeDoc.mutate({ redatorId: redator.id!, fileId: doc.id })} />
                          )}
                        </>
                      }
                    />
                  </div>
                ) : (
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <p className="text-xs text-slate-500">{t('common.notLoaded')}</p>
                    <AppFileUpload
                      chooseOptions={{ icon: 'pi pi-upload', className: 'p-button-text p-button-rounded' }}
                      chooseLabel=""
                      disabled={upload.isPending && upload.variables?.type === type}
                      onSizeReject={setSizeError}
                      uploadHandler={(e) => handleUpload(type, e)}
                    />
                  </div>
                )
              )}
            </div>
          )
        })}
        <AppFilePreviewDialog file={preview} visible={preview !== null} onHide={() => setPreview(null)} />

        <FormSection title={t('redator.sectionCourses')} spaced />
        <div className="space-y-1">
          {(courses.data ?? []).map((c) => (
            <label key={c.id} className="flex items-center gap-2 rounded p-2 hover:bg-slate-50 dark:hover:bg-slate-800">
              <input
                type="checkbox"
                disabled={readOnly}
                checked={courseIds.includes(c.id as number)}
                onChange={() => toggleCourse(c.id as number)}
              />
              <span className="text-sm">{c.name}</span>
            </label>
          ))}
        </div>
      </section>
    </CrudDialog>
  )
}
