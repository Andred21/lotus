import { SectionLabel } from '../SectionLabel'

export interface FormSectionProps {
  title: string
  /** Espaço acima, para seções que não são a primeira do diálogo. */
  spaced?: boolean
  /** Nível do cabeçalho. `h3` (default) é a seção DENTRO de diálogo, sob o `h1`
   * da página; `h2` é a seção que divide a própria página — o Perfil, cujas
   * três seções saíam `h1,h3,h3,h3` (f2 UI-03, run de 2026-08-28). */
  as?: 'h2' | 'h3'
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
 *
 * A grafia deixou de ser própria (`text-sm font-bold tracking-wide`) e passou a
 * ser a compartilhada do `SectionLabel`: o mesmo papel saía em 5 grafias pelo
 * produto (achado A2 do audit de 2026-08-26).
 */
export function FormSection({ title, spaced, as = 'h3' }: FormSectionProps) {
  // `h3` porque a seção vive DENTRO de um diálogo, sob o `h1` da página — o
  // nível é do CHAMADOR (`as`); e `rule={false}` porque as 13 seções de
  // formulário já se separam pelo respiro e pelos divisores do diálogo —
  // hairline aqui é traço que nenhum achado pediu (achado A2, decisão
  // registrada no plano de 2026-08-28).
  return <SectionLabel as={as} rule={false} className={spaced ? 'pt-2' : undefined}>{title}</SectionLabel>
}
