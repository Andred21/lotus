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
 *
 * **A tinta de marca saiu daqui, e não volta (spec D1).** Ela media 2,77:1 sobre
 * o humo — reprova o 4,5:1 de texto —, mas o contraste era o sintoma: o celeste
 * pintava SETE papéis na mesma dobra de `/perfil` (título, ação primária, ação
 * destrutiva, secundária, upload, tag, ícone), e uma cor que significa sete
 * coisas não significa nenhuma. Subir o celeste até passar teria conservado a
 * ambiguidade. Hierarquia de título é trabalho de peso, caixa e tracking; a
 * marca preenchida passa a valer só para a ação primária do cartão. Há teste
 * travando isto — a P-36 já foi reaberta três vezes pela via do "sem cor fica
 * sem graça".
 */
export function FormSection({ title, spaced }: FormSectionProps) {
  return (
    <h3
      className={`text-sm font-bold tracking-wide uppercase ${spaced ? 'pt-2' : ''}`}
      style={{ color: 'var(--text-color)' }}
    >
      {title}
    </h3>
  )
}
