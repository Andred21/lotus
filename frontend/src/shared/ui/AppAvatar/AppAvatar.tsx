import { Avatar } from 'primereact/avatar'
import type { AvatarProps } from 'primereact/avatar'
import { initialsFromName } from '@shared/lib'

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
