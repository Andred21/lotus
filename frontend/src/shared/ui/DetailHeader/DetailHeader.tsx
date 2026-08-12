import type { ReactNode } from 'react'
import { AppButton } from '../AppButton';

export interface DetailHeaderProps {
  /** Link de volta ao módulo. O protótipo abre toda tela de detalhe com ele. */
  back?: { label: string; onClick: () => void }
  /** Ausente quando não há entidade para nomear: falha de carga ou id inexistente.
   * Nesses estados o cabeçalho sobrevive só pelo `back` — sem ele a tela vira um
   * beco sem saída, e Reintentar não é saída. */
  title?: string
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
export function DetailHeader({ back, title, subtitle, tags, actions }: DetailHeaderProps) {
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
      {(title || subtitle || tags || actions) && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            {/* `h1` pelo mesmo motivo do PageHeader (UI-02 do review de
              * 2026-08-12): em página de detalhe o dono do título é este
              * componente. Margem cravada no valor que o user-agent dava ao h2,
              * porque o projeto não carrega Preflight. */}
            {title && <h1 className="my-[0.83em] text-2xl font-bold" style={{ color: 'var(--text-color)' }}>{title}</h1>}
            {subtitle && (
              <p className="mt-1 text-sm" style={{ color: 'var(--text-color-secondary)' }}>{subtitle}</p>
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
