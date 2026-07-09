import { Tag } from 'primereact/tag'
import type { TagProps } from 'primereact/tag'

export type { TagProps as AppTagProps } from 'primereact/tag'

export function AppTag(props: TagProps) {
  return <Tag {...props} />
}
