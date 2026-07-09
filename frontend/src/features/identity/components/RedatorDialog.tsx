import type { ReactNode } from 'react'
import { AppDialog, AppButton, AppInputText, AppTag, AppFileUpload } from '@shared/ui'
import type { FileUploadHandlerEvent } from '@shared/ui'
import type { RedatorData } from '@shared/types/generated'
import { coursesApi } from '../api/coursesApi'
import { useUploadDocument, useRemoveDocument } from '../api/useRedatorDocuments'
import { useRedatorForm, type RedatorDialogMode } from '../hooks/useRedatorForm'
import { docStatus, idoneidade } from '../lib/redatorStatus'

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
  const { form, set, toggleCourse, readOnly, submit, pending } = useRedatorForm(redator, mode, onHide)
  const courses = coursesApi.useList()
  const upload = useUploadDocument()
  const removeDoc = useRemoveDocument()

  const title = mode === 'create' ? 'Nuevo redactor' : form.name
  const existing = form.documents ?? []
  const courseIds = form.course_ids

  function handleUpload(type: string, e: FileUploadHandlerEvent) {
    const file = e.files[0]
    if (file && redator?.id) {
      upload.mutate({ redatorId: redator.id, type, file })
    }
    e.options.clear()
  }

  const footer = readOnly ? null : (
    <div className="flex justify-end gap-2">
      <AppButton label="Cancelar" text onClick={onHide} />
      <AppButton label={mode === 'create' ? 'Registrar redactor' : 'Guardar'} icon="pi pi-check" loading={pending} onClick={submit} />
    </div>
  )

  const header = (
    <div className="flex items-center justify-between gap-4">
      <span>{title}</span>
      {readOnly && onEdit && <AppButton label="Editar datos" icon="pi pi-pencil" outlined onClick={onEdit} />}
    </div>
  )

  return (
    <AppDialog header={header} visible={visible} onHide={onHide} footer={footer}>
      {mode !== 'create' && (
        <div className="mb-4">
          <AppTag value={`Idoneidad: ${idoneidade(form)}`} severity={idoneidade(form) === 'idoneo' ? 'success' : idoneidade(form) === 'por_vencer' ? 'warning' : 'danger'} />
        </div>
      )}

      <section className="space-y-4">
        <h3 className="text-xs font-semibold uppercase text-slate-500">Datos de usuario</h3>
        <Field label="Nombre completo">
          <AppInputText value={form.name} disabled={readOnly} onChange={(e) => set('name', e.target.value)} className="w-full" />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="RUT">
            <AppInputText value={form.rut} disabled={readOnly} onChange={(e) => set('rut', e.target.value)} className="w-full" />
          </Field>
          <Field label="Email">
            <AppInputText value={form.email} disabled={readOnly} onChange={(e) => set('email', e.target.value)} className="w-full" />
          </Field>
        </div>
        <Field label="Teléfono">
          <AppInputText value={form.phone ?? ''} disabled={readOnly} onChange={(e) => set('phone', e.target.value)} className="w-full" />
        </Field>

        {/* Documentos: só quando o redator já existe (precisa de id). No create,
            salvar primeiro e reabrir em edição. */}
        {mode !== 'create' && (
          <>
            <h3 className="pt-2 text-xs font-semibold uppercase text-slate-500">Documentos</h3>
            {DOC_TYPES.map((dt) => {
              const doc = existing.find((d) => d.type === dt.type)
              const st = doc ? STATUS_TAG[docStatus(doc.valid_until)] : null
              return (
                <div key={dt.type} className="flex items-center justify-between rounded border border-slate-200 p-2 dark:border-slate-700">
                  <div>
                    <p className="text-sm font-medium">{dt.label}</p>
                    <p className="text-xs text-slate-500">{doc ? doc.original_name : 'No cargado'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {st && <AppTag value={st.value} severity={st.severity} />}
                    {doc && <a href={doc.download_url} target="_blank" rel="noreferrer"><AppButton icon="pi pi-download" text rounded /></a>}
                    <AppFileUpload
                      chooseOptions={{ icon: 'pi pi-upload', className: 'p-button-text p-button-rounded' }}
                      chooseLabel=""
                      disabled={upload.isPending}
                      uploadHandler={(e) => handleUpload(dt.type, e)}
                    />
                    {doc && redator?.id && <AppButton icon="pi pi-trash" text rounded severity="danger" onClick={() => removeDoc.mutate({ redatorId: redator.id!, fileId: doc.id })} />}
                  </div>
                </div>
              )
            })}
          </>
        )}

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
    </AppDialog>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-slate-600 dark:text-slate-300">{label}</span>
      {children}
    </label>
  )
}
