import { useRef } from 'react'
import type { KeyboardEvent, RefObject } from 'react'
import { FileUpload } from 'primereact/fileupload'
import { Tooltip } from 'primereact/tooltip'
import type { FileUploadProps, FileUploadHandlerEvent } from 'primereact/fileupload'
import { useTranslation } from 'react-i18next'
import { MAX_UPLOAD_BYTES, formatFileSize } from '@shared/lib/upload'
import { DICA_ESQUERDA } from '../dicaEsquerda'
import { mergePt } from '../mergePt'

/** Disparador só-ícone: enviar e substituir são o mesmo ícone. O default mora
 * aqui para que AppFileSlot, AppPhotoField e o cartão da turma não repitam. */
const UPLOAD_ICON_OPTIONS = {
  icon: 'pi pi-upload',
  className: 'p-button-text p-button-rounded',
}

export type { FileUploadHandlerEvent } from 'primereact/fileupload'
export type { FileUploadProps as AppFileUploadProps } from 'primereact/fileupload'

export type AppFileUploadOwnProps = FileUploadProps & {
  /** Recebe a mensagem já traduzida quando o arquivo excede o teto. O chamador
   * decide onde exibi-la (banner do diálogo, erro da seção). */
  onSizeReject?: (message: string) => void
  /** Teto em bytes. Default: o dos documentos (10 MB). A foto de perfil passa
   * `MAX_PHOTO_BYTES` (5 MB) — spec D9. */
  maxBytes?: number
  /** Nome acessível do disparador, já traduzido. Existe porque o RÓTULO visível
   * não basta quando a tela repete o mesmo verbo: quatro slots documentais dizem
   * "Reemplazar" e só o chamador sabe de qual documento se trata (D-23). Ausente,
   * o nome continua vindo do rótulo visível. */
  accessibleName?: string
}

/** Wrapper do FileUpload do PrimeReact. Default: modo básico, upload
 * automático via customUpload (o chamador trata em `uploadHandler`, subindo
 * pela API própria em vez do endpoint embutido do Prime). `customUpload` é
 * invariante do wrapper — fixado APÓS o spread para o chamador nunca poder
 * reativar o uploader XHR embutido do PrimeReact.
 *
 * O teto de tamanho é checado AQUI, não via `maxFileSize` do Prime: em
 * `mode="basic"` a área de mensagens dele não é renderizada, então a rejeição
 * dele seria silenciosa (spec D4). Arquivo acima do teto não vira requisição.
 *
 * **`role="button"` também é invariante, e pela mesma régua do `customUpload`.**
 * O modo básico do Prime entrega `<span class="p-button p-fileupload-choose"
 * tabindex="0">` com `role` nulo: um alvo focável que não se anuncia como nada
 * (D-23 do review de 2026-08-17) — e é o controle que substitui documento de
 * peso legal de forma irreversível. O papel é do wrapper porque vale para todo
 * chamador; o NOME não pode ser, porque só o chamador sabe qual documento
 * está em jogo. O `pt` funde por `mergePt`, chave a chave: quem passa
 * `pt.basicButton.className` não perde o papel, e o papel não apaga a classe.
 * O papel não vem sozinho: tecla e estado desabilitado entram com ele, medidos
 * logo abaixo. */
