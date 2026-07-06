import { forwardRef } from 'react'
import { Menu } from 'primereact/menu'
import type { MenuProps } from 'primereact/menu'

/** Menu popup do PrimeReact. Use ref.current?.toggle(event) para abrir. */
export const AppMenu = forwardRef<Menu, MenuProps>((props, ref) => (
  <Menu ref={ref} {...props} popup />
))
AppMenu.displayName = 'AppMenu'

export type { MenuItem } from 'primereact/menuitem'
export type AppMenuRef = Menu
