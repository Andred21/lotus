import { forwardRef, type ChangeEvent } from 'react'
import { InputText } from 'primereact/inputtext'
import type { InputTextProps } from 'primereact/inputtext'
import { IconField } from 'primereact/iconfield'
import { InputIcon } from 'primereact/inputicon'
import { useFieldBind, useFieldProps } from '../FormField/fieldContext'

export interface AppInputTextProps extends InputTextProps {
  /** Classe de ícone primeicons à esquerda, ex.: "pi pi-envelope". */
  leftIcon?: string
}

/** Wrapper do InputText. Cores vêm da folha de tema do Prime (ADR-16) — não
 * empilhe `dark:` aqui: o estado inválido (.p-invalid) precisa vencer.
 * O ícone também não precisa de cor: `.p-icon-field-left > .p-input-icon` já é
 * pintado pelas duas folhas do Lara, com especificidade que vence utility. */
export const AppInputText = forwardRef<HTMLInputElement, AppInputTextProps>(
  ({ leftIcon, ...props }, ref) => {
    // Antes do spread do chamador: a associação é default, não imposição — quem
    // passa `id` próprio continua vencendo (P-37, spec D5).
    const fieldProps = useFieldProps('id')
    // Fora do spread, de propósito: `value={undefined}` explícito vencendo pelo
    // spread transformaria controlado em não-controlado. `?? ''` SÓ no valor
    // que veio do bind — um `AppInputText` solto (fora de `FormField`/`Field`
    // e sem `value` do chamador) precisa continuar `undefined`, isto é,
    // não-controlado e digitável; aplicar `?? ''` ao resultado final também
    // fora do bind o transformava em controlado com `''` e `onChange`
    // indefinido, e o campo travava. O `?? ''` aqui existe porque campo de
    // texto com `null` é aviso do React, e o backend manda `null` em campo
    // opcional (spec §4.5).
    const bind = useFieldBind((e: ChangeEvent<HTMLInputElement>) => e.target.value)
    const value = (props.value ?? ('value' in bind ? (bind.value ?? '') : undefined)) as InputTextProps['value']
    const onChange = props.onChange ?? bind.onChange

    if (!leftIcon) {
      return <InputText ref={ref} {...fieldProps} {...props} value={value} onChange={onChange} />
    }
    return (
      <IconField iconPosition="left">
        <InputIcon className={leftIcon} />
        <InputText
          ref={ref}
          {...fieldProps}
          {...props}
          value={value}
          onChange={onChange}
          className={`w-full ${props.className ?? ''}`}
        />
      </IconField>
    )
  },
)
AppInputText.displayName = 'AppInputText'
