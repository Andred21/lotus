import { Dropdown } from 'primereact/dropdown'
import type { DropdownProps } from 'primereact/dropdown'

export function AppDropdown(props: DropdownProps) {
  return (
    <Dropdown
      className="w-full dark:bg-slate-800 dark:border-slate-600"
      {...props}
    />
  )
}
