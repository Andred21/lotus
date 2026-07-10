import type { ReactNode } from 'react'
import { CrudDialog, AppButton, AppInputText, AppTag, AppFileUpload } from '@shared/ui'
import type { FileUploadHandlerEvent } from '@shared/ui'
import type { RedatorData } from '@shared/types/generated'
import { coursesApi } from '@shared/api/coursesApi'
import { useUploadDocument, useRemoveDocument } from '../../api/useRedatorDocuments'
import { useRedatorForm, type RedatorDialogMode } from '../../hooks/useRedatorForm'
import { docStatus, idoneidade } from '../../lib/redatorStatus'

const DOC_TYPES = [
  { type: 'CV', label: 'Currículum (CV)' },
  { type: 'REUF', label: 'Certificado REUF' },
  { type: 'TITULO', label: 'Título universitario' },
  { type: 'POSTGRADO', label: 'Post-Grado' },
]

const STATUS_TAG: Record<string, { value: string; severity: 'success' | 'warning' | 'danger' | 'info' }> = {
  sin_venc: { value: 'Sin vencimiento', severity: 'success' },
  vigente: { value: 'Vigente', severity: 'success' },
  por_vencer: { value: 'Por vencer', severity: 'warning' },
  vencido: { value: 'Vencido', severity: 'danger' },
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
  const {
    form, set, toggleCourse, readOnly, submit, pending,
    stagedDocs, stageDoc, unstageDoc, fieldErrors, generalError,
  } = useRedatorForm(redator, mode, onHide)
  const courses = coursesApi.useList()
  const upload = useUploadDocument()
  const removeDoc = useRemoveDocument()

  // Documentos vêm da entidade viva (derivada da lista), não do estado do form:
  // são geridos por mutações próprias e devem refletir o servidor na hora.
  const existing = redator?.documents ?? []
  const courseIds = form.course_ids

  function handleUpload(type: string, e: FileUploadHandlerEvent) {
    const file = e.files[0]
    if (file && redator?.id) {
      upload.mutate({ redatorId: redator.id, type, file })
    }
    e.options.clear()
  }

  function handleStage(type: string, e: FileUploadHandlerEvent) {
    const file = e.files[0]
    if (file) stageDoc(type, file)
    e.options.clear()
  }

  return (
    <CrudDialog
      visible={visible}
      mode={mode}
      title={mode === 'create' ? 'Nuevo redactor' : form.name}
      onHide={onHide}
      onEdit={onEdit}
      onSubmit={submit}
      pending={pending}
      submitLabel={mode === 'create' ? 'Registrar redactor' : undefined}
      headerExtra={
        mode !== 'create' && redator ? (
          <AppTag
            value={`Idoneidad: ${idoneidade(redator)}`}
            severity={idoneidade(redator) === 'idoneo' ? 'success' : idoneidade(redator) === 'por_vencer' ? 'warning' : 'danger'}
          />
        ) : null
      }
    >
      {generalError && (
        <p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
          {generalError}
        </p>
      )}

      <section className="space-y-4">
        <h3 className="text-xs font-semibold uppercase text-slate-500">Datos de usuario</h3>
        <Field label="Nombre completo" error={fieldErrors?.name?.[0]}>
          <AppInputText value={form.name} disabled={readOnly} onChange={(e) => set('name', e.target.value)} className="w-full" />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="RUT" error={fieldErrors?.rut?.[0]}>
            <AppInputText value={form.rut} disabled={readOnly} onChange={(e) => set('rut', e.target.value)} className="w-full" />
          </Field>
          <Field label="Email" error={fieldErrors?.email?.[0]}>
            <AppInputText value={form.email} disabled={readOnly} onChange={(e) => set('email', e.target.value)} className="w-full" />
          </Field>
        </div>
        <Field label="Teléfono">
          <AppInputText value={form.phone ?? ''} disabled={readOnly} onChange={(e) => set('phone', e.target.value)} className="w-full" />
        </Field>

        <h3 className="pt-2 text-xs font-semibold uppercase text-slate-500">Documentos</h3>
        {upload.error && (
          <p className="text-sm text-red-600">{upload.error.detail}</p>
        )}
        {DOC_TYPES.map((dt) => {
          const doc = existing.find((d) => d.type === dt.type)
          const staged = stagedDocs[dt.type]
          const st = doc ? STATUS_TAG[docStatus(doc.valid_until)] : null
          const rowLabel = mode === 'create'
            ? (staged ? staged.name : 'No cargado')
            : (doc ? doc.original_name : 'No cargado')
          return (
            <div key={dt.type} className="flex items-center justify-between rounded border border-slate-200 p-2 dark:border-slate-700">
              <div>
                <p className="text-sm font-medium">{dt.label}</p>
                <p className="text-xs text-slate-500">{rowLabel}</p>
              </div>
              <div className="flex items-center gap-2">
                {mode !== 'create' && st && <AppTag value={st.value} severity={st.severity} />}

                {/* view: só status + link de download, documento é imutável */}
                {mode === 'view' && doc && (
                  <a href={doc.download_url} target="_blank" rel="noreferrer"><AppButton icon="pi pi-download" text rounded /></a>
                )}

                {/* edit: upload/substituição imediata via endpoint aninhado + exclusão */}
                {mode === 'edit' && (
                  <>
                    {doc && <a href={doc.download_url} target="_blank" rel="noreferrer"><AppButton icon="pi pi-download" text rounded /></a>}
                    <AppFileUpload
                      chooseOptions={{ icon: 'pi pi-upload', className: 'p-button-text p-button-rounded' }}
                      chooseLabel=""
                      disabled={upload.isPending && upload.variables?.type === dt.type}
                      uploadHandler={(e) => handleUpload(dt.type, e)}
                    />
                    {doc && redator?.id && (
                      <AppButton icon="pi pi-trash" text rounded severity="danger" onClick={() => removeDoc.mutate({ redatorId: redator.id!, fileId: doc.id })} />
                    )}
                  </>
                )}

                {/* create: arquivo fica só no estado local até o submit (multipart único) */}
                {mode === 'create' && (
                  staged ? (
                    <AppButton icon="pi pi-times" text rounded severity="danger" onClick={() => unstageDoc(dt.type)} />
                  ) : (
                    <AppFileUpload
                      chooseOptions={{ icon: 'pi pi-upload', className: 'p-button-text p-button-rounded' }}
                      chooseLabel=""
                      uploadHandler={(e) => handleStage(dt.type, e)}
                    />
                  )
                )}
              </div>
            </div>
          )
        })}

        <h3 className="pt-2 text-xs font-semibold uppercase text-slate-500">Cursos habilitados</h3>
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

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-slate-600 dark:text-slate-300">{label}</span>
      {children}
      {error && <span className="mt-1 block text-sm text-red-600">{error}</span>}
    </label>
  )
}
