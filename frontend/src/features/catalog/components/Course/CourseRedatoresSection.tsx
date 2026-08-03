import { useTranslation } from 'react-i18next'
import { AppErrorState, AppSkeleton } from '@shared/ui'
import { RedatorCard } from './RedatorCard'
import type { useCourseRedatores } from '../../hooks/useCourseRedatores'

/** Seção de redatores do diálogo de curso. Três estados distintos, de propósito
 * (spec D11): antes, um GET com 403 caía em `?? []` e a tela dizia "sem
 * redatores habilitados" num curso que tem três — afirmação falsa sobre o banco.
 *
 * A cadeia é loading > erro > create > view/edit, na ordem de sempre. O terceiro
 * ramo é MODO DE DIÁLOGO, não estado de carga: achatar os dois eixos numa lista
 * de guardas mudaria o significado do código sem mudar a tela. */
export function CourseRedatoresSection({
  redatores, isCreate, enabledIds, onToggle,
}: {
  redatores: ReturnType<typeof useCourseRedatores>
  isCreate: boolean
  enabledIds: number[]
  onToggle: (id: number) => void
}) {
  const { t } = useTranslation()

  return redatores.isLoading ? (
    <div className="grid gap-2 sm:grid-cols-2" aria-busy="true">
      <AppSkeleton height="4.5rem" />
      <AppSkeleton height="4.5rem" />
    </div>
  ) : redatores.isError ? (
    <AppErrorState
      title={t('common.loadError')}
      detail={redatores.errorDetail ?? t('common.loadErrorHint')}
      retryLabel={t('common.retry')}
      onRetry={redatores.refetch}
    />
  ) : isCreate ? (
    // Exceção do produto: habilitar redatores pelo lado do curso só no cadastro.
    <div className="space-y-2">
      <p className="text-xs" style={{ color: 'var(--text-color-secondary)' }}>
        {t('course.redatoresSelectNote')}
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {redatores.allRedatores.map((r) => (
          <RedatorCard
            key={r.id}
            redator={r}
            selected={enabledIds.includes(r.id as number)}
            onToggle={() => onToggle(r.id as number)}
          />
        ))}
      </div>
    </div>
  ) : (
    // View/edit: leitura. A edição da habilitação mora em Pessoas.
    <div className="space-y-2">
      <p className="text-xs" style={{ color: 'var(--text-color-secondary)' }}>
        {t('course.redatoresReadonlyNote')}
      </p>
      {redatores.enabledRedatores.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>
          {t('course.noRedatores')}
        </p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {redatores.enabledRedatores.map((r) => (
            <RedatorCard
              key={r.id}
              redator={r}
              onView={redatores.canOpenRedator ? () => redatores.openRedator(r.id as number) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  )
}
