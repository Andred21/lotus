import { useEntityForm, useMutationErrors } from '@shared/hooks'
import type { RoleData } from '@shared/types/generated'
import type { DialogMode } from '@shared/lib'
import { rolesApi } from '@shared/api/rolesApi'

export type RoleFormFields = {
  id?: number
  name: string
  permissions: string[]
}

const EMPTY: RoleFormFields = { id: undefined, name: '', permissions: [] }

export function useRoleForm(role: RoleData | null, mode: DialogMode, onDone: () => void) {
  const entity: RoleFormFields | null = role
    ? { id: role.id, name: role.name, permissions: role.permissions }
    : null
  const { form, set, readOnly } = useEntityForm<RoleFormFields>(entity, mode, EMPTY)

  const create = rolesApi.useCreate()
  const update = rolesApi.useUpdate()

  function toggle(name: string) {
    set(
      'permissions',
      form.permissions.includes(name)
        ? form.permissions.filter((p) => p !== name)
        : [...form.permissions, name],
    )
  }

  function submit() {
    const payload = { name: form.name, permissions: form.permissions }
    if (mode === 'create') {
      create.mutate(payload, { onSuccess: onDone })
    } else {
      update.mutate({ id: form.id!, payload }, { onSuccess: onDone })
    }
  }

  const { fieldErrors, generalError } = useMutationErrors([create.error, update.error])

  return {
    form, set, toggle, readOnly, submit,
    pending: create.isPending || update.isPending,
    fieldErrors, generalError,
  }
}
