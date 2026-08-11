import { AppDivider, AppHeader, AppearanceControls, Clock } from '@shared/ui'
import { UserMenu } from './UserMenu'

/** Barra utilitária do shell: controles, relógio e usuário. O título de página
 * tem UM dono — o PageHeader (UI-05 do review de 2026-08-11). */
export function Header() {
  return (
    <AppHeader className="min-h-14 border-(--surface-border) bg-(--brand-navy) px-3 py-2 sm:px-6">
      <div className="ml-auto flex items-center gap-2 sm:gap-4">
        <AppearanceControls />
        <AppDivider layout="vertical" className="mx-0! h-6 hidden sm:block" />
        <Clock className="hidden md:block" />
        <UserMenu />
      </div>
    </AppHeader>
  )
}
