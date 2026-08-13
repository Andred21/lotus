import { forwardRef } from 'react'
import { useTranslation } from 'react-i18next'
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
 * A largura do input é `w-full`, como o irmão AppInputText: `w-96` são 384px
 * absolutos que não encolhem e vazavam a viewport de 390px (C-2 do review de
 * 2026-08-12), levando o olho da senha para fora da tela. O `w-full` do
 * `inputClassName` não basta sozinho: quando há `toggleMask`, o Password
 * embrulha o <input> num IconField PRÓPRIO (`ptm('iconField')`,
 * password.cjs.js:737) que é shrink-to-fit, então o `w-full` resolvia contra um
 * pai sem largura e caía na largura intrínseca do input — 316px de teto, contra
 * os 384px do AppInputText irmão (UI-01 do review de 2026-08-13). Por isso a
 * largura é pinada também nesse nó, pelo `pt`.
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
      // O IconField interno do Password (o que abriga o olho) é shrink-to-fit e
      // não herda o `w-full` do input — ver o docblock. Pinado como o rótulo:
      // largura de campo não é opcional.
      iconField: { root: { className: 'w-full' } },
    }
    if (!leftIcon) {
      return (
        <Password
          inputRef={ref}
          toggleMask
          feedback={false}
          {...props}
          pt={{ ...pt, ...ariaPt }}
        />
      )
    }
    return (
      <IconField iconPosition="left">
        <InputIcon className={`${leftIcon} z-10`} />
        <Password
          inputRef={ref}
          toggleMask
          feedback={false}
          className="w-full"
          inputClassName="w-full pl-10"
          {...props}
          pt={{ ...pt, ...ariaPt }}
        />
      </IconField>
    )
  },
)
AppPassword.displayName = 'AppPassword'
