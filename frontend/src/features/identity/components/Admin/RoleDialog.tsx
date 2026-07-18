import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { CrudDialog, AppInputText, AppCheckbox, FormField, FormErrorBanner } from '@shared/ui'
import type { RoleData, PermissionData } from '@shared/types/generated'
import type { DialogMode } from '@shared/lib'
import { usePermissionCatalog } from '../../api/usePermissionCatalog'
import { useRoleForm } from '../../hooks/useRoleForm'

export function RoleDialog({
  visible, mode, role, canManage, onHide, onEdit,
}: {
  visible: boolean
  mode: DialogMode
  role: RoleData | null
  canManage: boolean
  onHide: () => void
  onEdit?: () => void
}) {
  const { t } = useTranslation()
  const { form, set, toggle, readOnly, submit, pending, fieldErrors, generalError } = useRoleForm(role, mode, onHide)
  const catalog = usePermissionCatalog()

  const isSystem = role?.is_system ?? false
  // System role nunca edita (guard no backend); só superadmin vê a aba, mas o
  // botão Editar não aparece para role de sistema.
  const editable = !readOnly && !isSystem

  // Agrupa o catálogo por domínio; no picker, esconde as segregadas.
  const groups = useMemo(() => {
    const perms = (catalog.data ?? []).filter((p) => editable ? !p.segregated : true)
    return Object.entries(
      perms.reduce<Record<string, PermissionData[]>>((acc, p) => {
        ;(acc[p.group] ??= []).push(p)
        return acc
      }, {}),
    )
  }, [catalog.data, editable])

  const has = (name: string) => form.permissions.includes(name)

  return (
    <CrudDialog
      visible={visible}
      mode={mode}
      title={mode === 'create' ? t('role.new') : form.name}
      onHide={onHide}
      onEdit={canManage && !isSystem ? onEdit : undefined}
      onSubmit={submit}
      pending={pending}
      submitLabel={mode === 'create' ? t('admin.create') : undefined}
    >
      <FormErrorBanner message={generalError} />

      <section className="space-y-4">
        <FormField label={t('role.name')} error={fieldErrors?.name?.[0]}>
          <AppInputText value={form.name} disabled={!editable} onChange={(e) => set('name', e.target.value)} className="w-full" />
        </FormField>

        {isSystem && (
          <p className="text-sm text-slate-500">{t('role.systemReadOnly')}</p>
        )}

        <div className="space-y-4">
          <h3 className="text-xs font-semibold uppercase text-slate-500">{t('role.permissions')}</h3>
          {groups.map(([group, perms]) => (
            <div key={group} className="space-y-2">
              <p className="text-xs font-medium capitalize text-slate-400">{group}</p>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {perms.map((p) => (
                  <label key={p.name} className="flex items-start gap-2 text-sm">
                    <AppCheckbox
                      inputId={p.name}
                      checked={has(p.name)}
                      disabled={!editable}
                      onChange={() => toggle(p.name)}
                    />
                    <span>{p.description}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </CrudDialog>
  )
}
