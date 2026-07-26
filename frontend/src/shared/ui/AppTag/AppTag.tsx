import { Tag } from 'primereact/tag'
import type { TagProps } from 'primereact/tag'

/** Tom sem equivalente em `severity` do PrimeReact. Hoje só o roxo de
 * modalidade `Online`. Modalidade não é severidade — não entra na escala
 * success/info/warning/danger. */
export type AppTagTone = 'accent'

export interface AppTagProps extends TagProps {
  tone?: AppTagTone
}

export function AppTag({ tone, style, ...props }: AppTagProps) {
  const toneStyle =
    tone === 'accent'
      ? {
          background: 'color-mix(in srgb, var(--purple-500) 15%, var(--surface-card))',
          color: 'color-mix(in srgb, var(--purple-500) 70%, var(--text-color))',
        }
      : undefined

  return <Tag {...props} style={{ ...toneStyle, ...style }} />
}
