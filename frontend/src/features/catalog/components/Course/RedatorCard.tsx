import { useTranslation } from 'react-i18next'
import { IdentityCell, AppButton, AppSelectableCard, AppTag } from '@shared/ui'
import { idoneidade, IDONEIDADE_SEVERITY } from '@shared/lib'
import type { RedatorData } from '@shared/types/generated'

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
      <IdentityCell
        title={redator.name}
        description={<span className="font-mono">{redator.rut}</span>}
        image={redator.photo_url}
      />
      <AppTag value={t(`suitability.${status}`)} severity={IDONEIDADE_SEVERITY[status]} />
    </AppSelectableCard>
  )
}
