import { FileUpload } from 'primereact/fileupload'
import type { FileUploadProps } from 'primereact/fileupload'

export type { FileUploadHandlerEvent } from 'primereact/fileupload'
export type { FileUploadProps as AppFileUploadProps } from 'primereact/fileupload'

/** Wrapper do FileUpload do PrimeReact. Default: modo básico, upload
 * automático via customUpload (o chamador trata em `uploadHandler`, subindo
 * pela API própria em vez do endpoint embutido do Prime). `customUpload` é
 * invariante do wrapper — fixado APÓS o spread para o chamador nunca poder
 * reativar o uploader XHR embutido do PrimeReact. */
export function AppFileUpload(props: FileUploadProps) {
  return <FileUpload mode="basic" auto {...props} customUpload />
}
