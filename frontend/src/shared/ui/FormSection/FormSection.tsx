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
 * **A tinta de marca voltou (reversão da D1/P-36, João, 2026-11-01).** O audit
 * de 2026-08-26 a tirou daqui por dois motivos: o celeste media 2,77:1 sobre o
 * humo — reprova o 4,5:1 de texto — e pintava SETE papéis na mesma dobra de
 * `/perfil` (título, ação primária, destrutiva, secundária, upload, tag, ícone).
 * O João reverteu: título em `--primary-color` e linha contínua em
 * `--section-rule`, nos dois temas, porque a hierarquia seção × label × valor
 * pedia um degrau que só o peso não dava. No escuro passa o AA; no claro fica
 * em 2,77:1 no card branco e 2,53:1 no humo, e ele aceitou esse contraste, e a
 * ambiguidade de papéis, como decisão dele. Há teste travando a regra nova —
 * a próxima auditoria que reabrir isto pelo contraste deve ler esta nota antes.
 * A marca fica NESTE componente (`tone="brand"`); as outras faixas do produto
 * seguem em tinta de corpo (spec D2 do bloco 46).
 *
 * A grafia deixou de ser própria (`text-sm font-bold tracking-wide`) e passou a
 * ser a compartilhada do `SectionLabel`: o mesmo papel saía em 5 grafias pelo
 * produto (achado A2 do audit de 2026-08-26).
 */
export function FormSection({ title, spaced, as = 'h3' }: FormSectionProps) {
  // `h3` porque a seção vive DENTRO de um diálogo, sob o `h1` da página — o
  // nível é do CHAMADOR (`as`). A linha sai ligada (sem `rule={false}`): desde
  // a reversão da D1 ela acompanha o título até a borda.
  return <SectionLabel as={as} tone="brand" className={spaced ? 'pt-2' : undefined}>{title}</SectionLabel>
}
