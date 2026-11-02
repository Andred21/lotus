import { useTranslation } from 'react-i18next'
import { AppButton } from '../AppButton'

/** A dica abre à ESQUERDA, como no `RowActions`: a linha de arquivo mora na borda
 * direita do cartão, e à direita ela passa da moldura. */
const DICA = { position: 'left' } as const

export type AppDownloadButtonProps = {
  /** URL pré-assinada do arquivo (`FileData.download_url`). */
  href: string
  /** Rótulo visível. Ausente = disparador só-ícone, nomeado pelo `aria-label`. */
  label?: string
  className?: string
  /** Dica no hover, já traduzida. Default: o próprio rótulo acessível do
   * disparador só-ícone (`common.download`); com rótulo visível não há dica,
   * porque ela repetiria o texto que já está na tela. A dica abre à esquerda,
   * como a do `RowActions` (bloco 46). */
  tooltip?: string
}

/**
 * Baixar arquivo, num controle SÓ.
 *
 * Nasce de `<a><AppButton/></a>`, repetido em dois sítios de `shared/ui`: o par
 * aninhava dois interativos e rendia DUAS paradas de Tab por ação — a primeira
 * o `<a>`, que anunciava só "link", sem nome. Na seção de documentos do
 * `/perfil` eram 6 paradas para 3 ações, metade delas mudas (UI-05 do review de
 * 2026-08-18). `<a>` não pode conter conteúdo interativo, então não havia
 * arranjo de `tabIndex` que consertasse a árvore — só tirar um dos dois.
 *
 * Quem sai é o `<a>`, e a razão é o contrato do dado: `download_url` é URL
 * PRÉ-ASSINADA e expira (`TurmaDocumentData`, `FileData`), então o que um link
 * de verdade daria a mais — copiar endereço, abrir em nova aba pelo menu — vale
 * pouco e envelhece rápido. O que sobra é ação, e ação é botão. A nova aba
 * continua sendo aberta, pelo mesmo gesto do usuário que o `target="_blank"`
 * usava.
 *
 * Não reimplementa o botão do Prime num `<a>` com as classes dele: seria
 * duplicar o miolo do tema em `shared/ui` para ganhar a semântica de link que o
 * parágrafo acima acabou de dispensar.
 */
export function AppDownloadButton({ href, label, className, tooltip }: AppDownloadButtonProps) {
  const { t } = useTranslation()
  const nome = t('common.download')

  return (
    <AppButton
      icon="pi pi-download"
      label={label}
      text={!label}
      rounded={!label}
      className={className}
      aria-label={label ? undefined : nome}
      tooltip={tooltip ?? (label ? undefined : nome)}
      tooltipOptions={DICA}
      onClick={() => window.open(href, '_blank', 'noopener,noreferrer')}
    />
  )
}
