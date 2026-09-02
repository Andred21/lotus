import { forwardRef, type ChangeEvent } from 'react'
import { InputTextarea } from 'primereact/inputtextarea'
import type { InputTextareaProps } from 'primereact/inputtextarea'
import { useFieldBind, useFieldProps } from '../FormField/fieldContext'

export type AppTextareaProps = InputTextareaProps

/** Wrapper do InputTextarea. Cores vêm da folha de tema do Prime (ADR-16) — não
 * empilhe `dark:` aqui: o estado inválido (.p-invalid) precisa vencer.
 * Associa-se sozinho ao rótulo quando está dentro de um `FormField` (P-37). */
export const AppTextarea = forwardRef<HTMLTextAreaElement, AppTextareaProps>((props, ref) => {
  const fieldProps = useFieldProps('id')
  // Fora do spread e com `?? ''`: mesma razão do `AppInputText`.
  const bind = useFieldBind((e: ChangeEvent<HTMLTextAreaElement>) => e.target.value)
  const value = (props.value ?? bind.value ?? '') as InputTextareaProps['value']
  const onChange = props.onChange ?? bind.onChange
  return <InputTextarea ref={ref} {...fieldProps} {...props} value={value} onChange={onChange} />
})
AppTextarea.displayName = 'AppTextarea'
