import { Button as PrimeButton } from 'primereact/button'
import type { ButtonProps } from 'primereact/button'
import { appButtonStyles, type AppButtonVariant } from './style'

export interface AppButtonProps extends ButtonProps {
  /** Estilo nomeado (ver AppButton/style.ts). Combinável com `className`. */
  variant?: AppButtonVariant
}

// Wrapper do Button do PrimeReact. O app inteiro importa daqui, nunca de
// 'primereact/button' direto. `variant` aplica um estilo do style.ts.
export function AppButton({ variant, className, ...props }: AppButtonProps) {
  const merged = [variant ? appButtonStyles[variant] : '', className]
    .filter(Boolean)
    .join(' ')

  return <PrimeButton className={merged || undefined} {...props} />
}
