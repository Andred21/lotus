import { useTranslation } from 'react-i18next'
import { AppButton } from '@shared/ui'
import type { CourseModuleData } from '@shared/types/generated'
import { ModuleCard } from './ModuleCard'
import { warningSurface, warningText } from '@shared/styles/tokens'

/** Quadro de módulos do curso. Devolve Fragment, não `<div>`: os filhos são
 * irmãos diretos do `<section className="space-y-4">` do CourseDialog, e um nó
 * novo mudaria o espaçamento (mesmo motivo do ClientGeneralFields).
 *
 * `key={i}`, nunca `key={m.id}`: o backend faz replace dos módulos, então os
 * ids trocam a cada save — um id como key remontaria as linhas e perderia o
 * foco. A ordem só muda por ação explícita do usuário (onMove). */
export function ModuleFields({
  modules, readOnly, fieldErrors, workloadHours, modulesTotal, hoursMismatch,
  onAdd, onRemove, onPatch, onMove,
}: {
  modules: CourseModuleData[]
  readOnly: boolean
  fieldErrors?: Record<string, string[]> | null
  workloadHours: number
  modulesTotal: number
  hoursMismatch: boolean
  onAdd: () => void
  onRemove: (i: number) => void
  onPatch: (i: number, patch: Partial<CourseModuleData>) => void
  onMove: (i: number, dir: -1 | 1) => void
}) {
  const { t } = useTranslation()

  return (
    <>
      {modules.length === 0 && (
        <p className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>{t('courseModule.empty')}</p>
      )}

      {modules.map((m, i) => (
        <ModuleCard
          key={i}
          module={m}
          index={i}
          isFirst={i === 0}
          isLast={i === modules.length - 1}
          readOnly={readOnly}
          fieldErrors={fieldErrors}
          onPatch={(patch) => onPatch(i, patch)}
          onMoveUp={() => onMove(i, -1)}
          onMoveDown={() => onMove(i, 1)}
          onRemove={() => onRemove(i)}
        />
      ))}

      {!readOnly && (
        <AppButton label={t('courseModule.add')} icon="pi pi-plus" text onClick={onAdd} />
      )}

      {modules.length > 0 && (
        <p className="text-right text-sm" style={{ color: 'var(--text-color-secondary)' }}>
          {t('courseModule.modulesTotal', { hours: modulesTotal })}
        </p>
      )}

      {/* Aviso, não erro: âmbar e sem role="alert" (o FormErrorBanner é vermelho e
          para 422). NUNCA bloqueia o submit — §5.7, registro não bloqueia ação. */}
      {hoursMismatch && (
        <p
          className="rounded-control px-3 py-2 text-sm"
          style={{
            background: warningSurface,
            color: warningText,
          }}
        >
          {t('courseModule.hoursMismatch', { modules: modulesTotal, workload: workloadHours })}
        </p>
      )}
    </>
  )
}
