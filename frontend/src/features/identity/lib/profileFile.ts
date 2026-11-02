import type { PreviewableFile } from '@shared/ui'
import type { RedatorProfileDocumentData } from '@shared/types/generated'

/** O arquivo que o `AppFileSlot` consome, com a data de envio que a linha mostra. */
export type ProfileFile = PreviewableFile & { created_at?: string | null }

/**
 * O DTO do Perfil projeta o slot ausente com campos nulos; `PreviewableFile`
 * exige nome e URL não-nulos. Este helper é o que estreita, para o documento e a
 * assinatura não escreverem o mesmo literal: `null` é "ainda não há arquivo".
 */
export function profileFile(doc: RedatorProfileDocumentData): ProfileFile | null {
  if (!doc.original_name || !doc.download_url) return null
  return {
    original_name: doc.original_name,
    size: doc.size ?? undefined,
    download_url: doc.download_url,
    created_at: doc.created_at,
  }
}
