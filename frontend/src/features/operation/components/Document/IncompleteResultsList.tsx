import { useTranslation } from 'react-i18next'

type Missing = Array<'grade' | 'attendance'>

/** Alunos sem nota ou presença na hora de concluir. Aviso, não bloqueio. */
export function IncompleteResultsList({ students }: { students: { name: string; missing: Missing }[] }) {
  const { t } = useTranslation()
  const label = (missing: Missing) =>
    t(`operation.conclusion.incomplete.${missing.length === 2 ? 'both' : missing[0]}`)

  return (
    <div className="space-y-1 text-sm">
      <p className="font-medium">{t('operation.conclusion.incomplete.title')}</p>
      <ul role="list" className="list-disc pl-5" style={{ color: 'var(--text-color-secondary)' }}>
        {students.map((s, i) => (
          <li key={i}>{t('operation.conclusion.incomplete.row', { name: s.name, missing: label(s.missing) })}</li>
        ))}
      </ul>
      <p style={{ color: 'var(--text-color-secondary)' }}>{t('operation.conclusion.incomplete.hint')}</p>
    </div>
  )
}
