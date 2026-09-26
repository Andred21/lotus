import { useTranslation } from 'react-i18next'
import { rolesApi } from '@shared/api/rolesApi'
import { roleLabel } from '@shared/lib'

/** Roles atribuíveis a um usuário de staff: todas menos `redator`, que tem tela
 * própria (RN-01). Sem estados de erro expostos: o dropdown vazio em falha de
 * GET é o comportamento de hoje, e mudá-lo sairia do "comportamento idêntico"
 * deste bloco. */
export function useStaffRoleOptions() {
  const { t } = useTranslation()
  const roles = rolesApi.useAssignable()

  return {
    roleOptions: (roles.data ?? [])
      .filter((r) => r.name !== 'redator')
      .map((r) => ({ label: roleLabel(r.name, t), value: r.name })),
  }
}
