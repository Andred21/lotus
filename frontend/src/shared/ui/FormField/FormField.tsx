import type { ReactNode } from 'react'

export type FormFieldProps = {
  label: string
  error?: string
  children: ReactNode
}

/** Campo de formulário: label + controle + mensagem de erro do backend. */
export function FormField({ label, error, children }: FormFieldProps) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-slate-600 dark:text-slate-300">{label}</span>
      {children}
      {error && <span className="mt-1 block text-sm text-red-600">{error}</span>}
    </label>
  )
}

export type NestedFieldProps = {
  error?: string
  children: ReactNode
}

/** Campo aninhado (linhas de contato/endereço/módulo): sem label própria, mas
 * com o erro do backend visível. Sem isso, um 422 em `contacts.0.name` deixa o
 * botão de salvar aparentemente inerte. */
export function NestedField({ error, children }: NestedFieldProps) {
  return (
    <div>
      {children}
      {error && <span className="mt-1 block text-sm text-red-600">{error}</span>}
    </div>
  )
}

export type FormErrorSummaryProps = {
  errors?: Record<string, string[]> | null
  /** Campos que TÊM input na tela (já mostram o próprio erro). */
  mapped: string[]
  /** Prefixos de chave a ignorar porque já aparecem noutro lugar (ex.:
   * `['contacts.']` quando cada contato mostra o próprio erro num NestedField). */
  excludePrefixes?: string[]
}

/** Resumo dos 422 cujo campo não tem input na tela — sem ele, um erro fora dos
 * campos visíveis some e o botão de salvar parece inerte. */
export function FormErrorSummary({ errors, mapped, excludePrefixes = [] }: FormErrorSummaryProps) {
  if (!errors) return null
  const leftover = Object.entries(errors).filter(
    ([key]) => !mapped.includes(key) && !excludePrefixes.some((p) => key.startsWith(p)),
  )
  if (leftover.length === 0) return null
  return (
    <ul className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
      {leftover.map(([key, msgs]) => (
        <li key={key}>{msgs[0]}</li>
      ))}
    </ul>
  )
}

export type FormErrorBannerProps = {
  message?: string | null
  variant?: 'box' | 'inline'
}

/** Banner de erro geral (não-422, ou 422 sem campo na tela). `role="alert"` para
 * leitor de tela. `box` (default) = caixa vermelha dos diálogos; `inline` =
 * texto sem caixa (formulário de login). */
export function FormErrorBanner({ message, variant = 'box' }: FormErrorBannerProps) {
  if (!message) return null
  if (variant === 'inline') {
    return (
      <div role="alert" className="text-sm text-red-600 dark:text-red-400">
        {message}
      </div>
    )
  }
  return (
    <p role="alert" className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
      {message}
    </p>
  )
}
