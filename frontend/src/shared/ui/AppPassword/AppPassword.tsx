import { forwardRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Password } from 'primereact/password'

import type { PasswordProps } from 'primereact/password'
import { IconField } from 'primereact/iconfield'
import { InputIcon } from 'primereact/inputicon'
import { mergePt } from '../mergePt'

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
 *
 * A largura é do WRAPPER nos DOIS ramos, não só no que tem ícone. Enquanto ela
 * dependia do chamador lembrar de `inputClassName`, o ramo sem ícone caía na
 * largura intrínseca do PrimeReact: 288px de input dentro de um campo de 719px,
 * com o olho ancorado 403px à direita do fim do input, e em 390px o input
 * vazando 42px além de um cartão `overflow-hidden` (UI-02 do review de
 * 2026-08-16 — o TERCEIRO achado de largura neste mesmo componente). Metade da
 * regra no wrapper e metade no chamador foi o que reproduziu o débito três
 * vezes. Mesclado, não cravado: o chamador acrescenta classe, não perde a
 * largura (idiom do `AppInputText`).
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
    // O olho é BOTÃO, não `switch`. O Prime crava `role="switch"` com
    // `aria-checked` fixo por ícone — `'true'` no showIcon e `'false'` no
    // hideIcon (password.cjs.js:600-615) —, e isso é o inverso do estado da
    // senha: com o campo mascarado o leitor de tela anunciava "Mostrar
    // contraseña, ativado" (UI-04 do review de 2026-08-13). Um controle cujo
    // NOME muda a cada clique é botão; switch tem nome estável e estado que
    // varia. Trocar o papel preserva os dois rótulos medidos na API instalada
    // (`passwordShow`/`passwordHide`) e apaga o estado que mentia.
    const togglePt = { role: 'button', 'aria-checked': undefined }
    const ariaPt = {
      showIcon: { ...togglePt, 'aria-label': t('common.showPassword') },
      hideIcon: { ...togglePt, 'aria-label': t('common.hidePassword') },
      // O IconField interno do Password (o que abriga o olho) é shrink-to-fit e
      // não herda o `w-full` do input — ver o docblock. Pinado como o rótulo:
      // largura de campo não é opcional.
      iconField: { root: { className: 'w-full' } },
    }
    // Fusão chave a chave, não spread raso: `{ ...pt, ...ariaPt }` cravava o
    // rótulo E apagava o resto da chave do chamador (`showIcon.className`,
    // `iconField.root.style`) em silêncio. O `pins` continua vencendo folha a
    // folha — nome acessível e largura de campo não são opcionais.
    const passwordPt = mergePt<PasswordProps['pt']>(pt, ariaPt)
    if (!leftIcon) {
      return (
        <Password
          inputRef={ref}
          toggleMask
          feedback={false}
          {...props}
          className={`w-full ${props.className ?? ''}`}
          inputClassName={`w-full ${props.inputClassName ?? ''}`}
          pt={passwordPt}
        />
      )
    }
    return (
      <IconField iconPosition="left">
        <InputIcon className={`${leftIcon} z-10`} />
        {/* Mesclado DEPOIS do spread, igual ao ramo sem ícone. Antes dele, um
            `inputClassName` do chamador apagava `w-full pl-10` inteiro — e o
            `pl-10` é o offset que impede o texto de correr por baixo do ícone,
            não enfeite. */}
        <Password
          inputRef={ref}
          toggleMask
          feedback={false}
          {...props}
          className={`w-full ${props.className ?? ''}`}
          inputClassName={`w-full pl-10 ${props.inputClassName ?? ''}`}
          pt={passwordPt}
        />
      </IconField>
    )
  },
)
AppPassword.displayName = 'AppPassword'
