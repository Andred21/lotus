import { useTranslation } from 'react-i18next'
import { IdentityCell, AppButton, AppSelectableCard, AppTag, identifierClass } from '@shared/ui'
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
            icon="view"
            text
            aria-label={t('common.view')}
            tooltip={t('common.view')}
            onClick={onView}
          />
        ) : undefined
      }
    >
      {/* Com `onToggle` o card inteiro é um `<button aria-pressed>`: a célula não
        * pode ser focável lá dentro (HTML inválido, leitura duplicada). Só
        * leitura, ela é. */}
      <IdentityCell
        focusable={!onToggle}
        title={redator.name}
        description={<span className={identifierClass}>{redator.rut}</span>}
        image={redator.photo_url}
      />
      <AppTag value={t(`suitability.${status}`)} severity={IDONEIDADE_SEVERITY[status]} />
    </AppSelectableCard>
  )
}
