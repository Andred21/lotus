import { forwardRef } from 'react'
import { Menu } from 'primereact/menu'
import type { MenuProps } from 'primereact/menu'

/** Menu popup do PrimeReact. Use ref.current?.toggle(event) para abrir. */
export const AppMenu = forwardRef<Menu, MenuProps>((props, ref) => (
  <Menu ref={ref} popup {...props} />
))
AppMenu.displayName = 'AppMenu'
