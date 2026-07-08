import { forwardRef } from 'react'
import { InputText } from 'primereact/inputtext'
import type { InputTextProps } from 'primereact/inputtext'
import { IconField } from 'primereact/iconfield'
import { InputIcon } from 'primereact/inputicon'

// Estilo dark do input (tema PrimeReact é layout-only — ver ADR-16). Borda base
// não usa `!`, para o estado inválido (.p-invalid) continuar vencendo em vermelho.
const darkInput =
  'dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:placeholder:text-slate-500'

export interface AppInputTextProps extends InputTextProps {
  /** Classe de ícone primeicons à esquerda, ex.: "pi pi-envelope". */
  leftIcon?: string
}

export const AppInputText = forwardRef<HTMLInputElement, AppInputTextProps>(
  ({ leftIcon, ...props }, ref) => {
    if (!leftIcon) {
      return <InputText ref={ref} className={darkInput} {...props} />
    }
    return (
      <IconField iconPosition="left">
        <InputIcon className={`${leftIcon} dark:text-slate-400`} />
        <InputText ref={ref} {...props} className={`w-full ${darkInput}`} />
      </IconField>
    )
  },
)
AppInputText.displayName = 'AppInputText'
