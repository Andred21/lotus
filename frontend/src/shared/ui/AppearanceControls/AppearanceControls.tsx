import { useTranslation } from 'react-i18next'
import { useUiStore } from '@shared/stores/uiStore'
import { AppButton } from '../AppButton'
import { AppIcon } from '../AppIcon'
import { LanguageMenu } from '../LanguageMenu'

/** Seletor de idioma + toggle de tema — o par tem UM dono. Consomem-no o
 * Header do shell e o LoginPage, que até 2026-08-12 mantinha uma cópia inline
 * do mesmo JSX: foi por ela que a correção UI-07 teve de escrever a chave
 * `common.toggleTheme` nas duas versões no mesmo commit.
 *
 * O `className` cai no próprio container flex, e é por ele que o chamador
 * posiciona o par sem embrulhá-lo noutro nó (o login ancora com
 * `absolute top-4 right-4`). Serve para posição e contexto do chamador, não
 * para mexer no `gap`/alinhamento interno: essas utilities já vivem no mesmo
 * seletor e quem decide o empate é a ordem do bundle do Tailwind, não a do
 * atributo — o espaçamento entre os dois controles é do componente, igual nos
 * dois usos. */
export function AppearanceControls({
  className,
  surface = 'shell',
}: {
  className?: string
  /** Onde o par pousa: `shell` (default) sobre o azul-poste fixo do header, com a
   * tinta `--shell-ink`; `page` sobre `--surface-card` (o login), com a marca do
   * tema (`iconToggle` no tema, `compact` no idioma). A tinta do shell sobre o
   * cartão branco mede ~1,5:1 — a revisão final do bloco 66 (I-1). */
  surface?: 'shell' | 'page'
}) {
  const { t } = useTranslation()
  const theme = useUiStore((s) => s.theme)
  const toggleTheme = useUiStore((s) => s.toggleTheme)

  return (
    <div className={`flex items-center gap-4 ${className ?? ''}`}>
      <LanguageMenu surface={surface} />
      {/* Toggle, não ação: o nome fica fixo e o estado vai em `aria-pressed`
        * (ligado = escuro). O ícone troca para o leitor de tela não depender dele. */}
      <AppButton
        variant={surface === 'page' ? 'iconToggle' : 'shell'}
        onClick={toggleTheme}
        aria-label={t('common.toggleTheme')}
        aria-pressed={theme === 'dark'}
      >
        <AppIcon name={theme === 'dark' ? 'sun' : 'moon'} className="-my-0.5" />
      </AppButton>
    </div>
  )
}
