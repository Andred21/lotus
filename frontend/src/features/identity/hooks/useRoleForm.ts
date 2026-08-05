import { useCrudForm } from '@shared/hooks'
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

  const { crud } = useCrudForm<RoleFormFields, RoleData>(rolesApi, {
    entity,
    mode,
    empty: EMPTY,
    toPayload: (f) => ({ name: f.name, permissions: f.permissions }),
    mapped: ['name'],
    // Os checkboxes de permissão não passam `error=` ao FormField: quem mostra
    // um 422 em `permissions` é o resumo.
    summaryOnly: ['permissions'],
    onDone,
  })

  function toggle(name: string) {
    crud.set(
      'permissions',
      crud.form.permissions.includes(name)
        ? crud.form.permissions.filter((p) => p !== name)
        : [...crud.form.permissions, name],
    )
  }

  return { ...crud, toggle }
}
