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
   * `imageAlt`/iniciais, outra pelo texto). Mesma decisão do UserMenu. */
  const avatar = <AppAvatar name={title} image={image} size={size} aria-hidden />

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
      <div className="flex flex-col gap-2">
        <span className="truncate font-semibold">{title}</span>
        {description && (
          <span className="truncate text-sm font-medium" style={{ color: 'var(--text-color-secondary)' }}>{description}</span>
        )}
      </div>
    </div>
  )
}
