import { forwardRef, useState, type ClipboardEvent } from 'react'
import { formatRutInput, isRutValid } from '../../lib/rut'
import { AppInputText, type AppInputTextProps } from '../AppInputText'
import { useFieldBind } from '../FormField/fieldContext'

export interface RutInputProps extends Omit<AppInputTextProps, 'value' | 'onChange'> {
  /** Ausentes dentro de um `Field` ligado a form: o bind do campo é o default. */
  value?: string
  onChange?: (formatted: string) => void
}

/** Campo de RUT com máscara progressiva (`12.345.678-5`). Entrega ao chamador o
 * valor JÁ formatado — o mesmo que o backend grava. `aria-invalid` vem do
 * módulo 11 só depois do blur e é dica: a autoridade é o backend. */
export const RutInput = forwardRef<HTMLInputElement, RutInputProps>(
  ({ value: valueProp, onChange: onChangeProp, onBlur, onPaste, ...props }, ref) => {
    const [touched, setTouched] = useState(false)
    const bind = useFieldBind((formatted: string) => formatted)
    const value = valueProp ?? (typeof bind.value === 'string' ? bind.value : '')
    const onChange = onChangeProp ?? bind.onChange
    const invalid = touched && value !== '' && !isRutValid(value)

    // `maxLength` do navegador corta o texto colado ANTES do onChange — e com
    // espaço ou ponto a mais perderia o DV. Colar é refeito aqui, na máscara.
    const paste = (e: ClipboardEvent<HTMLInputElement>) => {
      onPaste?.(e)
      if (e.defaultPrevented) return
      e.preventDefault()
      const el = e.currentTarget
      const from = el.selectionStart ?? value.length
      const to = el.selectionEnd ?? value.length
      onChange?.(formatRutInput(value.slice(0, from) + e.clipboardData.getData('text') + value.slice(to)))
    }

    return (
      <AppInputText
        ref={ref}
        inputMode="text"
        maxLength={12}
        {...props}
        {...(invalid ? { invalid: true, 'aria-invalid': true } : {})}
        value={value}
        onChange={(e) => onChange?.(formatRutInput(e.target.value))}
        onBlur={(e) => {
          setTouched(true)
          onBlur?.(e)
        }}
        onPaste={paste}
      />
    )
  },
)
RutInput.displayName = 'RutInput'
