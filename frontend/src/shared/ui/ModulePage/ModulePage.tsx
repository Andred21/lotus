import type { ReactNode } from 'react'
import { PageHeader } from '../PageHeader'
import { AppTabView, AppTabPanel } from '../AppTabView'

/**
 * Molde de página de módulo: cabeçalho (título, descrição, tags) + corpo.
 * Apresentacional puro — não conhece feature, não conhece rota.
 *
 * O corpo é um <AppCard> composto pela tela: abas, toolbar, tabela e footer.
 * A ação primária vive na toolbar do card, não aqui (spec de 2026-07-26, D1).
 */
export function ModulePage({
  title,
  description,
  tags,
  children,
}: {
  title: string
  description?: string
  tags?: ReactNode
  children: ReactNode
}) {
  return (
    <div>
      <PageHeader title={title} description={description} tags={tags} />
      {children}
    </div>
  )
}

export const ModuleTabs = AppTabView
export const ModuleTab = AppTabPanel
