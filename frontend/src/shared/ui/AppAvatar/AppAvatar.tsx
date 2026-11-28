import { useState } from 'react'
import { Avatar } from 'primereact/avatar'
import type { AvatarProps } from 'primereact/avatar'
import { initialsFromName } from '@shared/lib'

export interface AppAvatarProps extends Omit<AvatarProps, 'label' | 'image'> {
  name: string
  image?: string | null
}

/**
 * Avatar com fallback duplo: sem imagem OU com imagem que não carrega, mostra
 * as duas iniciais do nome.
 *
 * O segundo caso não é hipotético: a URL da foto é pré-assinada e expira
 * (spec D6), então uma listagem aberta o bastante passa a receber 403 do
 * bucket. Sem este fallback o Prime renderiza um círculo vazio, que é pior que
 * as iniciais — parece defeito, não "sem foto".
 *
 * `key={image}` no <Avatar> reinicia o estado de falha quando a URL muda: sem
 * isso, trocar a foto depois de um erro manteria as iniciais para sempre.
 */
export function AppAvatar({ name, image, style, ...props }: AppAvatarProps) {
  const [failed, setFailed] = useState<string | null>(null)

  if (image && failed !== image) {
    return (
      <Avatar
        key={image}
        image={image}
        shape="circle"
        imageAlt={name}
        style={style}
        {...props}
        onImageError={() => setFailed(image)}
      />
    )
  }

  return (
    <Avatar
      label={initialsFromName(name)}
      shape="circle"
      // `style` do chamador entra DEPOIS e por spread: quem precisa de um
      // diâmetro próprio (o `AppPhotoField`) sobrescreve só o que passar, sem
      // apagar a tinta neutra das iniciais. O celeste é raro (B-2): sobre o
      // shell, quem quer a marca (o `UserMenu`) a declara por aqui.
      style={{ backgroundColor: 'var(--surface-200)', color: 'var(--text-color)', fontWeight: 600, ...style }}
      {...props}
    />
  )
}