export function AppFileUpload({
  uploadHandler,
  onSizeReject,
  maxBytes = MAX_UPLOAD_BYTES,
  accessibleName,
  pt,
  ...props
}: AppFileUploadOwnProps) {
  const { t } = useTranslation()
  const involucro = useRef<HTMLSpanElement>(null)

  const guarded = (e: FileUploadHandlerEvent) => {
    const file = e.files[0]
    if (file && file.size > maxBytes) {
      e.options.clear()
      onSizeReject?.(
        t('common.fileTooLarge', {
          size: formatFileSize(file.size),
          limit: formatFileSize(maxBytes),
        }),
      )
      return
    }
    uploadHandler?.(e)
  }

  // Nome acessível: o do chamador vence sempre. Sem ele, quem nomeia é o rótulo
  // VISÍVEL — e quando esse rótulo é vazio, que é como o disparador só-ícone é
  // pedido, o Prime cai no próprio default INGLÊS e o botão anuncia "Choose"
  // numa interface em espanhol. Medido no gate do BD-16: quatro ocorrências só
  // no diálogo do redator. O piso traduzido mora aqui pela mesma régua do olho do
  // `AppPassword` (UI-08) — o wrapper é a única porta, e nome acessível não é
  // opcional. `common.upload` é o rótulo que os outros sítios já mostram.
  const nome = accessibleName ?? (props.chooseLabel ? undefined : t('common.upload'))

  // O papel promete o contrato INTEIRO de botão, e o Prime entrega metade.
  //
  // **Tecla:** o `_onKeyDown` dele trata só `Enter`/`NumpadEnter`
  // (`fileupload.cjs.js:615-619`), então Espaço — a outra tecla que ativa
  // qualquer botão — não fazia nada num nó que se anuncia como botão. Somar em
  // vez de substituir é o que o `mergeProps` do Prime garante: função de mesmo
  // nome ele COMPÕE, chamando a existente e depois a do `pt`
  // (`utils.cjs.js:2694-2700`) — o Enter dele continua inteiro. Aciona o próprio
  // nó (`click()`) em vez de abrir o seletor à mão: é exatamente o caminho do
  // mouse, com o mesmo ramo de arquivo já escolhido (`onSimpleUploaderClick`,
  // `:660-662`).
  //
  // **Estado:** `basicButtonProps` mantém `tabIndex: 0` com `disabled` e só
  // acrescenta a classe `p-disabled` (`:1010-1024`). Sem `aria-disabled` o
  // disparador recebe foco, anuncia botão HABILITADO e é inerte — o `<input>`
  // que ele aciona nasce `disabled` (`:1003`). Quem envia passa
  // `disabled={uploading}`, e é durante o upload que o usuário mais tenta de
  // novo. Continua focável de propósito: alvo que some do Tab enquanto desabilita
  // é alvo que o leitor de tela não acha para descobrir POR QUE não responde.
  const espacoAtiva = (event: KeyboardEvent<HTMLElement>) => {
    if (event.code !== 'Space') return
    event.preventDefault() // botão não rola a página
    if (!props.disabled) event.currentTarget.click()
  }

  const uploadPt = mergePt<FileUploadProps['pt']>(pt, {
    basicButton: {
      role: 'button',
      ...(nome ? { 'aria-label': nome } : null),
      ...(props.disabled ? { 'aria-disabled': true } : null),
      onKeyDown: espacoAtiva,
    },
  })

  // Rótulo vazio pede disparador só-ícone, e `iconOnly` é como o Prime o
  // entrega: ele troca o rótulo por `&nbsp;` (`fileupload.cjs.js:979`). Sem
  // isso, a cadeia `chooseLabel || chooseOptions.label || localeOption('choose')`
  // (`:401`) escorrega para o default e o botão RENDERIZA "Choose" — visível,
  // 59x20px a 16px, quatro vezes no diálogo do redator, numa interface em
  // espanhol. O `aria-label` acima sozinho calaria o leitor de tela e deixaria
  // a palavra na tela.
  // Só entra quando falta rótulo: passar `chooseOptions={undefined}` de volta
  // ATROPELA o default do Prime — a prop explícita vence, e o `createBasic`
  // estoura em `chooseOptions.iconOnly`.
  // O que o chamador passou em `chooseOptions` vence o default campo a campo; um
  // `null` (o default do próprio Prime) não conta como passado.
  const soIcone = props.chooseLabel
    ? null
    : {
        chooseOptions: {
          ...props.chooseOptions,
          icon: props.chooseOptions?.icon ?? UPLOAD_ICON_OPTIONS.icon,
          className: props.chooseOptions?.className ?? UPLOAD_ICON_OPTIONS.className,
          iconOnly: true,
        },
      }

  const upload = (
    <FileUpload
      mode="basic"
      auto
      {...props}
      {...soIcone}
      pt={uploadPt}
      uploadHandler={guarded}
      customUpload
    />
  )

  // Só-ícone não diz o que faz: a dica é o nome acessível, o mesmo texto que o
  // leitor de tela anuncia (bloco 47). O `FileUpload` não tem prop de dica, então
  // ela se prende a um `span` invólucro — o mesmo arranjo do botão apagado do
  // `RowActions`. Com rótulo visível o texto já está na tela e não há invólucro:
  // as telas com rótulo mantêm a árvore e o layout que tinham.
  if (!soIcone) return upload

  return (
    <>
      <span ref={involucro} className="inline-flex">
        {upload}
      </span>
      {/* O `useRef` do React 19 tipa `RefObject<T | null>` e o d.ts do Prime ainda
        * pede `RefObject<HTMLElement>`: a forma em runtime é a mesma. */}
      <Tooltip target={involucro as RefObject<HTMLElement>} content={nome} {...DICA_ESQUERDA} />
    </>
  )
}
