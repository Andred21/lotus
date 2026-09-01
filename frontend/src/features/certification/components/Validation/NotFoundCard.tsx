import { useTranslation } from 'react-i18next'
import { AppCard, fieldLabelClass, technicalDataClass } from '@shared/ui'
import { StatusHeading } from './StatusHeading'

/** Corpo do cartão "não encontrado": o ECO do código é o que distingue
 * "digitei errado" de "certificado não existe" — quem escaneia o QR está com
 * o papel na mão para conferir contra ele (D-67). Sem link e sem dado nenhum
 * do certificado: não há certificado.
 *
 * `uuid` vem de param de ROTA, isto é, entrada de fora. React o renderiza
 * como texto (não há `dangerouslySetInnerHTML` aqui), então não existe vetor
 * de injeção — mas ele leva TETO de comprimento mesmo assim, para que um
 * param longo não deforme uma página pública. `technicalDataClass` (não
 * `identifierClass`): o segundo carrega `whitespace-nowrap`, que ANULA
 * `break-all` — CSS não quebra em `word-break` onde não há oportunidade de
 * quebra nenhuma sob `nowrap`. Medido: com `identifierClass` o texto
 * simplesmente vazava para fora da caixa e o `overflow-hidden` do `AppCard`
 * cortava em silêncio, sem quebrar — o teto de 64 char escondia o defeito
 * porque nenhum uuid real chega lá, mas um param de 300 char revelava.
 *
 * O corte LEVA reticência (Q-4 do review de 2026-09-01): o eco existe para
 * conferência caractere a caractere contra o papel, e código truncado sem
 * marca parece completo sem ser — numa página de peso legal isso é pior que
 * não ecoar. */
export function NotFoundCard({ uuid }: { uuid: string }) {
  const { t } = useTranslation()
  return (
    <AppCard>
      <StatusHeading icon="pi-question-circle" text={t('certificate.validation.notFound')} />
      <dl className="flex flex-col gap-0.5 px-6 pb-4">
        <dt className={fieldLabelClass} style={{ color: 'var(--text-color-secondary)' }}>
          {t('certificate.validation.searchedCode')}
        </dt>
        <dd className={`${technicalDataClass} text-sm break-all`} style={{ color: 'var(--text-color)' }}>
          {uuid.length > 64 ? `${uuid.slice(0, 64)}…` : uuid}
        </dd>
      </dl>
      <p className="px-6 pb-6 text-sm" style={{ color: 'var(--text-color-secondary)' }}>
        {t('certificate.validation.notFoundHint')}
      </p>
    </AppCard>
  )
}
