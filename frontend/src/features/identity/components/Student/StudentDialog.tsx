import { useTranslation } from 'react-i18next'
import {
  CrudDialog, AppAvatar, AppButton, AppInputText, AppDropdown, AppTag, AppDataTable, AppColumn,
  AppSkeleton, AppErrorState, FormField, FormSection, FormErrorBanner,
} from '@shared/ui'
import type { StudentData, StudentTurmaData, StudentClientLogData } from '@shared/types/generated'
import type { DialogMode } from '@shared/lib'
import { clientsApi } from '@shared/api/clientsApi'
import { useStudentDetail } from '../../api/useStudentDetail'
import { useStudentForm } from '../../hooks/useStudentForm'

/**
 * Severidade do estado da matrícula. O helper equivalente vive em
 * `features/operation/lib/enrollmentStatus.ts` e NÃO pode ser importado daqui:
 * feature não importa outra feature, nem para tipo (ADR-05, lei §5.6). A chave
 * de i18n `operation.enrollment.status.*` é reusada porque chave de tradução não
 * é import de código.
 */
const APPROVAL_SEVERITY: Record<string, 'success' | 'danger' | 'info'> = {
  aprobado: 'success', reprobado: 'danger', pendiente: 'info',
}

const monthYear = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('es-CL', { month: 'short', year: 'numeric' })

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
  const { form, set, readOnly, submit, pending, fieldErrors, generalError } = useStudentForm(student, mode, onHide)
  // Só busca clientes no create: view/edit mostram current_client_name (já
  // vem no StudentData), sem chamada extra. O create em si segue exigindo só
  // identity.user.create (D8/StudentController) — quem tiver a permissão mas
  // não conseguir listar clientes (commercial.client.view) vê o motivo aqui,
  // em vez do botão sumir ou do dropdown ficar vazio sem explicação.
  const clients = clientsApi.useList({ enabled: mode === 'create' })
  // Bloqueia só quando NÃO há lista utilizável (ainda carregando, falhou sem
  // cache prévio, ou a lista veio vazia — `[]` é truthy, então checar só
  // `!clients.data` deixaria passar cliente nenhum pra escolher). Um refetch
  // em background que falha com `clients.data` já populado (retry manual,
  // refoco de aba) não deve travar um form que ainda tem opções válidas.
  const clientsUnusable = mode === 'create' && !clients.data?.length
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
      disabled={clientsUnusable}
      submitLabel={mode === 'create' ? t('student.create') : undefined}
      headerExtra={mode !== 'create' ? <AppAvatar name={form.name} size="normal" /> : null}
    >
      <FormErrorBanner message={generalError} />

      <section className="space-y-4">
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
                  options={(clients.data ?? []).map((c) => ({ label: c.legal_name, value: c.id }))}
                  onChange={(e) => set('client_id', e.value as number)}
                  className="w-full"
                />
                {clients.isError && (
                  <p
                    className="mt-1 flex items-center justify-between gap-2 text-xs"
                    style={{ color: 'color-mix(in srgb, var(--red-500) 70%, var(--text-color))' }}
                  >
                    <span>{clients.error?.detail ?? t('common.loadErrorHint')}</span>
                    <AppButton label={t('common.retry')} text onClick={() => void clients.refetch()} />
                  </p>
                )}
                {!clients.isError && clients.isSuccess && clients.data.length === 0 && (
                  <p className="mt-1 flex items-center justify-between gap-2 text-xs" style={{ color: 'var(--text-color-secondary)' }}>
                    <span>{t('student.noClientsAvailable')}</span>
                    <AppButton label={t('common.retry')} text onClick={() => void clients.refetch()} />
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

        {mode === 'view' && (
          <>
            <FormSection title={t('student.sectionLinks')} spaced />
            {detail.isLoading && <AppSkeleton height="4rem" />}
            {detail.isError && (
              <AppErrorState
                title={t('common.loadError')}
                detail={detail.error?.detail ?? t('common.loadErrorHint')}
                retryLabel={t('common.retry')}
                onRetry={() => void detail.refetch()}
              />
            )}
            {detail.data && (detail.data.links.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>{t('student.noLinks')}</p>
            ) : (
              <ul className="space-y-2">
                {detail.data.links.map((link: StudentClientLogData) => (
                  <li key={link.id} className="flex items-center justify-between rounded border border-slate-200 p-3 dark:border-slate-700">
                    <span className="text-sm font-medium">{link.client_name}</span>
                    <span className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-color-secondary)' }}>
                      {link.ended_on === null && <AppTag value={t('student.linkCurrent')} severity="info" />}
                      {link.ended_on === null
                        ? t('student.linkSince', { date: monthYear(link.started_on) })
                        : t('student.linkRange', { from: monthYear(link.started_on), to: monthYear(link.ended_on) })}
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
                <AppColumn header={t('student.turmaDate')} body={(turma: StudentTurmaData) => monthYear(turma.start_date)} />
                <AppColumn
                  header={t('student.turmaStatus')}
                  body={(turma: StudentTurmaData) => (
                    <AppTag
                      value={t(`operation.enrollment.status.${turma.approval_status}`)}
                      severity={APPROVAL_SEVERITY[turma.approval_status] ?? 'info'}
                    />
                  )}
                />
              </AppDataTable>
            )}
          </>
        )}
      </section>
    </CrudDialog>
  )
}
