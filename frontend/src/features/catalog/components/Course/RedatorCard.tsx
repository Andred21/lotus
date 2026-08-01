import { useTranslation } from 'react-i18next'
import { AppAvatar, AppButton, AppSelectableCard, AppTag } from '@shared/ui'
import { idoneidade } from '@shared/lib'
import type { RedatorData } from '@shared/types/generated'

/** Mesmo mapa usado no cabeçalho do RedatorDialog — não inventar uma segunda
 * convenção de cor para o mesmo conceito (spec D5). */
const SEVERITY = {
  idoneo: 'success',
  por_vencer: 'warning',
  no_idoneo: 'danger',
} as const

/**
 * Card do redator visto pelo lado do curso. A idoneidade é derivada no front
 * (regra do projeto: não vive no DTO) a partir de `documents` + `course_ids`,
 * que o `GET /api/redatores` já entrega.
 */
export function RedatorCard({
  redator, selected, onToggle, onView,
}: {
  redator: RedatorData
  selected?: boolean
  onToggle?: () => void
  onView?: () => void
}) {
  const { t } = useTranslation()
  const status = idoneidade(redator)

  return (
    <AppSelectableCard
      selected={selected}
      onToggle={onToggle}
      action={
        onView ? (
          <AppButton
            icon="pi pi-eye"
            text
            rounded
            aria-label={t('common.view')}
            tooltip={t('common.view')}
            onClick={onView}
          />
        ) : undefined
      }
    >
      <AppAvatar name={redator.name} image={redator.photo_url} size="large" />
      <div className="min-w-0">
        <p className="truncate font-medium">{redator.name}</p>
        <p className="truncate font-mono text-sm" style={{ color: 'var(--text-color-secondary)' }}>
          {redator.rut}
        </p>
        <AppTag
          className="mt-1"
          value={t(`suitability.${status}`)}
          severity={SEVERITY[status]}
        />
      </div>
    </AppSelectableCard>
  )
}
