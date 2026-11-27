import { useTranslation } from 'react-i18next'
import { AppButton } from '@shared/ui'
import type { CourseModuleData } from '@shared/types/generated'
import { useMoveFocus } from '../../hooks/useMoveFocus'
import { ModuleCard } from './ModuleCard'
import { warningSurface, warningText } from '@shared/styles/tokens'

/** Quadro de módulos do curso. Devolve Fragment, não `<div>`: os filhos são
 * irmãos diretos do `<section className="space-y-4">` do CourseDialog, e um nó
 * novo mudaria o espaçamento (mesmo motivo do ClientGeneralFields).
 *
 * `key={i}`, nunca `key={m.id}`: o backend faz replace dos módulos, então os
 * ids trocam a cada save — um id como key remontaria as linhas e perderia o
 * foco. A ordem só muda por ação explícita do usuário (onMove).
 *
 * Como o índice é a identidade, o foco não acompanha o módulo sozinho: o
 * `useMoveFocus` o leva ao mesmo botão no índice novo (A-3). */
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
  const { containerRef, focusAfter } = useMoveFocus()

  const move = (i: number, dir: -1 | 1) => {
    focusAfter(i + dir, dir === -1 ? 'up' : 'down')
    onMove(i, dir)
  }
  // Sobrando módulo, o foco fica no botão de remover do mesmo índice (ou do novo
  // último, quando o removido era ele); sem nenhum, o botão de adicionar.
  const remove = (i: number) => {
    if (modules.length === 1) focusAfter(0, 'add')
    else focusAfter(Math.min(i, modules.length - 2), 'remove')
    onRemove(i)
  }

  return (
    <>
      {modules.length === 0 && (
        <p className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>{t('courseModule.empty')}</p>
      )}

      {/* `empty:hidden`: sem módulo e sem botão (leitura), o contêiner não pode
        * deixar a margem de `space-y` de um filho vazio. */}
      <div ref={containerRef} className="space-y-4 empty:hidden">
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
            onMoveUp={() => move(i, -1)}
            onMoveDown={() => move(i, 1)}
            onRemove={() => remove(i)}
          />
        ))}

        {!readOnly && (
          <AppButton label={t('courseModule.add')} icon="add" text onClick={onAdd} data-move="add" />
        )}
      </div>

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
