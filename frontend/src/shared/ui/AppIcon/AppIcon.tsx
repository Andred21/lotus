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

// Escala do Lotus (a passada de 2026-11 subiu um degrau: o 16px de antes ficou pequeno).
const SIZES = { sm: 16, md: 20, lg: 28 } as const

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
