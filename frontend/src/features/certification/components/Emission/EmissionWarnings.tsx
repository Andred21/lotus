import { useTranslation } from 'react-i18next'
import { AppCard } from '@shared/ui'
import type { EmissionPanelTurmaData } from '@shared/types/generated'

/** Avisos de assinatura faltante da emissão (D6 do bloco 40). São AVISOS, não
 * bloqueios: o certificado sai com o espaço em branco sobre o traço, para
 * assinar à mão, e nenhum botão de emissão se desabilita por causa deles. */

/** A assinatura da gerente é da configuração, não da turma: o aviso vale para o
 * painel inteiro e por isso mora acima do seletor de turma. */
export function EmissionWarnings({ managerSignatureMissing }: { managerSignatureMissing: boolean }) {
  const { t } = useTranslation()

  if (!managerSignatureMissing) return null

  return (
    <AppCard tone="warning" className="px-4 py-3 text-sm">
      <p role="status">{t('certificate.warnings.managerSignatureMissing')}</p>
    </AppCard>
  )
}

/** O relator escolhido sem `FIRMA` vigente (`has_firma`, pela regra da D19 que o
 * servidor já aplicou). O contêiner `role="status"` fica sempre montado: o aviso
 * entra quando a escolha muda, e leitor de tela só anuncia região viva que já
 * existia. */
export function RedatorFirmaWarning({
  turma,
  redatorId,
}: {
  turma: EmissionPanelTurmaData
  redatorId: number | null
}) {
  const { t } = useTranslation()
  const redator = turma.redatores.find((r) => r.redator_id === redatorId)

  return (
    <div role="status">
      {redator && !redator.has_firma && (
        <AppCard tone="warning" className="px-3 py-2 text-sm">
          <p>{t('certificate.warnings.redatorWithoutFirma', { name: redator.name })}</p>
        </AppCard>
      )}
    </div>
  )
}
