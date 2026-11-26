import { Checkbox } from 'primereact/checkbox'
import type { CheckboxProps } from 'primereact/checkbox'
import { primeSlotIcon } from '../AppIcon'

// 14px: o tema crava o check do Prime em 14px (`.p-checkbox-icon.p-icon`).
const CHECK_ICON = primeSlotIcon('check', 14)

export type { CheckboxProps as AppCheckboxProps } from 'primereact/checkbox'

/** Wrapper do Checkbox. Cores vêm da folha de tema do Prime (ADR-16) — não
 * empilhe `dark:` aqui. Sem forwardRef: Checkbox do Prime é class component e
 * nenhum consumidor precisa da ref. */
export function AppCheckbox(props: CheckboxProps) {
  return <Checkbox icon={CHECK_ICON} {...props} />
}
