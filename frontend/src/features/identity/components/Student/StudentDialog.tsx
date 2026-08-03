import { useTranslation } from 'react-i18next'
import {
  CrudDialog, AppButton, AppInputText, AppDropdown, AppTag, AppDataTable, AppColumn,
  AppSkeleton, AppErrorState, FormField, FormSection, FormErrorBanner, AppPhotoField,
} from '@shared/ui'
import type { StudentData, StudentTurmaData, StudentClientLogData } from '@shared/types/generated'
import type { DialogMode } from '@shared/lib'
import { enrollmentStatusLabelKey, enrollmentStatusSeverity, formatMonthYear } from '@shared/lib'
import { studentsApi } from '@shared/api/studentsApi'
import { useEntityPhoto } from '@shared/hooks'
import { useStudentDetail } from '../../api/useStudentDetail'
import { useStudentForm } from '../../hooks/useStudentForm'
import { useStudentClients } from '../../hooks/useStudentClients'

export function StudentDialog({
  visible, mode, student, onHide, onEdit,
}: {
  visible: boolean
  mode: DialogMode
  student: StudentData | null
  onHide: () => void
  onEdit?: () => void
}) {
  const { t } = useTranslation()
  const photo = useEntityPhoto({
    resource: 'students',
    id: mode === 'create' ? null : (student?.id ?? null),
    mode,
    url: student?.photo_url,
    invalidateKey: studentsApi.keys.all,
  })

  // `flush` sobe a foto bufferizada com o id recém-criado. Não lança: a
  // entidade já existe, e fechar o diálogo aqui esconderia a falha (D11).
  const { form, set, readOnly, submit, pending, fieldErrors, generalError } =
    useStudentForm(student, mode, onHide, (created) => photo.flush(created.id as number))
  const clients = useStudentClients(mode)
  const clientsUnusable = clients.unusable
  const detail = useStudentDetail(mode === 'create' ? null : student?.id)

  return (
    <CrudDialog
      visible={visible}
      mode={mode}
      title={mode === 'create' ? t('student.new') : form.name}
      onHide={onHide}
      onEdit={onEdit}
      onSubmit={submit}
      pending={pending}
      disabled={clientsUnusable || photo.pending}
      closeBlocked={pending || photo.pending}
      submitLabel={mode === 'create' ? t('student.create') : undefined}
    >
      <FormErrorBanner message={generalError} />
      {photo.hasBufferedFailure && <FormErrorBanner message={t('photo.createUploadFailed')} />}

      <section className="space-y-4">
        <AppPhotoField
          name={form.name}
          url={photo.url}
          readOnly={readOnly}
          pending={photo.pending}
          error={photo.error}
          onSelect={photo.onSelect}
          onRemove={photo.onRemove}
          onSizeReject={photo.onSizeReject}
          onRetry={photo.onRetry}
        />

        <FormSection title={t('student.sectionPersonal')} />
        <FormField label={t('student.name')} error={fieldErrors?.name?.[0]}>
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
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label={t('common.phone')}>
            <AppInputText value={form.phone ?? ''} disabled={readOnly} onChange={(e) => set('phone', e.target.value)} className="w-full" />
          </FormField>
          <FormField label={t('student.client')} error={fieldErrors?.client_id?.[0]}>
            {mode === 'create' ? (
              <>
                <AppDropdown
                  value={form.client_id}
                  disabled={clientsUnusable}
                  options={clients.options}
                  onChange={(e) => set('client_id', e.value as number)}
                  className="w-full"
                />
                {clients.isError && (
                  <p
                    className="mt-1 flex items-center justify-between gap-2 text-xs"
                    style={{ color: 'color-mix(in srgb, var(--red-500) 70%, var(--text-color))' }}
                  >
                    <span>{clients.errorDetail ?? t('common.loadErrorHint')}</span>
                    <AppButton label={t('common.retry')} text onClick={clients.refetch} />
                  </p>
                )}
                {clients.showEmptyHint && (
                  <p className="mt-1 flex items-center justify-between gap-2 text-xs" style={{ color: 'var(--text-color-secondary)' }}>
                    <span>{t('student.noClientsAvailable')}</span>
                    <AppButton label={t('common.retry')} text onClick={clients.refetch} />
                  </p>
                )}
              </>
            ) : (
              <AppInputText value={student?.current_client_name ?? t('student.noClient')} disabled className="w-full" />
            )}
            {mode === 'edit' && (
              <p className="mt-1 text-xs" style={{ color: 'var(--text-color-secondary)' }}>
                {t('student.clientLocked')}
              </p>
            )}
          </FormField>
        </div>

        {mode === 'view' && (detail.isError ? (
          /* O erro cobre as DUAS seções, não só a primeira. Mostrar o
             AppErrorState nos vínculos e deixar "Historial de turmas" com o
             cabeçalho e nada abaixo faz a falha de rede se parecer com "este
             aluno não tem turma" — vazio silencioso proibido (D16), e aqui o
             dado tem peso legal. */
          <AppErrorState
            title={t('common.loadError')}
            detail={detail.error?.detail ?? t('common.loadErrorHint')}
            retryLabel={t('common.retry')}
            onRetry={() => void detail.refetch()}
          />
        ) : (
          <>
            <FormSection title={t('student.sectionLinks')} spaced />
            {detail.isLoading && <AppSkeleton height="4rem" />}
            {detail.data && (detail.data.links.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>{t('student.noLinks')}</p>
            ) : (
              <ul className="space-y-2">
                {detail.data.links.map((link: StudentClientLogData) => (
                  <li
                    key={link.id}
                    className="flex items-center justify-between rounded border p-3"
                    style={{ borderColor: 'var(--surface-border)' }}
                  >
                    <span className="text-sm font-medium">{link.client_name}</span>
                    <span className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-color-secondary)' }}>
                      {link.ended_on === null && <AppTag value={t('student.linkCurrent')} severity="info" />}
                      {link.ended_on === null
                        ? t('student.linkSince', { date: formatMonthYear(link.started_on) })
                        : t('student.linkRange', { from: formatMonthYear(link.started_on), to: formatMonthYear(link.ended_on) })}
                    </span>
                  </li>
                ))}
              </ul>
            ))}

            <FormSection title={t('student.sectionTurmas')} spaced />
            {detail.isLoading && <AppSkeleton height="6rem" />}
            {detail.data && (
              <AppDataTable value={detail.data.turmas} emptyMessage={t('student.noTurmas')}>
                <AppColumn
                  header={t('student.turmaCode')}
                  body={(turma: StudentTurmaData) => (
                    <span className="font-mono text-sm" style={{ color: 'var(--primary-color)' }}>{turma.quote_code}</span>
                  )}
                />
                <AppColumn header={t('student.turmaCourse')} body={(turma: StudentTurmaData) => turma.course_name} />
                <AppColumn header={t('student.turmaDate')} body={(turma: StudentTurmaData) => formatMonthYear(turma.start_date)} />
                <AppColumn
                  header={t('student.turmaStatus')}
                  body={(turma: StudentTurmaData) => (
                    <AppTag
                      value={t(enrollmentStatusLabelKey(turma.approval_status))}
                      severity={enrollmentStatusSeverity(turma.approval_status)}
                    />
                  )}
                />
              </AppDataTable>
            )}
          </>
        ))}
      </section>
    </CrudDialog>
  )
}
