import { forwardRef } from 'react'
import { InputText } from 'primereact/inputtext'
import type { InputTextProps } from 'primereact/inputtext'
import { IconField } from 'primereact/iconfield'
import { InputIcon } from 'primereact/inputicon'
import { useFieldProps } from '../FormField/fieldContext'

export interface AppInputTextProps extends InputTextProps {
  /** Classe de ícone primeicons à esquerda, ex.: "pi pi-envelope". */
  leftIcon?: string
}

/** Wrapper do InputText. Cores vêm da folha de tema do Prime (ADR-16) — não
 * empilhe `dark:` aqui: o estado inválido (.p-invalid) precisa vencer.
 * O ícone também não precisa de cor: `.p-icon-field-left > .p-input-icon` já é
 * pintado pelas duas folhas do Lara, com especificidade que vence utility. */
export const AppInputText = forwardRef<HTMLInputElement, AppInputTextProps>(
  ({ leftIcon, ...props }, ref) => {
    // Antes do spread do chamador: a associação é default, não imposição — quem
    // passa `id` próprio continua vencendo (P-37, spec D5).
    const fieldProps = useFieldProps('id')

    if (!leftIcon) {
      return <InputText ref={ref} {...fieldProps} {...props} />
    }
    return (
      <IconField iconPosition="left">
        <InputIcon className={leftIcon} />
        <InputText ref={ref} {...fieldProps} {...props} className={`w-full ${props.className ?? ''}`} />
      </IconField>
    )
  },
)
AppInputText.displayName = 'AppInputText'
