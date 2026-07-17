import { forwardRef } from 'react'
import { InputTextarea } from 'primereact/inputtextarea'
import type { InputTextareaProps } from 'primereact/inputtextarea'

export type AppTextareaProps = InputTextareaProps

/** Wrapper do InputTextarea. Cores vêm da folha de tema do Prime (ADR-16) — não
 * empilhe `dark:` aqui: o estado inválido (.p-invalid) precisa vencer. */
export const AppTextarea = forwardRef<HTMLTextAreaElement, AppTextareaProps>((props, ref) => (
  <InputTextarea ref={ref} {...props} />
))
AppTextarea.displayName = 'AppTextarea'
