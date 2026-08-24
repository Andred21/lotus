import type { ReactNode } from 'react'
import { AppButton } from '../AppButton';

export interface DetailHeaderProps {
  /** Link de volta ao módulo. O protótipo abre toda tela de detalhe com ele.
   * Nos estados quebrados ele é o que impede a tela de virar beco sem saída —
   * Reintentar recarrega, não sai. */
  back?: { label: string; onClick: () => void }
  /** Título da página — **obrigatório**. Era opcional "quando não há entidade
   * para nomear" (falha de carga, id inexistente), e como este componente é o
   * dono único do `h1` da tela de detalhe, esses ramos abriam a página sem
   * nível 1 nenhum (Q-5 do review de 2026-08-12). Sem entidade, quem compõe
   * titula o ESTADO — "Cargando…", "Presupuesto no encontrado". */
  title: string
  /** Título só para leitor de tela (`sr-only`). Para os ramos em que a mesma
   * frase já aparece na tela por outro caminho — a barra de título do
   * `AppDetailSkeleton`, o texto em destaque do `AppErrorState` —, repeti-la em
   * `h1` visível seriam dois títulos; escondida, a árvore de cabeçalhos ganha o
   * nível 1 sem mudar nada do que se vê. */
  titleHidden?: boolean
  /** Linha de identificação sob o título (cliente, RUT, vínculo). */
  subtitle?: ReactNode
  /** Tags de estado e modalidade, à direita. */
  tags?: ReactNode
  /** Ações da página, à direita das tags (spec D1: em detalhe, a ação primária
   * mora no cabeçalho da página, não na toolbar do card). */
  actions?: ReactNode
}

/**
 * Cabeçalho de página de detalhe. Apresentacional puro — não conhece feature,
 * não conhece rota: quem navega é o `onClick` de quem compõe.
 *
 * Separado do `PageHeader` de propósito (spec D13): página de módulo não tem
 * ação no cabeçalho desde a Task 17, e devolver `actions` lá reabriria a porta
 * que D1 fechou.
 */
export function DetailHeader({ back, title, titleHidden, subtitle, tags, actions }: DetailHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-4">
      {back && (
        <AppButton
         variant="brandIcon"  
          className="flex w-fit "
        
          onClick={back.onClick}
        >
          <i className="pi pi-arrow-left" aria-hidden="true" />
          {back.label}
        </AppButton >
      )}
      {/* `h1` pelo mesmo motivo do PageHeader (UI-02 do review de 2026-08-12):
        * em página de detalhe o dono do título é este componente. Sai SEMPRE —
        * condicioná-lo ao `title` era o que deixava carga, falha e
        * não-encontrado sem nível 1 (Q-5).
        *
        * Escondido, ele sai da LINHA e vira filho direto daqui: `sr-only` é
        * `position: absolute`, então não é item flex e não conta o `gap-4`.
        * Dentro da linha, ela ficava com altura zero mas seguia sendo item, e o
        * gap abria 1rem de espaço morto acima do esqueleto e do cartão de erro
        * (S-2 do re-review de 2026-08-12). Pela mesma razão a linha só existe
        * quando tem o que mostrar. */}
      {titleHidden && <h1 className="sr-only">{title}</h1>}
      {(!titleHidden || subtitle || tags || actions) && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-baseline sm:justify-between">
          {/* `items-baseline`, e não `items-start`: o `h1` logo abaixo carrega
            * `my-[0.83em]` (19,92px medidos), então alinhar pelo TOPO do bloco
            * punha as tags 23px acima do centro do título que elas qualificam —
            * mais perto do botão "Voltar" (16px) do que do próprio título
            * (36px), e o estado da turma lia como enfeite solto no canto (UI-08
            * da revisão de 2026-08-23). Pela linha de base a tag pousa sobre a
            * linha do título sem que a margem do `h1` — que é o espaçamento do
            * cabeçalho inteiro — precise mudar. */}
          <div className="min-w-0">
            {/* Margem cravada no valor que o user-agent dava ao h2, porque o
              * projeto não carrega Preflight. */}
            {!titleHidden && (
              <h1 className="my-[0.83em] text-2xl font-bold" style={{ color: 'var(--text-color)' }}>
                {title}
              </h1>
            )}
            {/* <div> e não <p>: o subtítulo recebe célula de identidade, cujo
              * avatar é sempre um <div> (avatar.cjs.js:254). <div> dentro de
              * <p> é inválido — o parser fecha o <p> antes e o DOM se
              * reorganiza sozinho. Mesmas classes, mesmo token. */}
            {subtitle && (
              <div className="mt-1 text-sm" style={{ color: 'var(--text-color-secondary)' }}>{subtitle}</div>
            )}
          </div>
          {(tags || actions) && (
            <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
              {tags}
              {actions}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
