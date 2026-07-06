import { Avatar } from 'primereact/avatar'
import type { AvatarProps } from 'primereact/avatar'

/** Iniciais: 1ª letra do primeiro + 1ª do último nome (ou 2 letras se nome único). */
function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export interface AppAvatarProps extends Omit<AvatarProps, 'label' | 'image'> {
  name: string
  image?: string
}

export function AppAvatar({ name, image, ...props }: AppAvatarProps) {
  if (image) {
    return <Avatar image={image} shape="circle" {...props} />
  }
  return (
    <Avatar
      label={initialsFromName(name)}
      shape="circle"
      style={{ backgroundColor: '#25A5E4', color: '#fff' }}
      {...props}
    />
  )
}
