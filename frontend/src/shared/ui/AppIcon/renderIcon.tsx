import type { ReactNode } from 'react'
import { AppIcon } from './AppIcon'
import type { AppIconProps } from './AppIcon'
import type { IconProps } from '@phosphor-icons/react'
import { ICONS } from './icons'
import type { IconName } from './icons'

/** Grafia antiga do PrimeIcons. Ponte até a Task 6 do bloco 64: as features
 * ainda passam `'pi pi-x'` aos wrappers, e eles seguem compilando por aqui. */
export type LegacyPrimeIcon = `pi pi-${string}`

/** O que um wrapper de `shared/ui` aceita como ícone. */
export type IconProp = IconName | LegacyPrimeIcon

interface RenderIconOptions {
  weight?: AppIconProps['weight']
  size?: AppIconProps['size']
  className?: string
}

/** Tudo que não é nome do registro segue como classe CSS. Mais largo que
 * `pi pi-*` de propósito: o `LanguageMenu` entrega `fi fi-<flag>` (bandeiras) ao
 * `AppMenu`, e isso nunca foi ícone do PrimeIcons nem pode estourar aqui. */
function isLegacy(icon: IconProp): icon is LegacyPrimeIcon {
  return !(icon in ICONS)
}

/** `IconName` vira `AppIcon`; a classe legada vira `<i>`; `undefined` não
 * renderiza nada. `className` chega ao `svg` e ao `<i>`. */
export function renderIcon(icon: IconProp | undefined, opts: RenderIconOptions = {}): ReactNode {
  if (icon === undefined) return null
  if (isLegacy(icon)) {
    return <i className={[icon, opts.className].filter(Boolean).join(' ')} aria-hidden />
  }
  return <AppIcon name={icon} weight={opts.weight} size={opts.size} className={opts.className} />
}

interface PrimeSlotOptions {
  iconProps?: { className?: string }
  [extra: string]: unknown
}

/**
 * O mesmo ícone, na forma que os slots `icon` do PrimeReact (`Button`, `Tag`,
 * `Menu`, `FileUpload`) aceitam. String legada passa como veio. `IconName` vira
 * função: nó solto perderia a classe do slot (`p-button-icon-left`, que dá o
 * espaço entre ícone e rótulo), e a função recebe `iconProps` para devolvê-la.
 */
export function primeIcon(icon: IconProp | undefined, className?: string) {
  if (icon === undefined || isLegacy(icon)) return icon
  return (options: PrimeSlotOptions) =>
    renderIcon(icon, { className: [options.iconProps?.className, className].filter(Boolean).join(' ') || undefined })
}

/**
 * Ícone INTERNO do PrimeReact (o SVG que ele desenha sozinho) trocado por um do
 * registro. O Prime chama a função com `iconProps` — a classe do slot
 * (`p-dropdown-clear-icon`, `p-paginator-icon`), os handlers (`onPointerUp` do
 * limpar), o `role`/`aria-label`/`tabIndex` do olho do `AppPassword` — e tudo
 * isso precisa pousar no `svg` que o substitui, senão o controle perde o clique
 * e o teclado. Daí o spread: `primeIcon` só repassa a classe, o que basta para
 * slot de `Button`, mas não para estes.
 *
 * `className` soma à classe do slot (o `animate-spin` do spinner). `px` é o tamanho que o Prime dava ao slot (1rem no `.p-icon` do tema, 14px no
 * check): o Phosphor não responde a `font-size`.
 */
export function primeSlotIcon(name: IconName, px = 16, className?: string) {
  const Glyph = ICONS[name]
  return (options: { iconProps?: object }) => {
    const props = (options.iconProps ?? {}) as IconProps
    // Decorativo, como o SVG do Prime — a menos que o slot seja um controle, que
    // chega com `role` (o olho) ou `aria-label` (o limpar do dropdown):
    // `aria-hidden` num `role="button"` o tira da árvore de acessibilidade.
    const decorative = props.role === undefined && props['aria-label'] === undefined
    const merged = [props.className, className].filter(Boolean).join(' ') || undefined
    return <Glyph weight="regular" size={px} aria-hidden={decorative || undefined} {...props} className={merged} />
  }
}
