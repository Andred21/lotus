import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { IdentityCell, AppButton, AppTag, AppDialog, ConfirmDialog, SectionLabel } from '@shared/ui'
import type { MotivoInidoneidade, TurmaData } from '@shared/types/generated'
import { usePermissions } from '@shared/hooks'
import { useRedatorPicker } from '../../hooks/useRedatorPicker'
import { registroAcademicoBloqueado } from '../../lib/turmaStatus'
import { dangerText } from '@shared/styles/tokens'
import { RedatorPickerBody } from './RedatorPickerBody'

/** `[]` = idôneo; motivos = um aviso por motivo; `null` = lista não carregada,
 * sem tag (afirmar "Idóneo" por omissão seria afirmar o que o front não sabe). */
function TagsDeIdoneidade({ motivos }: { motivos: MotivoInidoneidade[] | null }) {
  const { t } = useTranslation()
  if (motivos === null) return null
  if (motivos.length === 0) return <AppTag value={t('operation.redator.idoneo')} severity="success" />
  return (
    <>
      {motivos.map((m) => (
        <AppTag key={m} value={t(`operation.redator.motivo.${m}`)} severity="warning" />
      ))}
    </>
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
            className="flex items-center justify-between rounded-surface border p-3"
            style={{ borderColor: 'var(--surface-border)' }}
          >
            {/* A tag fica IRMÃ da célula, não dentro da descrição: descrição é
              * linha de texto, e o slot dela agora carrega o e-mail. */}
            <div className="flex items-center gap-3">
              <IdentityCell title={r.name} description={r.email} image={r.photo_url} />
              <TagsDeIdoneidade motivos={picker.motivosDe(r.id)} />
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
        <RedatorPickerBody
          picker={picker}
          onPick={(redatorId) => {
            if (picker.pick(redatorId)) setOpen(false)
          }}
        />
      </AppDialog>

      <ConfirmDialog
        visible={picker.pendingConfirmation !== null}
        title={t('operation.redator.confirmIneligibleTitle')}
        message={t('operation.redator.confirmIneligibleMessage', {
          motivos: (picker.pendingConfirmation?.motivos ?? [])
            .map((m) => t(`operation.redator.motivo.${m}`))
            .join(', '),
        })}
        confirmLabel={t('operation.redator.confirmIneligibleAction')}
        severity="warning"
        pending={picker.pending}
        onConfirm={() => {
          picker.confirmPick()
          setOpen(false)
        }}
        onCancel={picker.cancelPick}
      />
    </div>
  )
}
