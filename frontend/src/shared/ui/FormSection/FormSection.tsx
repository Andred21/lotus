import { BRAND_COLOR } from "@/shared/config/brand"

export interface FormSectionProps {
  title: string
  /** Espaço acima, para seções que não são a primeira do diálogo. */
  spaced?: boolean
}

/**
 * Cabeçalho de seção dentro de um formulário. Apresentacional puro.
 *
 * Existia copiado em 13 lugares, com a cor cinza fixa em Tailwind — hardcoded
 * contra o ADR-16. Centralizar mata as duas coisas de uma vez.
 */
export function FormSection({ title, spaced }: FormSectionProps) {
  return (
    <h3
      className={`text-sm font-bold uppercase ${spaced ? 'pt-2' : ''}`}
      style={{ color: BRAND_COLOR }}
    >
      {title}
    </h3>
  )
}
