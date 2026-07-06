import { useTranslation } from 'react-i18next'
import { useSessionStore } from '@features/identity/stores/sessionStore'

/** Placeholder da dashboard (conteúdo real é task futura). O logout saiu
 * daqui e foi para o UserMenu do header. */
export function DashboardPage() {
  const { t } = useTranslation()
  const user = useSessionStore((s) => s.user)
  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
        {t('dashboard.welcome', { name: user?.name })}
      </h2>
      <p className="mt-1 text-sm text-slate-500">{t('dashboard.subtitle')}</p>
    </div>
  )
}
