import { AppFileRow, AppFileActions, AppFilePreviewDialog, AppTag } from '@shared/ui'
import { useFilePreview } from '@shared/hooks'
import type { FileData } from '@shared/types/generated'

/** Lista dos "outros documentos" do orçamento: arquivos de tipo fora do enum
 * (dado antigo ou de outro fluxo), que não cabem em nenhum slot. Cada linha traz
 * o valor cru do tipo numa tag neutra e as ações de arquivo. O cartão só a monta
 * quando há arquivo, então não há estado vazio. */
export function FileList({
  files, onRemove,
}: {
  files: FileData[]
  onRemove?: (fileId: number) => void
}) {
  const preview = useFilePreview<FileData>()

  return (
    <>
      <ul role="list">
        {files.map((f) => (
          <li
            key={f.id}
            className="border-t px-4 py-3 first:border-t-0"
            style={{ borderColor: 'var(--surface-border)' }}
          >
            <AppFileRow
              name={f.original_name}
              mime={f.mime}
              size={f.size}
              createdAt={f.created_at}
              actions={
                <>
                  <AppTag value={f.type} severity="secondary" />
                  <AppFileActions
                    file={f}
                    onPreview={preview.open}
                    onRemove={onRemove ? () => onRemove(f.id) : undefined}
                  />
                </>
              }
            />
          </li>
        ))}
      </ul>

      <AppFilePreviewDialog file={preview.file} visible={preview.visible} onHide={preview.close} />
    </>
  )
}
