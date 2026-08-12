import { useTranslation } from 'react-i18next'
import { PageHeader } from '@shared/ui'
import { useSessionStore } from '@shared/stores/sessionStore'

/** Placeholder da dashboard (conteúdo real é task futura). O logout saiu
 * daqui e foi para o UserMenu do header.
 *
 * O título vem do `PageHeader` e não de um cabeçalho próprio: ele é o dono
 * único do título de página desde a UI-05, e era por escrever o seu à mão que
 * esta rota abria a árvore de cabeçalhos no nível 2 (UI-02 do review de
 * 2026-08-12). */
export function DashboardPage() {
  const { t } = useTranslation()
  const user = useSessionStore((s) => s.user)

  return (
    <PageHeader
      title={t('dashboard.welcome', { name: user?.name })}
      description={t('dashboard.subtitle')}
    />
  )
}
