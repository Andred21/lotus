import { useRolesPage } from '../../hooks/useRolesPage'
import { RolesTable } from './RolesTable'
import { RoleDialog } from './RoleDialog'
import { useTranslation } from 'react-i18next'
import { AppButton } from '@shared/ui'

/** A aba de roles inteira — tabela e diálogo.
 *
 * Existe para a query NÃO rodar fora do gate: `useRolesPage` chama
 * `GET /api/roles`, que desde a D-10 é `identity.access.manage`, e a
 * `AdministracionPage` a montava incondicionalmente — admin comum abriria a
 * tela com um 403 em voo. O componente só é renderizado sob `canManage`, então
 * o hook nem existe para quem não pode.
 *
 * `canManage` não entra como prop: quem monta este componente já provou a
 * permissão, e passá-la de volta permitiria montar sem ela. */
export function RolesTab() {
  const { t } = useTranslation()
  const rolesPage = useRolesPage()

  return (
    <>
      <RolesTable
        roles={rolesPage.items}
        loading={rolesPage.loading}
        error={rolesPage.error}
        onRetry={rolesPage.refetch}
        onView={rolesPage.openView}
        actions={<AppButton variant="primary" label={t('role.new')} icon="pi pi-plus" onClick={rolesPage.openCreate} />}
      />

      {rolesPage.dialog && (
        <RoleDialog
          visible
          mode={rolesPage.dialog.mode}
          role={rolesPage.dialog.entity}
          canManage
          onHide={rolesPage.close}
          onEdit={rolesPage.startEdit}
        />
      )}
    </>
  )
}
