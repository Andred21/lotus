import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { IdentityCell, AppButton, AppTag, AppDialog, AppErrorState, SectionLabel } from '@shared/ui'
import type { TurmaData } from '@shared/types/generated'
import { usePermissions } from '@shared/hooks'
import { useRedatorPicker } from '../../hooks/useRedatorPicker'
import { registroAcademicoBloqueado } from '../../lib/turmaStatus'
import { dangerText } from '@shared/styles/tokens'
import { loadErrorHint, screenDetail } from '@shared/lib'

type Picker = ReturnType<typeof useRedatorPicker>

/** Corpo do diálogo do picker. A ordem das guardas é erro > carregando > vazio >
 * lista: invertê-la faria a falha de carga passar por "nenhum redator elegível"
 * (spec D16). Como guardas sequenciais a ordem é o próprio fluxo do código —
 * antes era um ternário de 4 níveis dentro do `return`. */
function PickerBody({ picker, onPick }: { picker: Picker; onPick: (redatorId: number) => void }) {
  const { t } = useTranslation()

  if (picker.loadError)
    return (
      <AppErrorState
        title={t('common.loadError')}
        detail={screenDetail(picker.loadError) ?? t(loadErrorHint(picker.loadError))}
        retryLabel={t('common.retry')}
        onRetry={picker.reloadList}
      />
    )

  if (picker.loadingList)
    return <p className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>{t('common.loading')}</p>

  if (picker.eligible.length === 0)
    return <p className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>{t('operation.redator.pickerEmpty')}</p>

  return (
    <ul role="list" className="space-y-2">
      {picker.eligible.map((r) => (
        <li key={r.id} className="flex items-center justify-between gap-4 rounded-lg border p-3" style={{ borderColor: 'var(--surface-border)' }}>
          <IdentityCell title={r.name} description={r.email} image={r.photo_url} />
          <AppButton
            variant="primary"
            label={t('operation.redator.pick')}
            icon="pi pi-check"
            disabled={picker.pending}
            onClick={() => onPick(r.id!)}
          />
        </li>
      ))}
    </ul>
  )
}

export function RedatorDesignation({ turma }: { turma: TurmaData }) {
  const { t } = useTranslation()
  const picker = useRedatorPicker(turma)
  const [open, setOpen] = useState(false)
  const { can } = usePermissions()
  // RN-15: `DesignateRedatorAction` e `RemoveRedatorAction` recusam a escrita
  // com 422 numa turma concluída. Os dois controles somem em vez de ficarem
  // cinzas — a lista de redatores, a tag e a nota continuam, porque ler quem
  // assinou o registro fechado é justamente o que se faz depois de fechá-lo.
  const bloqueado = registroAcademicoBloqueado(turma)
  // A outra metade da mesma pergunta: `operation.turma.assign_redator` cobre
  // designar E remover — é a MESMA permissão nos dois métodos do controller
  // (`designateRedator`, `removeRedator`) —, então os dois controles somem
  // juntos, e pelo mesmo predicado que a RN-15. Escondia-se por regra de estado
  // e não por permissão até o review de 2026-08-24 (Q-2), o que dava ao redator
  // recém-chegado do dashboard um "Designar redator" que só renderia 403.
  const podeDesignar = !bloqueado && can('operation.turma.assign_redator')

  return (
    <div className="space-y-4 p-4">
      <SectionLabel as="h3" rule={false}>{t('operation.redator.title')}</SectionLabel>

      {turma.redatores.length === 0 && <p className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>{t('operation.redator.none')}</p>}

      <ul role="list" className="space-y-2">
        {turma.redatores.map((r) => (
          <li
            key={r.id}
            className="flex items-center justify-between rounded-lg border p-3"
            style={{ borderColor: 'var(--surface-border)' }}
          >
            {/* A tag fica IRMÃ da célula, não dentro da descrição: descrição é
              * linha de texto, e o slot dela agora carrega o e-mail. */}
            <div className="flex items-center gap-3">
              <IdentityCell title={r.name} description={r.email} image={r.photo_url} />
              <AppTag value={t('operation.redator.idoneo')} severity="success" />
            </div>
            {podeDesignar && (
              <AppButton
                label={t('operation.redator.remove')}
                icon="pi pi-times"
                outlined
                severity="danger"
                disabled={picker.pending}
                onClick={() => picker.remove(r.id)}
              />
            )}
          </li>
        ))}
      </ul>

      {podeDesignar && (
        <AppButton
          label={turma.redatores.length > 0 ? t('operation.redator.change') : t('operation.redator.designate')}
          icon="pi pi-user-plus"
          outlined
          onClick={() => setOpen(true)}
        />
      )}

      <p className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>{t('operation.redator.helpNote')}</p>
      {picker.error && <p className="text-sm" style={{ color: dangerText }}>{picker.error}</p>}

      <AppDialog visible={open} header={t('operation.redator.pickerTitle')} onHide={() => setOpen(false)}>
        <PickerBody
          picker={picker}
          onPick={(redatorId) => {
            picker.designate(redatorId)
            setOpen(false)
          }}
        />
      </AppDialog>
    </div>
  )
}
