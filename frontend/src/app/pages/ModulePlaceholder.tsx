import { useTranslation } from 'react-i18next'

/** Stand-in para módulos ainda não implementados; mantém a nav clicável.
 * Recebe a CHAVE i18n do título (ex.: "nav.comercial"). */
export function ModulePlaceholder({ titleKey }: { titleKey: string }) {
  const { t } = useTranslation()
  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t(titleKey)}</h2>
      <p className="mt-1 text-sm text-slate-500">{t('placeholder.module')}</p>
    </div>
  )
}
