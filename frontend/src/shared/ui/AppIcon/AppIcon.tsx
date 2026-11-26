import { ICONS } from './icons'
import type { IconName } from './icons'

export interface AppIconProps {
  name: IconName
  weight?: 'regular' | 'fill'
  size?: 'sm' | 'md' | 'lg'
  /** Com `label` o ícone é uma imagem nomeada; sem ele é decorativo (`aria-hidden`). */
  label?: string
  className?: string
}

// md = o `1rem` do PrimeIcons de hoje.
const SIZES = { sm: 14, md: 16, lg: 24 } as const

/**
 * Ícone do Lotus: um Phosphor atrás do registro `IconName` (única porta;
 * feature nunca importa `@phosphor-icons/react`). A cor vem do texto
 * (`currentColor`, que o Phosphor já usa por padrão).
 */
export function AppIcon({ name, weight = 'regular', size = 'md', label, className }: AppIconProps) {
  const Glyph = ICONS[name]
  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true as const }

  return <Glyph weight={weight} size={SIZES[size]} className={className} {...a11y} />
}
