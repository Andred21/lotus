import { useContext, useId, type ReactNode } from 'react'
import { dangerSurface, dangerText } from '../../styles/tokens'
import { FieldContext, type FieldBind, type FieldContextValue } from './fieldContext'

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
  /** Campo obrigatório: asterisco decorativo ao lado do rótulo e `aria-required`
   * no controle. Em leitura não marca — não há o que preencher. */
  required?: boolean
  /** Ajuda abaixo do controle, em `--text-color-secondary`, ligada ao controle
   * por `aria-describedby` junto com o erro. Em leitura não aparece. */
  hint?: string
  /** Valor e setter do form, quando o campo veio de um `Field` (§4.1 da spec).
   * Ausente no uso solto — login, filtro de tabela, célula de edição. */
  bind?: FieldBind
}

/**
 * Campo de formulário: label + controle + mensagem de erro do backend.
 *
 * **A label é IRMÃ do controle, não mãe dele (P-37).** Enquanto ela o envolvia,
 * o nome acessível do input somava o texto do rótulo e, com erro presente, a
 * mensagem junto — o leitor de tela anunciava "RUT RUT inválido" em vez de
 * "RUT". O molde correto já vivia no `LoginForm`; o que faltava era um lugar
 * onde ele valesse para os 55 campos com controle sem editar os 55 call sites.
 *
 * O id nasce aqui (`useId`) e viaja por contexto até o wrapper, que sabe qual é
 * a própria porta (`id` ou `inputId`) — ver `fieldContext.ts`. Prop do chamador
 * vence a do contexto, sempre.
 */
export function FormField({ label, error, readOnly, value, bind, required, hint, children }: FormFieldProps) {
  const id = useId()
  const errorId = `${id}-error`
  const hintId = `${id}-hint`
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(' ')
  const field: FieldContextValue = {
    id,
    invalid: !!error,
    required: required || undefined,
    describedBy: describedBy || undefined,
    bind,
  }

  return (
    <div className="block">
      {/* Sem `htmlFor` em leitura: não há controle a apontar, e label pendurada
          num id inexistente é label morta.
          Quem decide isso é a PROP, não o conteúdo: `children` que não monta
          controle — uma `AppTag` de valor imutável, por exemplo — passa por aqui
          como se montasse, e a label sai apontando para o vazio. Aconteceu em
          dois sítios (`StaffUserDialog`, `CertificateViewDialog`), medidos no
          gate do BD-16. Valor que só se lê entra por `readOnly` + `value`, que
          aceita `ReactNode` justamente para isso. */}
      <div className="mb-1 flex gap-0.5">
        <label
          htmlFor={readOnly ? undefined : id}
          className="text-sm font-medium"
          style={{ color: 'var(--text-color)' }}
        >
          {label}
        </label>
        {/* Irmão da label, e não filho: o asterisco entraria no nome acessível
            do controle ("RUT *"). Quem anuncia a obrigatoriedade é o
            `aria-required` — o glifo é só para quem vê. */}
        {required && !readOnly && (
          <span aria-hidden="true" className="text-sm font-medium" style={{ color: dangerText }}>
            *
          </span>
        )}
      </div>
      {readOnly ? (
        <ReadOnlyValue value={value} />
      ) : (
        <FieldContext.Provider value={field}>{children}</FieldContext.Provider>
      )}
      {hint && !readOnly && (
        <span
          id={hintId}
          className="mt-1 block text-sm"
          style={{ color: 'var(--text-color-secondary)' }}
        >
          {hint}
        </span>
      )}
      {error && (
        <span
          id={errorId}
          className="mt-1 block text-sm"
          style={{ color: dangerText }}
        >
          {error}
        </span>
      )}
    </div>
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
 * botão de salvar aparentemente inerte.
 *
 * Com erro, publica o mesmo `FieldContext` do `FormField`: o controle filho sai
 * `aria-invalid` e `aria-describedby` apontando para a mensagem — o que também
 * o faz alvo do foco do `CrudDialog` após um envio reprovado. Sem erro
 * republica o contexto de fora (o do `FormField` que o envolve, ou nenhum): a
 * árvore tem a mesma forma com e sem erro — o input não remonta nem perde o
 * foco quando o erro some ao editar. */
export function NestedField({ error, readOnly, value, children }: NestedFieldProps) {
  const id = useId()
  const errorId = `${id}-error`
  const outer = useContext(FieldContext)
  const field: FieldContextValue | null = error
    ? { id, invalid: true, describedBy: errorId }
    : outer

  return (
    <div>
      {readOnly ? (
        <ReadOnlyValue value={value} />
      ) : (
        <FieldContext.Provider value={field}>{children}</FieldContext.Provider>
      )}
      {error && (
        <span
          id={errorId}
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
    // `role="alert"` e `tabIndex={-1}` no INVÓLUCRO, e a lista segue lista: o
    // resumo é a única indicação de um 422 cujo campo não tem input — sem anúncio
    // ele passa calado ao leitor de tela, e sem `tabIndex` o `CrudDialog` não tem
    // como levar o foco até ele quando não há campo inválido.
    <div role="alert" tabIndex={-1} className="mb-4">
      <ul
        role="list"
        /* `list-disc` explícito: o mini-reset da P-46 zera o marcador de todo
         * `ul`, e aqui os itens são FRASE — cada linha é uma mensagem de erro
         * independente, e sem marcador três erros leem como um parágrafo
         * quebrado. `list-inside` põe o glifo dentro da caixa, para não brigar
         * com o `px-3` da faixa (Q-7 do review de 2026-08-27). */
        className="list-inside list-disc rounded-control px-3 py-2 text-sm"
        style={{
          background: dangerSurface,
          color: dangerText,
        }}
      >
        {leftover.map(([key, msgs]) => (
          <li key={key}>{msgs[0]}</li>
        ))}
      </ul>
    </div>
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
      className="mb-4 rounded-control px-3 py-2 text-sm"
      style={{
        background: dangerSurface,
        color: dangerText,
      }}
    >
      {message}
    </p>
  )
}
