import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AppLogo, AppCard, AppSkeleton, AppErrorState } from '@shared/ui'
import { formatDate } from '@shared/lib'
import { useValidationPage } from '../../hooks/useValidationPage'
import type { PublicCertificateData } from '@shared/types/generated'

/** Ancora data-only (`YYYY-MM-DD`) ao meio-dia local antes de formatar: sem
 * isso `new Date('2026-06-26')` é lido como UTC e um fuso a oeste volta um
 * dia (mesmo cuidado do `formatMonthYear`, `shared/lib/datetime.ts`). */
function formatDateOnly(iso: string): string {
  return formatDate(new Date(`${iso}T12:00:00`))
}

type HeadingTone = 'success' | 'danger' | 'warning' | 'neutral'

function StatusHeading({ icon, text, tone = 'neutral' }: { icon: string; text: string; tone?: HeadingTone }) {
  const color = tone === 'neutral' ? 'var(--text-color)' : 'var(--app-card-tone-text)'
  return (
    <div className="flex items-center gap-3 p-5">
      <i className={`pi ${icon} text-2xl`} style={{ color }} aria-hidden="true" />
      <h1 className="text-lg font-semibold" style={{ color }}>{text}</h1>
    </div>
  )
}

/** Corpo do cartão "válido": só os campos que `PublicCertificateData`
 * carrega (codigo, aluno, curso + carga horária, término da turma, vigência
 * quando houver) — nada de `cliente`/`redator` aqui, o brief pede dados
 * mínimos. */
function ValidCard({ cert }: { cert: PublicCertificateData }) {
  const { t } = useTranslation()
  return (
    <AppCard tone="success">
      <StatusHeading icon="pi-check-circle" tone="success" text={t('certificate.validation.valid')} />
      <dl className="flex flex-col gap-4 px-5 pb-5">
        <div className="flex flex-col gap-0.5">
          <dt className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-color-secondary)' }}>
            {t('certificate.fieldCodigo')}
          </dt>
          <dd className="text-sm font-medium" style={{ color: 'var(--text-color)' }}>{cert.codigo}</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-color-secondary)' }}>
            {t('certificate.validation.issuedTo')}
          </dt>
          <dd className="text-sm font-medium" style={{ color: 'var(--text-color)' }}>{cert.aluno.name}</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-color-secondary)' }}>
            {t('certificate.validation.course')}
          </dt>
          <dd className="text-sm font-medium" style={{ color: 'var(--text-color)' }}>
            {cert.curso.name} · {t('certificate.validation.hours', { count: cert.curso.workload_hours })}
          </dd>
        </div>
        {cert.turma.end_date && (
          <p className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>
            {t('certificate.validation.completedAt', { date: formatDateOnly(cert.turma.end_date) })}
          </p>
        )}
        {cert.valido_ate && (
          <p className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>
            {t('certificate.validation.validUntil', { date: formatDateOnly(cert.valido_ate) })}
          </p>
        )}
      </dl>
    </AppCard>
  )
}

/**
 * Página pública de validação de certificado por QR (spec D14/D19): sem
 * conta, sem cookie, fora do `SessionBootstrap` (ver `AppRouter`). Consome
 * `usePublicCertificate` só através de `useValidationPage` — a query não
 * chama direto daqui, regra de componente declarativo (frontend-fsliced.md).
 *
 * Mobile-first, sem `AppLayout` (a rota não tem sidebar/header — quem chega
 * aqui não tem sessão). Herda o tema do provider; sem toggle próprio.
 */
export function ValidationPage() {
  const { uuid } = useParams<{ uuid: string }>()
  const { t } = useTranslation()
  const state = useValidationPage(uuid ?? '')

  return (
    <div className="flex min-h-screen flex-col items-center gap-8 bg-slate-50 px-4 py-10 dark:bg-slate-950">
      <AppLogo className="w-32" />

      <div className="w-full max-w-md">
        {state.kind === 'loading' && <AppSkeleton height="12rem" />}

        {state.kind === 'error' && (
          <AppErrorState
            title={t('common.loadError')}
            detail={state.error.detail ?? t('common.loadErrorHint')}
            retryLabel={t('common.retry')}
            onRetry={state.retry}
          />
        )}

        {state.kind === 'notFound' && (
          <AppCard>
            <StatusHeading icon="pi-question-circle" text={t('certificate.validation.notFound')} />
          </AppCard>
        )}

        {state.kind === 'revoked' && (
          <AppCard tone="danger">
            <StatusHeading icon="pi-times-circle" tone="danger" text={t('certificate.validation.revoked')} />
            {state.cert.revoked_at && (
              <p className="px-5 pb-5 text-sm" style={{ color: 'var(--text-color-secondary)' }}>
                {t('certificate.validation.revokedAt', { date: formatDate(new Date(state.cert.revoked_at)) })}
              </p>
            )}
          </AppCard>
        )}

        {state.kind === 'expired' && (
          <AppCard tone="warning">
            <StatusHeading icon="pi-exclamation-triangle" tone="warning" text={t('certificate.validation.expired')} />
          </AppCard>
        )}

        {state.kind === 'valid' && <ValidCard cert={state.cert} />}
      </div>
    </div>
  )
}
