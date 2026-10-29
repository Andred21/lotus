import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { DialogFrame } from '../AppDialog/DialogFrame'
import { AppButton } from '../AppButton'
import { FormErrorBanner } from '../FormField'
import { confirmSeverityStyle, type ConfirmDialogSeverity } from './style'

export type { ConfirmDialogSeverity } from './style'

/** Confirmação compacta (bloco 43): 28rem, sem maximizar, e a severidade dita
 * antes do texto — faixa no topo e ícone no header. `confirm` pergunta (aprovar
 * uma cotação libera a turma na Operação), `warning` avisa de um efeito
 * colateral ou de uma regra contornada (mover o aluno de cliente, designar um
 * redator inelegível) e `danger` destrói ou não tem volta.
 * Não usa a moldura navy do `AppDialog`: as duas famílias se distinguem à
 * primeira vista (spec J3/J4). Apresentacional puro: não conhece feature nem
 * mutação. */
export function ConfirmDialog({
  visible, title, message, children, confirmLabel, confirmIcon = 'pi pi-check', confirmDisabled,
  severity = 'confirm', pending, error, onConfirm, onCancel,
}: {
  visible: boolean
  title: string
  message: string
  /** Conteúdo extra do corpo, depois da mensagem (ex.: lista de detalhes). */
  children?: ReactNode
  confirmLabel?: string
  confirmIcon?: string
  /** Desliga só o confirmar (ex.: motivo obrigatório ainda vazio). */
  confirmDisabled?: boolean
  severity?: ConfirmDialogSeverity
  pending?: boolean
  error?: string | null
  onConfirm: () => void
  onCancel: () => void
}) {
  const { t } = useTranslation()
  const s = confirmSeverityStyle[severity]

  const header = (
    <div data-severity={severity} className="flex items-center gap-3 pr-6">
      <span
        aria-hidden
        data-severity-icon
        className={`${s.icon} grid size-10 shrink-0 place-items-center rounded-full text-xl`}
        style={{ background: s.background, color: s.color }}
      />
      <span>{title}</span>
    </div>
  )

  const footer = (
    <div className="flex justify-end gap-2">
      <AppButton label={t('common.cancel')} text disabled={pending} onClick={onCancel} />
      {/* `confirm` veste a marca — a mesma grafia do `CrudDialog` (achado B3).
        * `warning` e `danger` vestem o preenchido de severidade, que é o sinal;
        * a marca sairia por cima dele. */}
      <AppButton
        variant={severity === 'confirm' ? 'primary' : undefined}
        severity={severity === 'confirm' ? undefined : severity}
        label={confirmLabel ?? t('common.save')}
        icon={confirmIcon}
        loading={pending}
        disabled={confirmDisabled}
        onClick={onConfirm}
      />
    </div>
  )

  return (
    // Com a requisição em voo, ESC e o X do header ficam travados junto com o
    // Cancelar: fechar aqui solta o observer da mutação e a resposta (403/422)
    // chegaria sem ninguém para exibi-la.
    <DialogFrame
      header={header}
      visible={visible}
      onHide={onCancel}
      footer={footer}
      closable={!pending}
      closeOnEscape={!pending}
      maximizable={false}
      pt={{
        root: {
          className: 'w-[95vw] max-w-[28rem]',
          style: { borderTop: `4px solid ${s.stripe}` },
        },
      }}
    >
      <FormErrorBanner message={error} />
      <p className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>{message}</p>
      {children}
    </DialogFrame>
  )
}
