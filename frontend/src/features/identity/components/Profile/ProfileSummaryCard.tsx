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
 *
 * Recuado como o cartão de identidade (D-28): é leitura, não self-service. O CTA
 * para o Dashboard é NAVEGAÇÃO, não mutação, e não abre exceção na regra.
 */
export function ProfileSummaryCard({ redator }: { redator: RedatorProfileData }) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <AppCard variant="sunken" className="p-4">
      <FormSection title={t('profile.summary.title')} />

      {/* `max-w-[22rem]` = os mesmos 22rem da coluna para a qual o par foi desenhado
          (a segunda coluna do grid de `ProfilePage`). Sem o teto, o
          `justify-between` estica com o CARTÃO, e abaixo de `xl` o cartão ocupa
          a largura inteira: em 1024px o vão entre `Cursos habilitados` e o `3`
          media 548px, meio cartão vazio entre um rótulo e o número dele (UI-07
          do review de 2026-08-18). Em 390px o cartão já é menor que o teto e
          nada muda; em `xl` a coluna É o teto, e nada muda também. */}
      <div className="mt-3 flex max-w-[22rem] items-baseline justify-between gap-2">
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
