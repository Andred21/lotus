import { useTranslation } from 'react-i18next'
import { CrudDialog, AppInputText, AppPassword, AppDropdown, FormField, FormErrorBanner } from '@shared/ui'
import type { UserData } from '@shared/types/generated'
import type { DialogMode } from '@shared/lib'
import { rolesApi } from '@shared/api/rolesApi'
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
  const { form, set, readOnly, submit, pending, fieldErrors, generalError } = useStaffUserForm(user, mode, onHide)
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
      submitLabel={mode === 'create' ? t('admin.create') : undefined}
    >
      <FormErrorBanner message={generalError} />

      <section className="space-y-4">
        <h3 className="text-xs font-semibold uppercase text-slate-500">{t('admin.sectionUser')}</h3>

        <FormField label={t('admin.name')} error={fieldErrors?.name?.[0]}>
          <AppInputText value={form.name} disabled={readOnly} onChange={(e) => set('name', e.target.value)} className="w-full" />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
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

        <div className="grid grid-cols-2 gap-4">
          {/* type é sempre 'admin' para staff — read-only, reforça a distinção type vs role */}
          <FormField label={t('admin.type')}>
            <AppInputText value={t('admin.typeAdmin')} disabled className="w-full" />
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
