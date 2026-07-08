import { forwardRef } from 'react'
import { Password } from 'primereact/password'

import type { PasswordProps } from 'primereact/password'
import { IconField } from 'primereact/iconfield'
import { InputIcon } from 'primereact/inputicon'

// Estilo dark do input (tema PrimeReact é layout-only — ver ADR-16). Borda base
// não usa `!`, para o estado inválido (.p-invalid) continuar vencendo em vermelho.
const darkInput =
  'dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:placeholder:text-slate-500'

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
      return (
        <Password
          inputRef={ref}
          toggleMask
          feedback={false}
          inputClassName={darkInput}
          {...props}
        />
      )
    }
    return (
      <IconField iconPosition="left">
        <InputIcon className={`${leftIcon} z-10 dark:text-slate-400`} />
        <Password
          inputRef={ref}
          toggleMask
          feedback={false}
          className="w-full dark:text-slate-400"
          inputClassName={`w-96 pl-10 ${darkInput}`}
          {...props}
        />
      </IconField>
    )
  },
)
AppPassword.displayName = 'AppPassword'
