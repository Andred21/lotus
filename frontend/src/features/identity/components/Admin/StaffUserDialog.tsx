import { useTranslation } from 'react-i18next'
import { CrudDialog, AppInputText, AppPassword, AppDropdown, AppTag, FormField, FormSection, FormErrorSummary, FormErrorBanner, AppPhotoField } from '@shared/ui'
import type { UserData } from '@shared/types/generated'
import type { DialogMode } from '@shared/lib'
import { rolesApi } from '@shared/api/rolesApi'
import { usersApi } from '@shared/api/usersApi'
import { useEntityPhoto } from '@shared/hooks'
import { useStaffUserForm } from '../../hooks/useStaffUserForm'

export function StaffUserDialog({
  visible, mode, user, canManage, onHide, onEdit,
}: {
  visible: boolean
  mode: DialogMode
  user: UserData | null
  canManage: boolean
  onHide: () => void
  onEdit?: () => void
}) {
  const { t } = useTranslation()
  const photo = useEntityPhoto({
    resource: 'users',
    id: mode === 'create' ? null : (user?.id ?? null),
    mode,
    url: user?.photo_url,
    invalidateKey: usersApi.keys.all,
  })

  const { form, set, readOnly, submit, pending, fieldErrors, generalError } =
    useStaffUserForm(user, mode, onHide, (created) => photo.flush(created.id as number))
  const roles = rolesApi.useList()

  // Roles atribuíveis: todas menos 'redator' (RN-01: redator tem tela própria).
  const roleOptions = (roles.data ?? [])
    .filter((r) => r.name !== 'redator')
    .map((r) => ({ label: r.name, value: r.name }))

  const stateOptions = [
    { label: t('common.active'), value: true },
    { label: t('common.inactive'), value: false },
  ]

  return (
    <CrudDialog
      visible={visible}
      mode={mode}
      title={mode === 'create' ? t('admin.new') : form.name}
      onHide={onHide}
      onEdit={canManage ? onEdit : undefined}
      onSubmit={submit}
      pending={pending}
      closeBlocked={pending || photo.pending}
      disabled={photo.pending}
      submitLabel={mode === 'create' ? t('admin.create') : undefined}
    >
      <FormErrorBanner message={generalError} />
      <FormErrorSummary errors={fieldErrors} mapped={['name', 'rut', 'email', 'password', 'role']} />
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

        <FormSection title={t('admin.sectionUser')} />

        <FormField label={t('admin.name')} error={fieldErrors?.name?.[0]}>
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
          <AppInputText value={form.phone} disabled={readOnly} onChange={(e) => set('phone', e.target.value)} className="w-full" />
        </FormField>

        {mode === 'create' && (
          <FormField label={t('common.password')} error={fieldErrors?.password?.[0]}>
            <AppPassword value={form.password} onChange={(e) => set('password', e.target.value)} className="w-full" inputClassName="w-full" />
          </FormField>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {/* type é sempre 'admin' para staff — atributo fixo, não editável.
              Tag em vez de input desabilitado: sinaliza "valor imutável", não
              "campo editável acinzentado". */}
          <FormField label={t('admin.type')}>
            <AppTag value={t('admin.typeAdmin')} severity="info" />
          </FormField>
          <FormField label={t('admin.role')} error={fieldErrors?.role?.[0]}>
            <AppDropdown value={form.role} options={roleOptions} optionLabel="label" optionValue="value" disabled={readOnly} onChange={(e) => set('role', e.value)} />
          </FormField>
        </div>

        <FormField label={t('admin.state')}>
          <AppDropdown value={form.is_active} options={stateOptions} optionLabel="label" optionValue="value" disabled={readOnly} onChange={(e) => set('is_active', e.value)} />
        </FormField>
      </section>
    </CrudDialog>
  )
}
