import type { ReactNode } from 'react'
import { AppAvatar, type AppAvatarProps } from '../AppAvatar'

export interface IdentityCellProps {
  title: string
  /** `ReactNode` e não `string`: o subtítulo do TurmaDetailPage carrega um
   * AppButton, e o RedatorCard quer o RUT em mono. Ausente ou `null` NÃO abre
   * a segunda linha — é a guarda de que o EnrollmentTable depende. */
  description?: ReactNode
  image?: string | null
  /** Avatar, título e descrição na MESMA linha (forma 2). Padrão: empilhado
   * (forma 1). */
  inline?: boolean
  size?: AppAvatarProps['size']
}

/**
 * Avatar + título + descrição, a célula que 14 sítios copiavam a olho em duas
 * grafias diferentes. Apresentacional puro: recebe texto pronto, não conhece
 * DTO, não busca dado e não decide o que fazer com ausência — quem chama
 * decide (spec D1/D11).
 *
 * A forma empilhada trunca; a forma inline NÃO. A inline é a que carrega nó
 * arbitrário (botão, tag), e `truncate` cortaria o nó em vez do texto.
 *
 * A cor do título é cravada em `--text-color` na forma inline: seus dois
 * consumidores a entregam dentro do `subtitle` do DetailHeader, que já pinta
 * tudo de `--text-color-secondary` — sem isso o título sumiria na cor da
 * descrição.
 */
export function IdentityCell({
  title, description, image, inline = false, size = 'large',
}: IdentityCellProps) {
  /* `aria-hidden` porque o avatar é ILUSTRAÇÃO do título que vem ao lado: sem
   * isto o leitor de tela anuncia o nome duas vezes por linha (uma pelo
   * `imageAlt`/iniciais, outra pelo texto). Mesma decisão do UserMenu.
   *
   * `shrink-0` porque item de flex encolhe por padrão, e o avatar é o único
   * elemento aqui com proporção a preservar: quando o texto ao lado transborda
   * a célula, o `flex-shrink: 1` implícito reparte o encolhimento entre os dois
   * itens, e o círculo vira ELIPSE — a altura é do `p-avatar`, a largura cede.
   * Medido na `TurmasTable` em 2026-08-24: ovalizavam exatamente as linhas cujo
   * nome truncava ("Subestación Norte"), e as de nome curto (CGE, Transelec)
   * ficavam redondas. O `min-w-0` do bloco de texto é o que faz o texto ceder
   * primeiro; sem esta trava, ele não cede sozinho. */
  const avatar = <AppAvatar name={title} image={image} size={size} className="shrink-0" aria-hidden />

  if (inline)
    return (
      /* `<div>`, não `<span>`: o avatar do Prime é um `<div>`, e elemento de
       * fluxo dentro de fraseado é o HTML inválido que a D7 caçou no `<p>` do
       * DetailHeader. O `flex` já cravava `display`, então a troca não move
       * pixel — o `subtitle` que recebe isto também é `<div>`. */
      <div className="flex items-center gap-2">
        {avatar}
        <span className="font-semibold" style={{ color: 'var(--text-color)' }}>{title}</span>
        {description && <span style={{ color: 'var(--text-color-secondary)' }}>{description}</span>}
      </div>
    )

  return (
    <div className="flex items-center gap-3">
      {avatar}
      {/* `min-w-0` é o que faz o `truncate` das duas linhas abaixo EXISTIR.
        * Item de flex nasce com `min-width: auto`, então este bloco não
        * encolhia abaixo do próprio conteúdo: o texto empurrava a célula e o
        * corte nunca acontecia. Foi por isso que, na tabela de turmas, CLIENTE
        * media 249px e REDATOR 263px — 512px, 45% dos 1147px da tabela — com a
        * largura declarada na coluna sem efeito nenhum (UI-02 da revisão de
        * 2026-08-22). Mesmo molde do `AppFileRow`, que já dependia disto.
        *
        * Nada muda onde a coluna NÃO limita a largura: sem teto, o bloco
        * continua ocupando o que o texto pede. */}
      <div className="flex min-w-0 flex-col gap-2">
        {/* Texto truncado sem recuperação é defeito (UI-03 da run 1 desta
          * revisão, e UI-01 do `AppFileRow`): o `title` devolve o valor
          * integral. Só na forma empilhada, que é a única que trunca.
          *
          * A descrição é `ReactNode` e só vira `title` quando é string — o
          * `RedatorCard` passa `<span className="font-mono">{rut}</span>`, e
          * `[object Object]` no tooltip seria pior que tooltip nenhum. */}
        <span className="truncate font-semibold" title={title}>{title}</span>
        {description && (
          <span
            className="truncate text-sm font-medium"
            title={typeof description === 'string' ? description : undefined}
            style={{ color: 'var(--text-color-secondary)' }}
          >
            {description}
          </span>
        )}
      </div>
    </div>
  )
}
