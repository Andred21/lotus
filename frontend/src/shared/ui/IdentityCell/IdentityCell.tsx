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
 * `<span>` na forma inline porque seus dois consumidores a entregam dentro do
 * `subtitle` do DetailHeader, e a cor do título é cravada em `--text-color`:
 * o `subtitle` já pinta tudo de `--text-color-secondary`, então sem isso o
 * título sumiria na cor da descrição.
 */
export function IdentityCell({
  title, description, image, inline = false, size = 'large',
}: IdentityCellProps) {
  const avatar = <AppAvatar name={title} image={image} size={size} />

  if (inline)
    return (
      <span className="flex items-center gap-2">
        {avatar}
        <span className="font-medium" style={{ color: 'var(--text-color)' }}>{title}</span>
        {description && <span style={{ color: 'var(--text-color-secondary)' }}>{description}</span>}
      </span>
    )

  return (
    <div className="flex items-center gap-3">
      {avatar}
      <div className="min-w-0">
        <p className="truncate font-medium">{title}</p>
        {description && (
          <p className="truncate text-xs" style={{ color: 'var(--text-color-secondary)' }}>{description}</p>
        )}
      </div>
    </div>
  )
}
