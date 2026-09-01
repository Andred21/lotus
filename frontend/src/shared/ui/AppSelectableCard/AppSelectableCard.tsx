import type { CSSProperties, ReactNode } from 'react'
import { AppButton } from '../AppButton'

export interface AppSelectableCardProps {
  /** Ausente (junto com `onToggle`) => card de leitura, sem semântica de botão. */
  selected?: boolean
  onToggle?: () => void
  disabled?: boolean
  /** Canto direito. Fica FORA do elemento clicável de propósito: botão dentro
   * de botão é HTML inválido, e o clique na ação não pode alternar a seleção. */
  action?: ReactNode
  className?: string
  children: ReactNode
}

/**
 * Moldura de card com estado selecionado. Apresentacional puro — não conhece
 * feature, rota nem regra de domínio (o conteúdo vem por `children`).
 *
 * Com `onToggle` renderiza um `<button aria-pressed>`; sem ele, uma `<div>` sem
 * papel interativo. Um card de leitura que se anuncia como botão mente ao
 * leitor de tela sobre o que ele faz.
 *
 * Cor por variável CSS do tema (ADR-16). O fundo do estado selecionado é
 * `color-mix` com `--surface-card`, que é o que mantém contraste nos dois temas
 * — os palette vars do Lara não invertem. O fundo do estado normal fica em
 * classe (não em `style`) para que o `hover:` consiga vencer: estilo inline tem
 * precedência sobre qualquer classe.
 *
 * O alvo interno é `text` e sem superfície própria: `AppButton` sem papel caía
 * no `.p-button` preenchido do Lara e cobria o fundo que este componente
 * acabava de calcular — selecionado e não selecionado idênticos, medido nos
 * dois temas (C da fase 4, run de 2026-08-28).
 */
export function AppSelectableCard({
  selected = false, onToggle, disabled = false, action, className, children,
}: AppSelectableCardProps) {
  const interactive = typeof onToggle === 'function'

  const style: CSSProperties = selected
    ? {
        background: 'color-mix(in srgb, var(--primary-color) 10%, var(--surface-card))',
        borderColor: 'color-mix(in srgb, var(--primary-color) 55%, var(--surface-border))',
        color: 'var(--text-color)',
      }
    : { borderColor: 'var(--surface-border)', color: 'var(--text-color)' }

  const classes = [
    'flex items-center gap-2 rounded-control border px-3 py-2 transition-colors',
    selected ? '' : '[background:var(--surface-card)]',
    interactive && !selected && !disabled ? 'hover:[background:var(--surface-hover)]' : '',
    className,
  ].filter(Boolean).join(' ')

  const content = <div className="flex min-w-0 flex-1 items-center gap-3 text-left">{children}</div>

  return (
    <div className={classes} style={style}>
      {interactive ? (
        <AppButton
          type="button"
          text
          aria-pressed={selected}
          disabled={disabled}
          onClick={onToggle}
          /* `text` tira fundo e borda pelo tema; o hover do `.p-button-text` e
           * a tinta de marca dele saem por classe — quem pinta hover e estado é
           * o `<div>` externo, que já sabe o `selected`. O padding do `.p-button`
           * FICA: é a geometria medida do alvo (442px em 468px de card). */
          className="flex min-w-0 flex-1 items-center gap-3 bg-transparent! text-left text-[var(--text-color)] hover:bg-transparent! hover:text-[var(--text-color)] disabled:opacity-60"
        >
          {children}
        </AppButton>
      ) : (
        content
      )}
      {action}
    </div>
  )
}
