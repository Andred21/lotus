import { useTranslation } from 'react-i18next'
import { AppButton, AppInputText, AppTextarea, NestedField } from '@shared/ui'
import type { CourseModuleData } from '@shared/types/generated'

/** Um módulo do curso. `index` entra porque a chave do erro é posicional
 * (`modules.<i>.<campo>`), como o 422 do backend a devolve — mesmo motivo do
 * `index` no `ContactCard`. Os botões de mover vêm desabilitados nas pontas;
 * o no-op de faixa mora no `moveModule` do `useCourseForm`. */
export function ModuleCard({
  module, index, isFirst, isLast, readOnly, fieldErrors, onPatch, onMoveUp, onMoveDown, onRemove,
}: {
  module: CourseModuleData
  index: number
  isFirst: boolean
  isLast: boolean
  readOnly: boolean
  fieldErrors?: Record<string, string[]> | null
  onPatch: (patch: Partial<CourseModuleData>) => void
  onMoveUp: () => void
  onMoveDown: () => void
  onRemove: () => void
}) {
  const { t } = useTranslation()

  return (
    <div className="space-y-3 rounded border border-slate-200 p-3 dark:border-slate-700">
      <div className="flex items-start gap-2">
        <span className="mt-2.5 text-xs font-semibold text-slate-500">{t('courseModule.itemLabel', { n: index + 1 })}</span>
        <NestedField error={fieldErrors?.[`modules.${index}.name`]?.[0]} readOnly={readOnly} value={module.name}>
          <div className="flex-1">
            <AppInputText
              placeholder={t('courseModule.namePlaceholder')}
              aria-label={t('courseModule.name')}
              value={module.name}
              onChange={(e) => onPatch({ name: e.target.value })}
              className="w-full"
            />
          </div>
        </NestedField>
        {!readOnly && (
          <div className="flex gap-1">
            <AppButton icon="pi pi-arrow-up" text aria-label={t('courseModule.moveUp')} tooltip={t('courseModule.moveUp')} disabled={isFirst} onClick={onMoveUp} />
            <AppButton icon="pi pi-arrow-down" text aria-label={t('courseModule.moveDown')} tooltip={t('courseModule.moveDown')} disabled={isLast} onClick={onMoveDown} />
            <AppButton icon="pi pi-trash" text aria-label={t('courseModule.remove')} tooltip={t('courseModule.remove')} onClick={onRemove} />
          </div>
        )}
      </div>

      <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
        {/* Legenda fica FORA do NestedField: ele não tem prop `label` (ao
            contrário do FormField), e em leitura só `value` é montado — uma
            legenda dentro de `children` sumiria junto do input. */}
        <div>
          <span className="mb-1 block text-xs text-slate-500">{t('courseModule.theoryHours')}</span>
          <NestedField
            error={fieldErrors?.[`modules.${index}.theory_hours`]?.[0]}
            readOnly={readOnly}
            value={String(module.theory_hours)}
          >
            <AppInputText
              aria-label={t('courseModule.theoryHours')}
              value={String(module.theory_hours)}
              onChange={(e) => onPatch({ theory_hours: Number(e.target.value.replace(/\D/g, '')) || 0 })}
              className="w-full"
            />
          </NestedField>
        </div>
        <div>
          <span className="mb-1 block text-xs text-slate-500">{t('courseModule.practiceHours')}</span>
          <NestedField
            error={fieldErrors?.[`modules.${index}.practice_hours`]?.[0]}
            readOnly={readOnly}
            value={String(module.practice_hours)}
          >
            <AppInputText
              aria-label={t('courseModule.practiceHours')}
              value={String(module.practice_hours)}
              onChange={(e) => onPatch({ practice_hours: Number(e.target.value.replace(/\D/g, '')) || 0 })}
              className="w-full"
            />
          </NestedField>
        </div>
        <span className="pb-2 text-sm text-slate-500">
          {t('courseModule.total', { hours: module.theory_hours + module.practice_hours })}
        </span>
      </div>

      <div>
        <span className="mb-1 block text-xs text-slate-500">{t('courseModule.learnings')}</span>
        <NestedField
          error={fieldErrors?.[`modules.${index}.learnings`]?.[0]}
          readOnly={readOnly}
          value={module.learnings ?? ''}
        >
          <AppTextarea
            aria-label={t('courseModule.learnings')}
            value={module.learnings ?? ''}
            rows={2}
            onChange={(e) => onPatch({ learnings: e.target.value })}
            className="w-full"
          />
        </NestedField>
      </div>

      <div>
        <span className="mb-1 block text-xs text-slate-500">{t('courseModule.contents')}</span>
        <NestedField
          error={fieldErrors?.[`modules.${index}.contents`]?.[0]}
          readOnly={readOnly}
          value={module.contents ?? ''}
        >
          <AppTextarea
            aria-label={t('courseModule.contents')}
            value={module.contents ?? ''}
            rows={3}
            onChange={(e) => onPatch({ contents: e.target.value })}
            className="w-full"
          />
        </NestedField>
      </div>
    </div>
  )
}
