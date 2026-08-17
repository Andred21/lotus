import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { AppDialog } from '../AppDialog'
import { AppButton } from '../AppButton'
import { AppFileRow } from '../AppFileRow'
import { isPreviewable } from '@shared/lib/upload'

export type PreviewableFile = {
  original_name: string
  mime?: string | null
  size?: number
  download_url: string
}

export type AppFilePreviewDialogProps = {
  file: PreviewableFile | null
  visible: boolean
  onHide: () => void
}

/** Pré-visualização de documento de `files`. Imagem e PDF renderizam inline
 * pela URL pré-assinada; formato sem preview mostra a linha do arquivo e o
 * botão de baixar (spec D9) — a ação NÃO some conforme o tipo, porque ação que
 * desaparece é falha escondida.
 *
 * **O foco vai ao contêiner do diálogo na montagem, e há um limite que o
 * navegador é dono.** Com `activeElement` = `IFRAME`, Escape não fechava: o
 * visor nativo do Chrome consome a tecla DENTRO do iframe e o handler do
 * diálogo, que escuta no documento hospedeiro, nunca a recebe (D-25 do review de
 * 2026-08-17). Focar o contêiner faz Escape funcionar em todo o caminho até o
 * primeiro clique dentro do visor. Depois disso, a tecla é do navegador e o `X`
 * é a saída garantida — não há correção possível do lado do documento pai, e
 * fingir que há seria pior do que declarar.
 *
 * O `focusOnShow` do Prime NÃO serve para isso, e foi assim que a D-25 sobreviveu
 * à primeira correção: ele foca o primeiro elemento FOCÁVEL do conteúdo, e num
 * visor de PDF esse elemento é justamente o `<iframe>` — medido no gate do BD-16,
 * com `activeElement` = `IFRAME` logo após abrir e Escape inerte. Por isso o foco
 * vai a um contêiner PRÓPRIO, `tabIndex={-1}`, que não é alcançável por Tab e
 * cujo keydown sobe até o documento onde o Dialog escuta.
 *
 * E o contêiner sozinho também não bastava: o visor nativo do Chrome toma o foco
 * ~200ms depois de abrir, sem clique nenhum — sonda de 100 em 100ms no gate:
 * `DIV` em 0 e 100ms, `IFRAME` de 200ms em diante. O roubo é de UMA vez: devolvido
 * o foco, o visor não o toma de novo (mesma sonda, 2s de `DIV`). Por isso a
 * devolução é única por abertura, no `blur` que aponta para o iframe — e não um
 * laço, que prenderia o usuário fora do visor. Tab a partir do contêiner entra no
 * visor normalmente: quem quer o PDF chega nele por teclado, de propósito, e é
 * daí em diante que Escape passa a ser do navegador. */
export function AppFilePreviewDialog({ file, visible, onHide }: AppFilePreviewDialogProps) {
  const { t } = useTranslation()
  const contentRef = useRef<HTMLDivElement>(null)
  // Uma devolução por abertura. Sem a trava, um usuário que ENTRA no visor de
  // propósito (Tab, ou clique) seria expulso de volta a cada vez.
  const devolveu = useRef(false)
  if (!file) return null

  // O `relatedTarget` do blur NÃO serve de sinal aqui: a URL do documento é
  // pré-assinada e vem de outra origem (o MinIO/S3, `:9000`), e para iframe de
  // origem cruzada o Chrome entrega `relatedTarget` nulo. Quem responde é o
  // `activeElement`, lido no tick seguinte, quando o foco já pousou.
  const devolverFoco = () => {
    const container = contentRef.current
    if (devolveu.current || !container) return
    setTimeout(() => {
      const ativo = document.activeElement
      if (devolveu.current || !(ativo instanceof HTMLIFrameElement) || !container.contains(ativo)) {
        return
      }
      devolveu.current = true
      container.focus()
    }, 0)
  }

  const kind = isPreviewable(file.mime, file.original_name)

  return (
    <AppDialog
      visible={visible}
      onHide={onHide}
      header={file.original_name}
      style={{ width: '70vw' }}
      // Desligado de propósito: o `focusOnShow` do Prime foca o primeiro
      // FOCÁVEL, que no caminho do PDF é o `<iframe>` — ver o docblock. O foco
      // é posto no contêiner, no `onShow`, que é quando o diálogo já está no
      // DOM.
      focusOnShow={false}
      onShow={() => {
        devolveu.current = false
        contentRef.current?.focus()
      }}
    >
      {/* `tabIndex={-1}`: focável por código, invisível ao Tab — a ordem de
          tabulação da tela não ganha uma parada nova. `outline-none` porque o
          foco aqui é mecanismo de teclado, não indicação de lugar: quem o
          recebe não é um controle, e o anel desenharia uma borda ao redor do
          documento inteiro. */}
      <div ref={contentRef} tabIndex={-1} className="outline-none" onBlur={devolverFoco}>
        {kind === 'image' && (
          <img
            src={file.download_url}
            alt={file.original_name}
            className="mx-auto max-h-[70vh] max-w-full object-contain"
          />
        )}

        {kind === 'pdf' && (
          <iframe
            src={file.download_url}
            title={file.original_name}
            className="h-[70vh] w-full"
            style={{ border: 'none' }}
          />
        )}

        {kind === null && (
          <div className="flex flex-col gap-4 p-2">
            <AppFileRow name={file.original_name} mime={file.mime} size={file.size} />
            <p className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>
              {t('common.previewUnavailable')}
            </p>
            <a href={file.download_url} target="_blank" rel="noreferrer" className="self-start">
              <AppButton icon="pi pi-download" label={t('common.download')} />
            </a>
          </div>
        )}
      </div>
    </AppDialog>
  )
}
