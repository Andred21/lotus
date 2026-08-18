import { useTranslation } from 'react-i18next'
import { AppFileActions, AppFileRow, AppFileUpload } from '@shared/ui'
import type { FileUploadHandlerEvent, PreviewableFile } from '@shared/ui'
import type {
  RedatorDocumentType,
  RedatorProfileDocumentData,
} from '@shared/types/generated'
import { ProfileDocumentSlotHeader } from './ProfileDocumentSlotHeader'

const UPLOAD_CHOOSE_OPTIONS = { icon: 'pi pi-upload', className: 'p-button-text p-button-sm' }

export type ProfileDocumentSlotProps = {
  doc: RedatorProfileDocumentData
  uploading: boolean
  onUpload: (type: RedatorDocumentType, e: FileUploadHandlerEvent) => void
  onSizeReject: (message: string) => void
  onPreview: (file: PreviewableFile) => void
}

/**
 * Um tipo documental em Mi perfil.
 *
 * Irmão do `RedatorDocumentSlot`, não reuso dele (spec D3): o slot admin deriva
 * o status no front porque `RedatorDocumentData` não tem `status`; este consome
 * `RedatorProfileDocumentData.status` PRONTO do backend, sem recalcular validade
 * — duas fontes de verdade que, no mesmo componente, fariam a tela mentir.
 */
export function ProfileDocumentSlot({
  doc,
  uploading,
  onUpload,
  onSizeReject,
  onPreview,
}: ProfileDocumentSlotProps) {
  const { t } = useTranslation()

  // `PreviewableFile` exige nome e URL não-nulos; o DTO os traz nullable porque
  // o slot ausente é projetado igual. Montar o literal aqui é o que estreita.
  const file: PreviewableFile | null =
    doc.original_name && doc.download_url
      ? {
          original_name: doc.original_name,
          size: doc.size ?? undefined,
          download_url: doc.download_url,
        }
      : null

  // O RÓTULO muda com o estado, e não é cosmética: substituir apaga o documento
  // anterior de forma irreversível, e o texto é o único aviso disso na tela
  // (spec §6, mesmo contrato do `AppPhotoField`). O slot administrativo usa
  // ícone mudo; aqui quem age é o dono do documento. O NOME acessível vai além
  // do rótulo visível porque três slots repetem o mesmo verbo e o leitor de tela
  // ouviria "Reemplazar" três vezes sem saber de quê (D-23).
  //
  // Ele vem ANTES do par Ver/Descargar (D-22): justificado à direita, o grupo
  // deslizava quando faltava o upload — `Ver` em x=1132 nos slots com três ações
  // e x=1275 no que tem duas, 143px entre linhas separadas por 16px. Reservar
  // largura falharia com o idioma, porque o rótulo do upload é texto traduzido;
  // com ele à frente, o par de ícones — largura constante em qualquer locale —
  // vira o fim do grupo e ancora na mesma borda nos quatro slots. De quebra, o
  // botão que carrega o aviso de irreversibilidade fica adjacente ao nome do
  // arquivo sobre o qual age.
  const tipo = t(`documentType.${doc.type}`)
  const upload = doc.self_service ? (
    <AppFileUpload
      chooseOptions={UPLOAD_CHOOSE_OPTIONS}
      chooseLabel={t(file ? 'profile.documents.replace' : 'profile.documents.send')}
      accessibleName={t(file ? 'profile.documents.replaceNamed' : 'profile.documents.sendNamed', { tipo })}
      disabled={uploading}
      onSizeReject={onSizeReject}
      uploadHandler={(e) => onUpload(doc.type, e)}
    />
  ) : null

  return (
    <div className="rounded border p-2" style={{ borderColor: 'var(--surface-border)' }}>
      <ProfileDocumentSlotHeader tipo={tipo} status={doc.status} validUntil={doc.valid_until} />

      <div className="mt-2">
        {file ? (
          <AppFileRow
            name={file.original_name}
            size={file.size}
            createdAt={doc.created_at}
            actions={
              <>
                {upload}
                {/* O par Ver/Descargar num NÓ só: em 390px o grupo de ações
                    QUEBRA (ver `AppFileRow`), e solto ele quebrava ENTRE os dois
                    ícones — `Ver` subia com o `Reemplazar` e parava em x=302,
                    contra x=248 no slot vizinho, que é a D-22 desfeita numa
                    faixa. Com o nó, quem desce é o par inteiro, e o fim do grupo
                    fica em x=348 nos três slots com arquivo. */}
                <div className="flex items-center gap-1">
                  <AppFileActions file={file} onPreview={onPreview} />
                </div>
              </>
            }
          />
        ) : (
          /* `justify-end` + `mr-auto`, e não `justify-between`: o mesmo idiom
             que o `AppFileRow` já usa na linha com arquivo, pela mesma razão.
             Em 390px o slot tem 226px de conteúdo e o par não cabe ("No
             cargado" 66 + 8 de vão + 175 do botão = 249), então a linha QUEBRA
             — e `justify-between` com um item só na segunda linha degenera em
             `flex-start`: o botão ancorava em x=122 e terminava em 297, contra
             os 348 dos três slots com arquivo, o único fora do eixo sendo
             justamente o que pede ação (UI-06 do review de 2026-08-18). Com a
             âncora à direita ele volta para 348; enquanto os dois cabem numa
             linha, o `mr-auto` do texto reproduz o `justify-between` de antes e
             nada se mexe. */
          <div className="flex flex-wrap items-center justify-end gap-2">
            <p className="mr-auto text-xs" style={{ color: 'var(--text-color-secondary)' }}>
              {t('common.notLoaded')}
            </p>
            {upload}
          </div>
        )}

        {!doc.self_service && (
          <p className="mt-1 text-xs" style={{ color: 'var(--text-color-secondary)' }}>
            {t('profile.documents.managedByAdmin')}
          </p>
        )}
      </div>
    </div>
  )
}
