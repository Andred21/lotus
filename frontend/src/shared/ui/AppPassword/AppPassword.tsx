import { forwardRef } from 'react'
import { Password } from 'primereact/password'
import type { PasswordProps } from 'primereact/password'
import { IconField } from 'primereact/iconfield'
import { InputIcon } from 'primereact/inputicon'

export interface AppPasswordProps extends PasswordProps {
  /** Classe de ícone primeicons à esquerda, ex.: "pi pi-lock". */
  leftIcon?: string
}

export const AppPassword = forwardRef<HTMLInputElement, AppPasswordProps>(
  ({ leftIcon, ...props }, ref) => {
    const password = (
      <Password
        inputRef={ref}
        toggleMask
        feedback={false}
        {...props}
      />
    )
    if (!leftIcon) return password
    return (
      <IconField iconPosition="left">
        <InputIcon className={leftIcon} />
        {password}
      </IconField>
    )
  },
)
AppPassword.displayName = 'AppPassword'
