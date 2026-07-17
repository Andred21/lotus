import { RadioButton } from 'primereact/radiobutton'
import type { RadioButtonProps } from 'primereact/radiobutton'

export type { RadioButtonProps as AppRadioButtonProps } from 'primereact/radiobutton'

/** Wrapper do RadioButton. Cores vêm da folha de tema do Prime (ADR-16) — não
 * empilhe `dark:` aqui. Sem forwardRef: o RadioButton do Prime é class
 * component e nenhum consumidor precisa da ref. */
export function AppRadioButton(props: RadioButtonProps) {
  return <RadioButton {...props} />
}
