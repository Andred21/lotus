import { usePermissions } from '@shared/hooks'
import { AdministracionPage } from '@features/identity/components/AdministracionPage'
import { ConfiguracionTab } from './ConfiguracionTab'

/**
 * Rota de Administración. Entrega à página a aba Configuración só para quem tem
 * `certification.settings.manage` (hoje, o superadmin). A API é a fronteira
 * autoritativa; esconder a aba é conveniência de interface.
 */
export function AdministracionRoute() {
  const { can } = usePermissions()

  return (
    <AdministracionPage
      configuracion={can('certification.settings.manage') ? <ConfiguracionTab /> : undefined}
    />
  )
}
