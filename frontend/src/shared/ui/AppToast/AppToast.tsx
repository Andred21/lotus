import { forwardRef, useImperativeHandle, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Toast } from 'primereact/toast'
import { primeSlotIcon } from '../AppIcon'

// O tema crava o ícone da mensagem em 2rem (`.p-toast-message-icon.p-icon`); o
// do fechar vai no padrão (20px). Vão por MENSAGEM (`show`): o `Toast` não tem prop de ícone global
// no tipo do pacote. A cor vem da classe do slot (por severidade), que `iconProps` traz.
const SUCCESS_ICON = primeSlotIcon('checkCircle', 32)
const ERROR_ICON = primeSlotIcon('warningCircle', 32)
const CLOSE_ICON = primeSlotIcon('close')

/** O que o componente expõe por `ref`: as duas mensagens que o produto emite.
 * Declarado aqui, por estrutura — o contexto (`useToast`, em `shared/hooks`)
 * tem a mesma forma sem importar este tipo. */
export type AppToastHandle = {
  success: (detail: string) => void
  error: (detail: string) => void
}

/** A superfície do toast global: único ponto que conhece o `Toast` do
 * PrimeReact. Só desenha — o contexto que as features consomem
 * (`useToast`) vive em `shared/hooks`, e o `ToastProvider` em `app/providers`
 * liga os dois por `ref`. */
export const AppToast = forwardRef<AppToastHandle>((_props, ref) => {
  const toast = useRef<Toast>(null)
  const { t } = useTranslation()

  // O nome do fechar sai por mensagem (`pt.closeButton`): o Toast não repassa
  // `ariaCloseLabel` à mensagem, e o fallback do Prime é o locale GLOBAL dele,
  // que `locale()` nunca troca no projeto. `t` entra nas deps para a troca de
  // idioma valer na próxima mensagem.
  useImperativeHandle(ref, () => {
    const pt = { closeButton: { 'aria-label': t('common.close') } }
    return {
      success: (detail) => {
        toast.current?.show({ severity: 'success', icon: SUCCESS_ICON, closeIcon: CLOSE_ICON, detail, life: 5000, pt })
      },
      error: (detail) => {
        toast.current?.show({ severity: 'error', icon: ERROR_ICON, closeIcon: CLOSE_ICON, detail, life: 8000, pt })
      },
    }
  }, [t])

  return <Toast ref={toast} position="bottom-right" />
})
AppToast.displayName = 'AppToast'
