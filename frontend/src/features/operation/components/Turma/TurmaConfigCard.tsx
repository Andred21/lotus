import { useTranslation } from 'react-i18next'
import { AppButton, AppDropdown, AppInputText, AppDatePicker, FormField, FormErrorSummary, SectionLabel, useFormField } from '@shared/ui'
import { formatDate, type DialogMode } from '@shared/lib'
import type { TurmaData } from '@shared/types/generated'
import { usePermissions } from '@shared/hooks'
import { useTurmaConfigForm } from '../../hooks/useTurmaConfigForm'
import { registroAcademicoBloqueado } from '../../lib/turmaStatus'
import { dangerText } from '@shared/styles/tokens'

type Props = {
  mode: DialogMode
  turma?: TurmaData | null
  quoteId?: number
  onSaved: (turmaId: number) => void
  onEdit?: () => void
  onCancel?: () => void
}

const MAPPED = ['modalidade', 'local_aplicacao', 'start_date', 'end_date']

export function TurmaConfigCard({ mode, turma = null, quoteId, onSaved, onEdit, onCancel }: Props) {
  const { t } = useTranslation()
  const f = useTurmaConfigForm({ mode, turma, quoteId, onSaved })
  const campo = useFormField(f)
  const { can } = usePermissions()
  // Derivado AQUI, não no call-site: quem monta este cartão não precisa saber
  // da RN-15 para nascer correto. Em `create` ainda não há turma — nada a
  // trancar, o registro nem existe.
  const bloqueado = turma != null && registroAcademicoBloqueado(turma)
  // Duas perguntas, uma resposta: o botão só existe quando a Action ACEITARIA a
  // gravação. A RN-15 tranca o registro concluído (422 do
  // `assertAcademicallyWritable`) e `operation.turma.update` é o que o
  // `TurmaController` exige no `update` — sem qualquer uma delas o clique só
  // renderia erro. Esconder as duas metades pelo mesmo predicado é o que
  // impede a assimetria: a versão anterior escondia por RN-15 e ignorava a
  // permissão, e o redator — que chega a esta página pela pendência do
  // dashboard e tem só `turma.view` e `submit_docs` — via "Editar"
  // (Q-2 do review de 2026-08-24).
  const podeEditar = !bloqueado && can('operation.turma.update')

  const modalityOptions = [
    { label: t('operation.modality.presencial'), value: 'presencial' },
    { label: t('operation.modality.online'), value: 'online' },
  ]

  // Valor de APRESENTAÇÃO da data em leitura: o formato curto do locale ativo,
  // como a tela mostra em toda parte, nunca o ISO cru que o backend espera.
  // `T00:00:00` sem `Z` para parsear à meia-noite LOCAL — `new Date('YYYY-MM-DD')`
  // recua um dia em fuso negativo, e o Chile é UTC-3/-4 (mesma razão do
  // `isoToDate` do AppDatePicker).
  const readDate = (iso: string) => (iso ? formatDate(new Date(`${iso}T00:00:00`)) : '')

  return (
    <div className="space-y-5 p-4">
      <div className="flex items-center justify-between">
        <SectionLabel as="h3" rule={false}>{t('operation.config.title')}</SectionLabel>
        {/* Escondido, não desabilitado: botão cinza ainda promete "isto seria
            possível", e `UpdateTurmaAction` recusa a gravação com 422. Os campos
            continuam à vista — o que sai é a escrita, não a leitura. */}
        {mode === 'view' && onEdit && podeEditar && (
          <AppButton label={t('common.edit')} icon="pi pi-pencil" outlined onClick={onEdit} />
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <campo.Field
          name="modalidade"
          label={t('operation.config.modality')}
          value={modalityOptions.find((o) => o.value === f.form.modalidade)?.label ?? f.form.modalidade}
        >
          <AppDropdown options={modalityOptions} />
        </campo.Field>

        <campo.Field name="local_aplicacao" label={t('operation.config.local')}>
          {/* O `disabled` que sobra NÃO é modo leitura: turma online não tem
              local a preencher, e isso vale em EDIÇÃO. Modo leitura sai pelo
              `readOnly` do Field. */}
          <AppInputText
            placeholder={t('operation.config.localPlaceholder')}
            disabled={f.form.modalidade === 'online'}
          />
        </campo.Field>

        <campo.Field name="start_date" label={t('operation.config.startDate')} value={readDate(f.form.start_date)}>
          <AppDatePicker value={f.form.start_date || null} onChange={(v) => f.set('start_date', v ?? '')} />
        </campo.Field>

        <campo.Field name="end_date" label={t('operation.config.endDate')} value={readDate(f.form.end_date)}>
          <AppDatePicker value={f.form.end_date || null} onChange={(v) => f.set('end_date', v ?? '')} />
        </campo.Field>

        {mode !== 'create' && (
          /* Carga horária é derivada do curso: nasce só-leitura em qualquer
             modo, então não há controle a montar. */
          <FormField
            label={t('operation.config.workload')}
            readOnly
            value={f.workloadHours != null ? t('operation.config.workloadValue', { hours: f.workloadHours }) : ''}
          />
        )}
      </div>

      <FormErrorSummary errors={f.fieldErrors} mapped={MAPPED} />
      {f.generalError && (
        <p className="text-sm" style={{ color: dangerText }}>
          {f.generalError}
        </p>
      )}

      {mode !== 'view' && (
        <div className="flex justify-end gap-2">
          {onCancel && <AppButton label={t('operation.config.cancel')} outlined onClick={onCancel} disabled={f.pending} />}
          <AppButton variant="primary" label={t('operation.config.save')} icon="pi pi-check" onClick={f.submit} disabled={f.pending} />
        </div>
      )}
    </div>
  )
}
