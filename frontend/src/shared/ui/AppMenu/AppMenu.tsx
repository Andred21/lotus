import { forwardRef } from 'react'
import { Menu } from 'primereact/menu'
import type { MenuProps } from 'primereact/menu'
import type { MenuItem as PrimeMenuItem } from 'primereact/menuitem'
import { primeIcon, type FlagClass, type IconProp } from '../AppIcon'

/** Item do menu com `icon` do registro (`IconName`) ou, só para a bandeira do
 * `LanguageMenu`, uma classe `FlagClass`; o resto de `MenuItem` segue como no Prime. */
export type AppMenuItem = Omit<PrimeMenuItem, 'icon'> & { icon?: IconProp | FlagClass }

export type AppMenuProps = Omit<MenuProps, 'model'> & { model?: AppMenuItem[] }

/** Menu popup do PrimeReact. Use ref.current?.toggle(event) para abrir. */
export const AppMenu = forwardRef<Menu, AppMenuProps>(({ model, ...props }, ref) => (
  <Menu
    ref={ref}
    {...props}
    model={model?.map((item) => ({ ...item, icon: primeIcon(item.icon) }))}
    popup
  />
))
AppMenu.displayName = 'AppMenu'

export type { PrimeMenuItem as MenuItem }
export type AppMenuRef = Menu
