import { Dropdown } from 'primereact/dropdown'
import type { DropdownProps } from 'primereact/dropdown'
import { useTranslation } from 'react-i18next'
import { useFieldProps } from '../FormField/fieldContext'

export type { DropdownProps as AppDropdownProps } from 'primereact/dropdown'

/** Wrapper do Dropdown. Largura total por default; cores vêm do tema (ADR-16).
 * `inputId`, não `id`: o `id` do Dropdown cai no nó raiz e só `inputId` alcança
 * o input focável (`dropdown.cjs.js:1577`) — pendurar `id` associaria a label a
 * uma `<div>`.
 *
 * `emptyMessage` entra ANTES do spread, ao contrário do nome acessível dos
 * outros wrappers: aqui é conteúdo, não acessibilidade, e a tela que sabe por
 * que a lista está vazia ("esta turma no tiene redactores designados") diz
 * melhor do que o piso genérico. O piso existe porque o default do Prime é
 * `localeOption('emptyMessage')` (`dropdown.cjs.js:497`), isto é
 * "No available options" — inglês numa interface em espanhol, medido no gate
 * do BD-16 com a lista vazia. Mesmo motivo do rótulo do `AppFileUpload` e do
 * botão de fechar do `AppDialog`: `locale('es')` nunca é chamado no projeto.
 *
 * `emptyFilterMessage` fica de fora de propósito — nenhum dos 14 sítios liga
 * `filter`, e piso para caminho que não existe é peso morto. Quem ligar o
 * filtro reabre o mesmo buraco e precisa passar a mensagem.
 *
 * **`key` no idioma ativo.** O Dropdown mantém um `<input>` oculto para leitor
 * de tela e escreve nele o rótulo da opção só quando o VALOR muda, não quando as
 * opções mudam. Com a tela repintada em português, o controle continuava
 * anunciando "Certificates" (UI-03 da revisão de 2026-08-22): o texto visível
 * dizia uma coisa e o nome acessível, outra. Remontar é o remédio barato aqui —
 * a troca de idioma é evento raro e o Dropdown não guarda estado que a tela
 * precise preservar (ordenação e página vivem na tabela, que por isso RECUSOU o
 * mesmo rekey no BD-17). */
export function AppDropdown(props: DropdownProps) {
  const { t, i18n } = useTranslation()
  const fieldProps = useFieldProps('inputId')
  return (
    <Dropdown key={i18n.language} className="w-full" emptyMessage={t('common.noOptions')} {...fieldProps} {...props} />
  )
}
