import { forwardRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Password } from 'primereact/password'

import type { PasswordProps } from 'primereact/password'
import { IconField } from 'primereact/iconfield'
import { InputIcon } from 'primereact/inputicon'

// Estilo dark do input (tema PrimeReact é layout-only — ver ADR-16). Borda base
// não usa `!`, para o estado inválido (.p-invalid) continuar vencendo em vermelho.
const darkInput =
  'dark:bg-[var(--surface-card)] dark:border-[var(--surface-border)] dark:text-[var(--text-color)] ' +
  'dark:placeholder:text-[var(--text-color-secondary)]'

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
 * A largura do input é `w-full`, como o irmão AppInputText: `w-96` são 384px
 * absolutos que não encolhem e vazavam a viewport de 390px (C-2 do review de
 * 2026-08-12), levando o olho da senha para fora da tela.
 */
export const AppPassword = forwardRef<HTMLInputElement, AppPasswordProps>(
  ({ leftIcon, pt, ...props }, ref) => {
    const { t } = useTranslation()
    // Nome acessível do olho. O default do Prime é "Show/Hide Password" em
    // inglês (password.cjs.js:605,614) e chega a TODA tela com senha — o
    // wrapper é a única porta (UI-08). Não vai pela locale global do Prime:
    // `locale('es')` nunca é chamado no projeto (primeLocale.ts só faz
    // `addLocale`), então um rótulo pendurado lá ficaria congelado na troca de
    // idioma. Pinado DEPOIS do `pt` do chamador: nome acessível não é opcional.
    const ariaPt = {
      showIcon: { 'aria-label': t('common.showPassword') },
      hideIcon: { 'aria-label': t('common.hidePassword') },
    }
    if (!leftIcon) {
      return (
        <Password
          inputRef={ref}
          toggleMask
          feedback={false}
          inputClassName={darkInput}
          {...props}
          pt={{ ...pt, ...ariaPt }}
        />
      )
    }
    return (
      <IconField iconPosition="left">
        <InputIcon className={`${leftIcon} z-10 dark:text-[var(--text-color-secondary)]`} />
        <Password
          inputRef={ref}
          toggleMask
          feedback={false}
          className="w-full dark:text-[var(--text-color-secondary)]"
          inputClassName={`w-full pl-10 ${darkInput}`}
          {...props}
          pt={{ ...pt, ...ariaPt }}
        />
      </IconField>
    )
  },
)
AppPassword.displayName = 'AppPassword'
