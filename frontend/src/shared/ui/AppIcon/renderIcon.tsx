import type { ReactNode } from 'react'
import { AppIcon } from './AppIcon'
import type { AppIconProps } from './AppIcon'
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
