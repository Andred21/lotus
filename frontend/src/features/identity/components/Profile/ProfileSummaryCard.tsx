import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { AppButton, AppCard, AppTag, FormSection } from '@shared/ui'
import type { RedatorProfileData } from '@shared/types/generated'

/**
 * Resumo profissional do Redator, na coluna do que ele não controla.
 *
 * Só cursos: `turmas_em_andamento`, `proximas_turmas` e `pendencias` saíram do
 * contrato pelo corte D1 do bloco 1, que evitou a aresta Identity → Operation.
 * Eles vivem no Dashboard, e o CTA abaixo é o caminho até lá.
 */
export function ProfileSummaryCard({ redator }: { redator: RedatorProfileData }) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <AppCard className="p-4">
      <FormSection title={t('profile.summary.title')} />

      <div className="mt-3 flex items-baseline justify-between gap-2">
        <span className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>
          {t('profile.summary.enabledCourses')}
        </span>
        <span className="text-2xl font-semibold" style={{ color: 'var(--text-color)' }}>
          {redator.cursos_habilitados}
        </span>
      </div>

      {redator.cursos.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1">
          {redator.cursos.map((curso) => (
            <AppTag key={curso} value={curso} severity="info" />
          ))}
        </div>
      ) : (
        <p className="mt-3 text-xs" style={{ color: 'var(--text-color-secondary)' }}>
          {t('profile.summary.noCourses')}
        </p>
      )}

      <div className="mt-4">
        <AppButton
          label={t('profile.summary.goToDashboard')}
          icon="pi pi-arrow-right"
          iconPos="right"
          outlined
          className="w-full"
          onClick={() => navigate('/')}
        />
      </div>
    </AppCard>
  )
}
