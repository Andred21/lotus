import type { ReactNode } from 'react'
import { dangerSurface, dangerText } from '../../styles/tokens'

/** Texto de leitura: quebra linha, seleciona e copia. Usa `--text-color` e não
 * o secundário — leitura não é texto de apoio, e o cinza de desabilitado é
 * parte do que o débito mediu como contraste reduzido. Vazio vira travessão:
 * campo em branco é ambíguo entre "sem valor" e "não carregou". */
function ReadOnlyValue({ value }: { value?: ReactNode }) {
  const empty = value === undefined || value === null || value === ''
  return (
    <span className="block wrap-break-word text-sm" style={{ color: 'var(--text-color)' }}>
      {empty ? '—' : value}
    </span>
  )
}

export type FormFieldProps = {
  label: string
  error?: string
  /** Modo leitura: o controle NÃO é montado; `value` vira texto. */
  readOnly?: boolean
  /** O valor de APRESENTAÇÃO, montado por quem tem o vocabulário de domínio
   * (dropdown mostra o rótulo traduzido, não o código cru). */
  value?: ReactNode
  /** Opcional por causa do campo que nasce só-leitura e NÃO tem controle
   * nenhum a montar em modo algum — snapshot congelado de certificado, carga
   * horária derivada. Antes esses sítios escreviam
   * `<AppInputText disabled readOnly>`, que é o próprio débito do §4 (review do
   * BD-3, Q-1). Com `readOnly` e sem `children` o campo é texto e ponto. */
  children?: ReactNode
}

/** Campo de formulário: label + controle + mensagem de erro do backend. */
export function FormField({ label, error, readOnly, value, children }: FormFieldProps) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm" style={{ color: 'var(--text-color-secondary)' }}>{label}</span>
      {readOnly ? <ReadOnlyValue value={value} /> : children}
      {error && (
        <span
          className="mt-1 block text-sm"
          style={{ color: dangerText }}
        >
          {error}
        </span>
      )}
    </label>
  )
}

export type NestedFieldProps = {
  error?: string
  /** Modo leitura: o controle NÃO é montado; `value` vira texto. */
  readOnly?: boolean
  value?: ReactNode
  /** Opcional pelo mesmo motivo do `FormField`. */
  children?: ReactNode
}

/** Campo aninhado (linhas de contato/endereço/módulo): sem label própria, mas
 * com o erro do backend visível. Sem isso, um 422 em `contacts.0.name` deixa o
 * botão de salvar aparentemente inerte. */
export function NestedField({ error, readOnly, value, children }: NestedFieldProps) {
  return (
    <div>
      {readOnly ? <ReadOnlyValue value={value} /> : children}
      {error && (
        <span
          className="mt-1 block text-sm"
          style={{ color: dangerText }}
        >
          {error}
        </span>
      )}
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
    <ul
      className="mb-4 rounded px-3 py-2 text-sm"
      style={{
        background: dangerSurface,
        color: dangerText,
      }}
    >
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
      <div
        role="alert"
        className="text-sm"
        style={{ color: dangerText }}
      >
        {message}
      </div>
    )
  }
  return (
    <p
      role="alert"
      className="mb-4 rounded px-3 py-2 text-sm"
      style={{
        background: dangerSurface,
        color: dangerText,
      }}
    >
      {message}
    </p>
  )
}
