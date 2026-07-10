import type { ReactNode } from 'react'
import { PageHeader } from '../PageHeader'
import { AppTabView, AppTabPanel } from '../AppTabView'

/**
 * Molde de página de módulo: cabeçalho (título, descrição, ação) + corpo.
 * Apresentacional puro — não conhece feature, não conhece rota.
 *
 * Uma entidade: passe a tabela direto em `children`.
 * Mais de uma: envolva em <ModuleTabs> com <ModuleTab header="…">.
 */
export function ModulePage({
  title,
  description,
  actions,
  children,
}: {
  title: string
  description?: string
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <div>
      <PageHeader title={title} description={description} actions={actions} />
      {children}
    </div>
  )
}

export const ModuleTabs = AppTabView
export const ModuleTab = AppTabPanel
