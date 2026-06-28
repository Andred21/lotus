import { Button as PrimeButton } from 'primereact/button'
import type { ButtonProps } from 'primereact/button'

// Seu Button embrulha o do PrimeReact.
// O app inteiro importa daqui, nunca de 'primereact/button' direto.
export function AppButton(props: ButtonProps) {
  return <PrimeButton {...props} />
}