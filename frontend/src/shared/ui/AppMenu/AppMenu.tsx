import { forwardRef, isValidElement, type ReactElement } from 'react'
import { Menu } from 'primereact/menu'
import type { MenuProps } from 'primereact/menu'
import type { MenuItem as PrimeMenuItem } from 'primereact/menuitem'
import { primeIcon, type IconProp } from '../AppIcon'

/** Item do menu com `icon` do registro (`IconName`) ou, para o que o registro não
 * cobre (a bandeira do `LanguageMenu`), um elemento pronto; o resto de `MenuItem`
 * segue como no Prime. */
export type AppMenuItem = Omit<PrimeMenuItem, 'icon' | 'items'> & {
  icon?: IconProp | ReactElement
  items?: AppMenuItem[]
}

/** Traduz o `icon` do registro em cada nível, para o item aninhado passar pelo mesmo caminho. */
function toPrimeItem({ icon, items, ...item }: AppMenuItem): PrimeMenuItem {
  return {
    ...item,
    icon: isValidElement(icon) ? icon : primeIcon(icon),
    items: items?.map(toPrimeItem),
  }
}

export type AppMenuProps = Omit<MenuProps, 'model'> & { model?: AppMenuItem[] }

/** Menu popup do PrimeReact. Use ref.current?.toggle(event) para abrir. */
export const AppMenu = forwardRef<Menu, AppMenuProps>(({ model, ...props }, ref) => (
  <Menu
    ref={ref}
    {...props}
    model={model?.map(toPrimeItem)}
    popup
  />
))
AppMenu.displayName = 'AppMenu'

/** Alias de `AppMenuItem`: o `MenuItem` do Prime tem `icon?: any` e deixaria passar nome errado. */
export type { AppMenuItem as MenuItem }
export type AppMenuRef = Menu
