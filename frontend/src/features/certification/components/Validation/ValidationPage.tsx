import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AppLogo, AppCard, AppSkeleton, AppErrorState, CertificateFolio, fieldLabelClass } from '@shared/ui'
import { formatDate, formatIsoDate, loadErrorHint, screenDetail } from '@shared/lib'
import { useValidationPage } from '../../hooks/useValidationPage'
import { StatusHeading } from './StatusHeading'
import { NotFoundCard } from './NotFoundCard'
import type { PublicCertificateData } from '@shared/types/generated'

/** Corpo do cartão "válido": só os campos que `PublicCertificateData`
 * carrega (codigo, aluno, curso + carga horária, término da turma, vigência
 * quando houver) — nada de `cliente`/`redator` aqui, o brief pede dados
 * mínimos. */
function ValidCard({ cert }: { cert: PublicCertificateData }) {
  const { t } = useTranslation()
  return (
    <AppCard tone="success">
      <StatusHeading icon="pi-check-circle" tone="success" text={t('certificate.validation.valid')} />
      {/* O folio é a assinatura da página, não mais um campo: quem escaneia o
        * QR está com o papel na mão para conferir ESTE código (achado D4).
        * Fica ABAIXO do status, não acima: o veredito é a resposta que a pessoa
        * veio buscar, e em 390px inverter empurraria o status para perto da
        * dobra (spec D7). */}
      <div className="px-6 pb-2">
        <CertificateFolio label={t('certificate.fieldCodigo')} folio={cert.codigo} size="page" />
      </div>
      <dl className="flex flex-col gap-4 px-6 pb-6">
        <div className="flex flex-col gap-0.5">
          <dt className={fieldLabelClass} style={{ color: 'var(--text-color-secondary)' }}>
            {t('certificate.validation.issuedTo')}
          </dt>
          <dd className="text-sm font-medium" style={{ color: 'var(--text-color)' }}>{cert.aluno.name}</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className={fieldLabelClass} style={{ color: 'var(--text-color-secondary)' }}>
            {t('certificate.validation.course')}
          </dt>
          <dd className="text-sm font-medium" style={{ color: 'var(--text-color)' }}>
            {cert.curso.name} · {t('certificate.validation.hours', { count: cert.curso.workload_hours })}
          </dd>
        </div>
        {cert.turma.end_date && (
          <p className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>
            {t('certificate.validation.completedAt', { date: formatIsoDate(cert.turma.end_date) })}
          </p>
        )}
        {cert.valido_ate && (
          <p className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>
            {t('certificate.validation.validUntil', { date: formatIsoDate(cert.valido_ate) })}
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
    <div
      className="flex min-h-screen flex-col items-center gap-8 px-4 py-10"
      style={{ background: 'var(--surface-ground)' }}
    >
      <AppLogo className="w-32" />

      <div className="w-full max-w-md">
        {/* Os quatro ramos de baixo titulam pelo `StatusHeading`; estes dois não
          * tinham cabeçalho nenhum, e como esta rota é pública e sem `AppLayout`
          * ninguém mais assumia o nível 1 — a página abria vazia para o leitor
          * de tela (Q-5 do review de 2026-08-12, mesma correção das telas de
          * detalhe). Escondido porque o esqueleto e o `AppErrorState` já ocupam
          * a tela: título visível aqui seria um segundo título. */}
        {state.kind === 'loading' && (
          <>
            <h1 className="sr-only">{t('common.loading')}</h1>
            <AppSkeleton height="12rem" />
          </>
        )}

        {state.kind === 'error' && (
          <>
            <h1 className="sr-only">{t('common.loadError')}</h1>
            <AppErrorState
              title={t('common.loadError')}
              detail={screenDetail(state.error) ?? t(loadErrorHint(state.error))}
              retryLabel={t('common.retry')}
              onRetry={state.retry}
            />
          </>
        )}

        {state.kind === 'notFound' && <NotFoundCard uuid={uuid ?? ''} />}

        {state.kind === 'revoked' && (
          <AppCard tone="danger">
            <StatusHeading icon="pi-times-circle" tone="danger" text={t('certificate.validation.revoked')} />
            {state.cert.revoked_at && (
              <p className="px-6 pb-6 text-sm" style={{ color: 'var(--text-color-secondary)' }}>
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
