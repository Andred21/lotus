import { Checkbox } from 'primereact/checkbox'
import type { CheckboxProps } from 'primereact/checkbox'

export type { CheckboxProps as AppCheckboxProps } from 'primereact/checkbox'

/** Wrapper do Checkbox. Cores vêm da folha de tema do Prime (ADR-16) — não
 * empilhe `dark:` aqui. Sem forwardRef: Checkbox do Prime é class component e
 * nenhum consumidor precisa da ref. */
export function AppCheckbox(props: CheckboxProps) {
  return <Checkbox {...props} />
}
