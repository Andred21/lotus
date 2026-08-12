import { useTranslation } from 'react-i18next'
import { PageHeader } from '@shared/ui'

/** Stand-in para módulos ainda não implementados; mantém a nav clicável.
 * Recebe a CHAVE i18n do título (ex.: "nav.comercial").
 *
 * Título pelo `PageHeader`, o dono único desde a UI-05 — escrevê-lo à mão era
 * o que deixava a rota sem `h1` (UI-02 do review de 2026-08-12). */
export function ModulePlaceholder({ titleKey }: { titleKey: string }) {
  const { t } = useTranslation()

  return <PageHeader title={t(titleKey)} description={t('placeholder.module')} />
}
