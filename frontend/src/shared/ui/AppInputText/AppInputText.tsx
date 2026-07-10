import { forwardRef } from 'react'
import { InputText } from 'primereact/inputtext'
import type { InputTextProps } from 'primereact/inputtext'
import { IconField } from 'primereact/iconfield'
import { InputIcon } from 'primereact/inputicon'

export interface AppInputTextProps extends InputTextProps {
  /** Classe de ícone primeicons à esquerda, ex.: "pi pi-envelope". */
  leftIcon?: string
}

/** Wrapper do InputText. Cores vêm da folha de tema do Prime (ADR-16) — não
 * empilhe `dark:` aqui: o estado inválido (.p-invalid) precisa vencer. */
export const AppInputText = forwardRef<HTMLInputElement, AppInputTextProps>(
  ({ leftIcon, ...props }, ref) => {
    if (!leftIcon) {
      return <InputText ref={ref} {...props} />
    }
    return (
      <IconField iconPosition="left">
        <InputIcon className={leftIcon} />
        <InputText ref={ref} {...props} className={`w-full ${props.className ?? ''}`} />
      </IconField>
    )
  },
)
AppInputText.displayName = 'AppInputText'
