import { forwardRef } from 'react'
import { Password } from 'primereact/password'

import type { PasswordProps } from 'primereact/password'
import { IconField } from 'primereact/iconfield'
import { InputIcon } from 'primereact/inputicon'

export interface AppPasswordProps extends PasswordProps {
  /** Classe de ícone primeicons à esquerda, ex.: "pi pi-lock". */
  leftIcon?: string
}

/**
 * Wrapper do Password do PrimeReact. `toggleMask` (olho) e `feedback={false}`
 * por padrão. Usa IconField/InputIcon (igual ao AppInputText) para o ícone da
 * esquerda. Como o Password aninha o <input> dentro de um <span.p-password>, o
 * padding automático do tema (`.p-icon-field-left > .p-inputtext`, filho direto)
 * não alcança o input — por isso o `pl-10` (2.5rem, o mesmo offset do IconField).
 */
export const AppPassword = forwardRef<HTMLInputElement, AppPasswordProps>(
  ({ leftIcon, ...props }, ref) => {
    if (!leftIcon) {
      return <Password inputRef={ref} toggleMask feedback={false} {...props} />
    }
    return (
      <IconField iconPosition="left">
        <InputIcon className={`${leftIcon} z-10`} />
        <Password
          inputRef={ref}
          toggleMask
          feedback={false}
          className="w-full "
          inputClassName="w-96 pl-10"
          {...props}
        />
      </IconField>
    )
  },
)
AppPassword.displayName = 'AppPassword'
