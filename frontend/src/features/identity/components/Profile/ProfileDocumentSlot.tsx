import { useTranslation } from 'react-i18next'
import { AppFileActions, AppFileRow, AppFileUpload, AppTag } from '@shared/ui'
import type { FileUploadHandlerEvent, PreviewableFile } from '@shared/ui'
import { formatDate } from '@shared/lib'
import type {
  DocumentValidityStatus,
  RedatorDocumentType,
  RedatorProfileDocumentData,
} from '@shared/types/generated'

/**
 * `ausente` é NEUTRO, não `danger` (spec D10): o perfil não recebe idoneidade no
 * DTO e não a calcula, então pintar ausência de vermelho seria emitir veredito
 * de compliance que este contrato não fornece — ela aparece como ação pendente,
 * pelo botão de envio.
 */
const SEVERIDADE: Record<DocumentValidityStatus, 'success' | 'warning' | 'danger' | 'secondary'> = {
  vigente: 'success',
  vence_em_breve: 'warning',
  vencido: 'danger',
  ausente: 'secondary',
}

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
      chooseLabel={file ? t('profile.documents.replace') : t('profile.documents.send')}
      accessibleName={
        file
          ? t('profile.documents.replaceNamed', { tipo })
          : t('profile.documents.sendNamed', { tipo })
      }
      disabled={uploading}
      onSizeReject={onSizeReject}
      uploadHandler={(e) => onUpload(doc.type, e)}
    />
  ) : null

  return (
    <div className="rounded border p-2" style={{ borderColor: 'var(--surface-border)' }}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">{tipo}</p>
        {/* Status e validade na MESMA linha, validade em tinta de CORPO (D-21):
            é o dado de peso legal — por ela o redator sabe quando renovar — e
            saía `text-xs` secundária na última linha do slot, abaixo da nota
            administrativa, enquanto o status que o backend deriva A PARTIR dela
            era a pílula do topo. O ruído era real: três dos quatro slots têm
            `valid_until` nulo e imprimiam "Sin fecha de vencimiento" — linha que
            só diz que não há informação. Ela deixou de ser renderizada. */}
        <div className="flex flex-wrap items-center gap-2">
          <AppTag value={t(`profile.docStatus.${doc.status}`)} severity={SEVERIDADE[doc.status]} />
          {doc.valid_until && (
            <span className="font-mono text-sm" style={{ color: 'var(--text-color)' }}>
              {t('profile.documents.validUntil', {
                // `valid_until` vem só-data (`YYYY-MM-DD`) e `new Date` a lê
                // como meia-noite UTC: num fuso a oeste ela VOLTA um dia.
                // `T00:00:00` ancora no fuso local; o `formatDate` resolve o
                // idioma ativo — sem ele o `Intl` cai no do navegador (UI-01).
                date: formatDate(new Date(`${doc.valid_until}T00:00:00`)),
              })}
            </span>
          )}
        </div>
      </div>

      <div className="mt-2">
        {file ? (
          <AppFileRow
            name={file.original_name}
            size={file.size}
            createdAt={doc.created_at}
            actions={
              <>
                {upload}
                <AppFileActions file={file} onPreview={onPreview} />
              </>
            }
          />
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs" style={{ color: 'var(--text-color-secondary)' }}>
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
