import { FileUpload } from 'primereact/fileupload'
import type { FileUploadProps } from 'primereact/fileupload'

/** Wrapper do FileUpload do PrimeReact. Default: modo básico, upload
 * automático via customUpload (o chamador trata em `uploadHandler`, subindo
 * pela API própria em vez do endpoint embutido do Prime). */
export function AppFileUpload(props: FileUploadProps) {
  return <FileUpload mode="basic" auto customUpload {...props} />
}
