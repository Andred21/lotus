import { useTranslation } from 'react-i18next'
import { AppButton, AppDropdown, AppInputText, AppDatePicker, FormField, FormErrorSummary } from '@shared/ui'
import { formatDate, type DialogMode } from '@shared/lib'
import type { TurmaData } from '@shared/types/generated'
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
  // Derivado AQUI, não no call-site: quem monta este cartão não precisa saber
  // da RN-15 para nascer correto. Em `create` ainda não há turma — nada a
  // trancar, o registro nem existe.
  const bloqueado = turma != null && registroAcademicoBloqueado(turma)

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
        <h3 className="font-medium">{t('operation.config.title')}</h3>
        {/* Escondido, não desabilitado: botão cinza ainda promete "isto seria
            possível", e `UpdateTurmaAction` recusa a gravação com 422. Os campos
            continuam à vista — o que sai é a escrita, não a leitura. */}
        {mode === 'view' && onEdit && !bloqueado && (
          <AppButton label={t('common.edit')} icon="pi pi-pencil" outlined onClick={onEdit} />
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label={t('operation.config.modality')}
          error={f.fieldErrors?.modalidade?.[0]}
          readOnly={f.readOnly}
          value={modalityOptions.find((o) => o.value === f.form.modalidade)?.label ?? f.form.modalidade}
        >
          <AppDropdown
            value={f.form.modalidade}
            options={modalityOptions}
            onChange={(e) => f.set('modalidade', e.value)}
          />
        </FormField>

        <FormField
          label={t('operation.config.local')}
          error={f.fieldErrors?.local_aplicacao?.[0]}
          readOnly={f.readOnly}
          value={f.form.local_aplicacao ?? ''}
        >
          {/* O `disabled` que sobra NÃO é modo leitura: turma online não tem
              local a preencher, e isso vale em EDIÇÃO. Modo leitura sai pelo
              `readOnly` acima. */}
          <AppInputText
            value={f.form.local_aplicacao ?? ''}
            placeholder={t('operation.config.localPlaceholder')}
            disabled={f.form.modalidade === 'online'}
            onChange={(e) => f.set('local_aplicacao', e.target.value)}
          />
        </FormField>

        <FormField
          label={t('operation.config.startDate')}
          error={f.fieldErrors?.start_date?.[0]}
          readOnly={f.readOnly}
          value={readDate(f.form.start_date)}
        >
          <AppDatePicker value={f.form.start_date || null} onChange={(v) => f.set('start_date', v ?? '')} />
        </FormField>

        <FormField
          label={t('operation.config.endDate')}
          error={f.fieldErrors?.end_date?.[0]}
          readOnly={f.readOnly}
          value={readDate(f.form.end_date)}
        >
          <AppDatePicker value={f.form.end_date || null} onChange={(v) => f.set('end_date', v ?? '')} />
        </FormField>

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
          <AppButton variant="brandIcon" label={t('operation.config.save')} icon="pi pi-check" onClick={f.submit} disabled={f.pending} />
        </div>
      )}
    </div>
  )
}
