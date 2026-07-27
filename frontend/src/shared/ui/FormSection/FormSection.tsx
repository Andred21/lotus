export interface FormSectionProps {
  title: string
  /** Espaço acima, para seções que não são a primeira do diálogo. */
  spaced?: boolean
}

/**
 * Cabeçalho de seção dentro de um formulário. Apresentacional puro.
 *
 * Existia copiado em 13 lugares, com a cor fixa em `text-slate-500` — que é
 * cor Tailwind hardcoded contra o ADR-16. Centralizar mata as duas coisas de
 * uma vez.
 */
export function FormSection({ title, spaced }: FormSectionProps) {
  return (
    <h3
      className={`text-xs font-semibold uppercase ${spaced ? 'pt-2' : ''}`}
      style={{ color: 'var(--text-color-secondary)' }}
    >
      {title}
    </h3>
  )
}
