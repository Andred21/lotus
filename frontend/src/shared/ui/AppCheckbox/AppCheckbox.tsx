import { Checkbox } from 'primereact/checkbox'
import type { CheckboxProps } from 'primereact/checkbox'
import { primeSlotIcon } from '../AppIcon'

// 16px: dentro da caixa de 22px (borda de 2px) sobram 18px. O Phosphor não leva `.p-icon`,
// então o 14px do tema não o alcança.
const CHECK_ICON = primeSlotIcon('check', 16)

export type { CheckboxProps as AppCheckboxProps } from 'primereact/checkbox'

/** Wrapper do Checkbox. Cores vêm da folha de tema do Prime (ADR-16) — não
 * empilhe `dark:` aqui. Sem forwardRef: Checkbox do Prime é class component e
 * nenhum consumidor precisa da ref. */
export function AppCheckbox(props: CheckboxProps) {
  return <Checkbox icon={CHECK_ICON} {...props} />
}
