import { validationVerdictClass } from '@shared/ui'

export type HeadingTone = 'success' | 'danger' | 'warning' | 'neutral'

export function StatusHeading({ icon, text, tone = 'neutral' }: { icon: string; text: string; tone?: HeadingTone }) {
  const color = tone === 'neutral' ? 'var(--text-color)' : 'var(--app-card-tone-text)'
  return (
    <div className="flex items-center gap-3 p-6">
      <i className={`pi ${icon} text-2xl`} style={{ color }} aria-hidden="true" />
      <h1 className={validationVerdictClass} style={{ color }}>{text}</h1>
    </div>
  )
}
