import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { CrudDialog, AppInputText, AppCheckbox, FormSection, FormErrorSummary, FormErrorBanner, useFormField } from '@shared/ui'
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
  const f = useRoleForm(role, mode, onHide)
  const { form, toggle, readOnly, submit, pending, fieldErrors, generalError, errorSummary } = f
  const Field = useFormField(f)
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
      {/* `name` mostra o próprio erro no FormField; um 422 keyed `permissions`
          (assertAssignable) ou `permissions.N` (DTO) não tem input onde pendurar
          — sem isto o save falha em silêncio. */}
      <FormErrorSummary errors={fieldErrors} {...errorSummary} />

      <section className="space-y-4">
        {/* O bundle TEM `readOnly`, mas o campo aqui é input desabilitado, não
            texto — herdar do contexto trocaria o modo de leitura sem
            autorização. `readOnly={false}` explícito mantém o `Field` sempre
            em modo de controle; quem desabilita é o `disabled` de baixo. */}
        {/* eslint-disable-next-line react-hooks/static-components -- Field é o retorno estável de useFormField (§4.2 da spec) */}
        <Field name="name" label={t('role.name')} readOnly={false}>
          <AppInputText disabled={!editable} className="w-full" />
        </Field>

        {isSystem && (
          <p className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>{t('role.systemReadOnly')}</p>
        )}

        <div className="space-y-4">
          <FormSection title={t('role.permissions')} />
          {groups.map(([group, perms]) => (
            <div key={group} className="space-y-2">
              <p className="text-xs font-medium" style={{ color: 'var(--text-color-secondary)' }}>{t(`permGroup.${group}`)}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {perms.map((p) => (
                  <label key={p.name} className="flex items-start gap-2 text-sm">
                    <AppCheckbox
                      inputId={p.name}
                      checked={has(p.name)}
                      disabled={!editable}
                      onChange={() => toggle(p.name)}
                    />
                    <span>{t(`perm.${p.name.replace(/\./g, '_')}`)}</span>
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
