import { severityTone } from '../AppTag/tones'

export type ConfirmDialogSeverity = 'confirm' | 'warning' | 'danger'

/** A pintura de cada severidade da confirmação compacta (bloco 43, spec J3):
 * faixa no topo e ícone circular no header, na cor do sinal. Fundo e tinta do
 * ícone são os do `AppTag` (`severityTone`), medidos pela régua UI-04; a faixa é
 * o hue cheio, que é traço e não texto. `confirm` é verde (`success`, spec J11):
 * o botão de confirmar já veste a marca, e o ícone diz o TIPO da pergunta — um
 * azul ao lado do celeste leria como outro tom da mesma cor. */
export const confirmSeverityStyle: Record<
  ConfirmDialogSeverity,
  { stripe: string; icon: string; background: string; color: string }
> = {
  confirm: { stripe: 'var(--green-500)', icon: 'pi pi-check-circle', ...severityTone.success },
  warning: { stripe: 'var(--yellow-500)', icon: 'pi pi-exclamation-triangle', ...severityTone.warning },
  danger: { stripe: 'var(--red-500)', icon: 'pi pi-exclamation-circle', ...severityTone.danger },
}
