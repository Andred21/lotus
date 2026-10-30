import { forwardRef, useState, type ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { InputTextarea } from 'primereact/inputtextarea'
import type { InputTextareaProps } from 'primereact/inputtextarea'
import { useFieldBind, useFieldProps } from '../FormField/fieldContext'

export type AppTextareaProps = InputTextareaProps & {
  /** Com `maxLength`, mostra "n / máximo" sob o campo (avisa com `aria-live`
   * polite). Sem `maxLength` não há o que contar e nada aparece. */
  showCount?: boolean
}

/** Wrapper do InputTextarea. Cores vêm da folha de tema do Prime (ADR-16) — não
 * empilhe `dark:` aqui: o estado inválido (.p-invalid) precisa vencer.
 * Associa-se sozinho ao rótulo quando está dentro de um `FormField` (P-37). */
export const AppTextarea = forwardRef<HTMLTextAreaElement, AppTextareaProps>(
  ({ showCount, ...props }, ref) => {
    const { t } = useTranslation()
    const fieldProps = useFieldProps('id')
    // Fora do spread e com `?? ''` SÓ no valor do bind: mesma razão do
    // `AppInputText` — solto e sem `value` do chamador, o campo precisa
    // continuar `undefined` (não-controlado, digitável).
    const bind = useFieldBind((e: ChangeEvent<HTMLTextAreaElement>) => e.target.value)
    const value = (props.value ?? ('value' in bind ? (bind.value ?? '') : undefined)) as InputTextareaProps['value']
    const onChange = props.onChange ?? bind.onChange
    // Só o campo não-controlado precisa lembrar o que foi digitado: com `value`
    // a contagem sai dele.
    const [typed, setTyped] = useState(0)
    const contar = showCount && props.maxLength !== undefined

    const field = (
      <InputTextarea
        ref={ref}
        {...fieldProps}
        {...props}
        value={value}
        onChange={
          contar && value === undefined
            ? (e) => {
                setTyped(e.target.value.length)
                onChange?.(e)
              }
            : onChange
        }
      />
    )
    if (!contar) return field

    const count = value === undefined ? typed : String(value ?? '').length
    return (
      <>
        {field}
        <p
          aria-live="polite"
          className="mt-1 text-right text-xs"
          style={{ color: 'var(--text-color-secondary)' }}
        >
          {t('common.charCount', { count, max: props.maxLength })}
        </p>
      </>
    )
  },
)
AppTextarea.displayName = 'AppTextarea'
