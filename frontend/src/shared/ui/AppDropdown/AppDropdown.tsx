import { Dropdown } from 'primereact/dropdown'
import type { DropdownProps } from 'primereact/dropdown'

export type { DropdownProps as AppDropdownProps } from 'primereact/dropdown'

/** Wrapper do Dropdown. Largura total por default; cores vêm do tema (ADR-16). */
export function AppDropdown(props: DropdownProps) {
  return <Dropdown className="w-full" {...props} />
}
