import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { MenuItem } from 'primereact/menuitem'
import { AppButton } from '../AppButton/AppButton'
import { AppMenu } from '../AppMenu/AppMenu'
import type { AppMenuRef } from '../AppMenu/AppMenu'
import { SUPPORTED_LANGUAGES } from '@shared/config/i18n'

/**
 * Seletor de idioma. O AppButton mostra a bandeira + código atual; ao clicar
 * abre o AppMenu com as 3 línguas — cada item com sua bandeira (flag-icons no
 * ícone do item) chamando i18n.changeLanguage.
 */
export function LanguageMenu() {
  const { t, i18n } = useTranslation()
  const menuRef = useRef<AppMenuRef>(null)

  const current =
    SUPPORTED_LANGUAGES.find((l) => l.code === i18n.language) ??
    SUPPORTED_LANGUAGES.find((l) => i18n.language?.startsWith(l.code.slice(0, 2))) ??
    SUPPORTED_LANGUAGES[0]

  const items: MenuItem[] = SUPPORTED_LANGUAGES.map((l) => ({
    label: l.label,
    icon: `fi fi-${l.flag}`,
    command: () => void i18n.changeLanguage(l.code),
  }))

  return (
    <>
      <AppButton
        variant="brandLabel"
        aria-label={t('common.language')}
        onClick={(e) => menuRef.current?.toggle(e)}
      >
        <span className={`fi fi-${current.flag}`} /> {current.label}
      </AppButton>
      <AppMenu ref={menuRef} model={items} />
    </>
  )
}
