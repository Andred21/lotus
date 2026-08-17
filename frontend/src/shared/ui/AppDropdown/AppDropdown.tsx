import { Dropdown } from 'primereact/dropdown'
import type { DropdownProps } from 'primereact/dropdown'
import { useFieldProps } from '../FormField/fieldContext'

export type { DropdownProps as AppDropdownProps } from 'primereact/dropdown'

/** Wrapper do Dropdown. Largura total por default; cores vêm do tema (ADR-16).
 * `inputId`, não `id`: o `id` do Dropdown cai no nó raiz e só `inputId` alcança
 * o input focável (`dropdown.cjs.js:1577`) — pendurar `id` associaria a label a
 * uma `<div>`. */
export function AppDropdown(props: DropdownProps) {
  const fieldProps = useFieldProps('inputId')
  return <Dropdown className="w-full" {...fieldProps} {...props} />
}
