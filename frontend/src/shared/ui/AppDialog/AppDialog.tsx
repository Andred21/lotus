import { useEffect, useRef } from 'react'
import { Dialog } from 'primereact/dialog'
import type { DialogProps } from 'primereact/dialog'
import { useTranslation } from 'react-i18next'
import { mergePt } from '../mergePt'
import { appDialogPt } from './style'

export type { DialogProps as AppDialogProps } from 'primereact/dialog'

/** Wrapper do Dialog: maximizable por default, largo/alto, header e footer na
 * mesma superfície. Usado pelo CrudDialog.
 *
 * Devolve o foco ao disparador no fechamento. O mecanismo do PrimeReact existe
 * (`onExited` -> `DomHandler.focus`) mas é INERTE aqui: ele captura dentro de um
 * `useUpdateEffect`, que pula a primeira execução, e as 9 páginas do repo montam
 * o diálogo condicionalmente já com `visible`. Os dois não competem — o do
 * PrimeReact segue rodando com `null`, que é no-op. */
export function AppDialog({ pt, visible, ...props }: DialogProps) {
  const { t } = useTranslation()
  const triggerRef = useRef<HTMLElement | null>(null)
  const wasVisible = useRef(false)

  // Captura no RENDER, não em efeito: quando o efeito rodaria, o Dialog já moveu
  // o foco para dentro de si e o disparador deixou de ser o `activeElement`.
  /* eslint-disable react-hooks/refs -- mutação de ref em render é intencional aqui,
   * não descuido: é a única forma de detectar a borda de subida de `visible`
   * (false -> true) num componente que já estava montado (o caso 2 de montagem
   * do wrapper) e capturar o disparador ANTES do Dialog mover o foco pra dentro
   * de si no mesmo commit. `wasVisible` não é o idioma de "lazy init" que a regra
   * permite (ref != null uma vez só) porque a borda se repete a cada abertura. */
  if (visible && !wasVisible.current) {
    triggerRef.current = document.activeElement as HTMLElement | null
  }
  wasVisible.current = Boolean(visible)
  /* eslint-enable react-hooks/refs */

  useEffect(() => {
    if (!visible) return
    return () => {
      // NÃO zera `triggerRef.current` aqui. O StrictMode do dev roda esta
      // limpeza uma vez a mais, de propósito (mount -> cleanup -> mount,
      // simulado, no mesmo commit) para expor efeitos que não sobrevivem a
      // ser remontados. Como a captura vive no RENDER (acima), não neste
      // efeito, aquele ciclo fantasma não recaptura nada — só a limpeza
      // roda de novo. Zerar aqui apagava o disparador antes do fechamento
      // real, e o foco caía pro <body> (bug visto e provado no navegador
      // antes desta correção). Deixar o valor parado é seguro: a próxima
      // abertura sempre sobrescreve via a captura no render.
      const trigger = triggerRef.current
      // Disparador que saiu do DOM (linha de tabela removida pela invalidação)
      // não recebe foco: o navegador fica onde está, sem exceção.
      if (trigger && document.contains(trigger)) trigger.focus()
    }
  }, [visible])

  return (
    <Dialog
      maximizable
      draggable={false}
      visible={visible}
      pt={mergePt<DialogProps['pt']>(mergePt(appDialogPt, pt), {
        // Pinado DEPOIS do `pt` do caller: o nome do controle é acessibilidade,
        // não estilo, e não pode ser desligado por quem customiza o `pt` (mesma
        // regra do `customUpload` em `AppFileUpload`). Funde por `mergePt`, e
        // não por spread raso, porque o spread trocaria a chave INTEIRA: quem
        // passasse `pt.closeButton.className` perdia o nome acessível, e quem
        // não passasse nada perdia a customização — o mesmo silêncio que o
        // `AppFileUpload` já tinha pago. O rótulo de maximizar é DINÂMICO — o
        // `pt` do Dialog recebe `state` (`dialog.cjs.js:453-455`) —, porque um
        // rótulo fixo mentiria em metade dos estados.
        maximizableButton: ({ state }: { state: { maximized: boolean } }) => ({
          'aria-label': state.maximized ? t('common.restoreDialog') : t('common.maximizeDialog'),
        }),
        // O irmão que faltava. O botão de maximizar ganhou nome traduzido e o de
        // FECHAR ficou no default do Prime — `localeOption('close')`, isto é
        // "Close" em inglês, em TODO diálogo da aplicação (medido no gate do
        // BD-16). Não vem pela locale global do Prime porque `locale('es')`
        // nunca é chamado no projeto: `primeLocale.ts` só faz `addLocale`, e um
        // rótulo pendurado lá ficaria congelado na troca de idioma — o mesmo
        // motivo pelo qual o olho do `AppPassword` se nomeia no wrapper (UI-08).
        closeButton: { 'aria-label': t('common.close') },
      })}
      {...props}
    />
  )
}
