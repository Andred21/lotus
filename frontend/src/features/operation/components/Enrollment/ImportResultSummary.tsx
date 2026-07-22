import { useTranslation } from 'react-i18next'
import type { ImportResultData } from '@shared/types/generated'

export function ImportResultSummary({ result }: { result: ImportResultData }) {
  const { t } = useTranslation()
  return (
    <div className="space-y-3 text-sm">
      <p className="font-medium">{t('operation.enrollment.import.resultTitle')}</p>
      <p>
        {t('operation.enrollment.import.enrolledVsContracted', {
          enrolled: result.enrolled_total,
          contracted: result.contracted_count,
        })}
      </p>
      <ul className="space-y-1">
        <li>
          {t('operation.enrollment.import.created')}: {result.created}
        </li>
        <li>
          {t('operation.enrollment.import.relinked')}: {result.relinked}
        </li>
        <li>
          {t('operation.enrollment.import.alreadyEnrolled')}: {result.already_enrolled}
        </li>
      </ul>

      {result.moved.length > 0 && (
        <div>
          <p className="font-medium">{t('operation.enrollment.import.moved')}</p>
          <ul className="list-disc pl-5 text-slate-600 dark:text-slate-300">
            {result.moved.map((m, i) => (
              <li key={i}>
                {t('operation.enrollment.import.movedRow', {
                  name: m.name,
                  rut: m.rut,
                  previous: m.previous_client ?? '—',
                  client: m.client,
                })}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.errors.length > 0 && (
        <div>
          <p className="font-medium text-red-600">{t('operation.enrollment.import.errors')}</p>
          <ul className="list-disc pl-5 text-red-600">
            {result.errors.map((e, i) => (
              <li key={i}>{t('operation.enrollment.import.errorRow', { row: e.row, message: e.message })}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
