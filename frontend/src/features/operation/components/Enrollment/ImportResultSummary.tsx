import { useTranslation } from 'react-i18next'
import type { ImportResultData } from '@shared/types/generated'
import { dangerText } from '@shared/styles/tokens'

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
      {/* Marcador explícito, como as duas listas irmãs abaixo: o mini-reset da
          P-46 zera o `list-style` de todo `ul`, e estes itens são texto puro
          ("Creados: 3"), sem borda nem card que os separe (Q-7, 2026-08-27). */}
      <ul role="list" className="list-disc space-y-1 pl-5">
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
          <ul role="list" className="list-disc pl-5" style={{ color: 'var(--text-color-secondary)' }}>
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
          <p className="font-medium" style={{ color: dangerText }}>{t('operation.enrollment.import.errors')}</p>
          <ul role="list" className="list-disc pl-5" style={{ color: dangerText }}>
            {result.errors.map((e, i) => (
              <li key={i}>{t('operation.enrollment.import.errorRow', { row: e.row, message: e.message })}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
