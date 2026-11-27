import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { MenuPassThroughMethodOptions } from 'primereact/menu'
import { AppButton } from '../AppButton/AppButton'
import { AppMenu } from '../AppMenu/AppMenu'
import type { AppMenuItem, AppMenuRef } from '../AppMenu/AppMenu'
import { SUPPORTED_LANGUAGES } from '@shared/config/i18n'
import cl from 'flag-icons/flags/4x3/cl.svg'
import br from 'flag-icons/flags/4x3/br.svg'
import us from 'flag-icons/flags/4x3/us.svg'

// Só as três bandeiras do seletor, cada uma como arquivo próprio. O CSS global do
// `flag-icons` trazia as ~270 de uma vez; quem precisa de todas (o `PhoneInput`)
// importa o CSS no próprio módulo. A chave tipada faz um idioma novo sem
// bandeira falhar no `tsc`.
const FLAGS: Record<(typeof SUPPORTED_LANGUAGES)[number]['flag'], string> = { cl, br, us }

const Flag = ({ code, className }: { code: keyof typeof FLAGS; className?: string }) => (
  <img src={FLAGS[code]} alt="" className={['h-3 w-4 shrink-0', className].filter(Boolean).join(' ')} />
)

/**
 * Seletor de idioma. O AppButton mostra a bandeira + código atual; ao clicar
 * abre o AppMenu com as 3 línguas — cada item com sua bandeira (SVG local no
 * ícone do item) chamando i18n.changeLanguage.
 */
export function LanguageMenu() {
  const { t, i18n } = useTranslation()
  const menuRef = useRef<AppMenuRef>(null)

  const current =
    SUPPORTED_LANGUAGES.find((l) => l.code === i18n.language) ??
    SUPPORTED_LANGUAGES.find((l) => i18n.language?.startsWith(l.code.slice(0, 2))) ??
    SUPPORTED_LANGUAGES[0]

  const items: AppMenuItem[] = SUPPORTED_LANGUAGES.map((l) => ({
    label: l.label,
    icon: <Flag code={l.flag} className="p-menuitem-icon" />,
    command: () => void i18n.changeLanguage(l.code),
    // `data` carrega o código do item — é o que o `pt.menuitem` abaixo lê para
    // reconhecer o ativo sem depender de índice/ordem (UI-05).
    data: l.code,
    // `p-highlight` é o vocabulário do PRÓPRIO tema para "item selecionado": o
    // Lara já pinta `.p-menu .p-menuitem.p-highlight` nos dois temas
    // (`lara-light-lotus.css:5551`, `lara-dark-lotus.css:5551`) — fundo, texto e
    // ícone — e ainda distingue o caso em que o ativo é TAMBÉM o focado
    // (`.p-highlight.p-focus`, fundo mais forte). O `Menu` não crava essa classe
    // sozinho porque não tem estado de seleção; quem sabe qual item é o atual é
    // esta tela, então é ela que a crava. Marca por classe do tema, e não por
    // regra de cor própria, para a marca acompanhar o tema sem manutenção.
    className: l.code === current.code ? 'p-highlight' : undefined,
  }))

  return (
    <>
      <AppButton
        variant="shell"
        className="px-3 py-2.5 text-sm"
        aria-label={`${t('common.language')}: ${current.label}`}
        onClick={(e) => menuRef.current?.toggle(e)}
      >
        <Flag code={current.flag} /> {current.label}
      </AppButton>
      <AppMenu
        ref={menuRef}
        model={items}
        className="lotus-language-menu items-center w-auto mr-10"
        popupAlignment="right"
        // UI-05 do review de 2026-08-22: o `Menu` do PrimeReact não tem estado
        // "selecionado" — diferente do `SelectButton`/`Dropdown`, que resolvem
        // contra um `value`. O único destaque que o popup mostrava era o
        // `p-focus`, que o Prime crava sempre no PRIMEIRO item ao abrir (anel
        // de FOCO do teclado, não idioma corrente) — foi assim que o achado
        // apareceu: tela em `en`, menu abrindo com `ES` destacado.
        //
        // Duas marcas, uma por canal: `aria-current` é o que o leitor de tela
        // anuncia e não pinta nada; o `p-highlight` (acima, em `className` do
        // `MenuItem`) é o que os olhos veem e não chega à árvore de
        // acessibilidade — nenhuma sozinha resolve o achado. O peso do rótulo
        // vem do `brand-theme.css`, porque só cor não bastaria: #ecf7fd sobre
        // branco é quase nada em escala de cinza.
        //
        // `MenuItem` não aceita `aria-*` (sem index signature no tipo); só o
        // `pt` aceita, e `pt.menuitem` é a seção que vira o `<li role="menuitem">`
        // — não o `<a>` interno (medido no DOM real do Prime 10.9.8:
        // `role="menuitem"` está no `<li>`). Compara por `context.item.data`
        // (o código gravado acima), não por `context.index`, para não
        // desalinhar se a ordem de `SUPPORTED_LANGUAGES` mudar.
        pt={{
          menuitem: ({ context }: MenuPassThroughMethodOptions) =>
            context.item.data === current.code ? { 'aria-current': 'true' } : {},
        }}
      />
    </>
  )
}
