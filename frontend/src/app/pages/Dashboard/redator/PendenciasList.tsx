import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AppCard, AppCardHeader, AppEmptyState, technicalDataClass } from '@shared/ui'
import { formatIsoDate, turmaDocumentTypeList } from '@shared/lib'
import { turmaTabPath } from '@features/operation/lib/turmaTabs'
import { infoText, warningText } from '@shared/styles/tokens'
import type { RedatorTurmaPendenciaData } from '@shared/types/generated'

/**
 * Turmas do próprio Redator com documento faltando. Sem cliente, sem UF, sem
 * turma alheia — o payload `view=redator` já chega filtrado da API, e esta tela
 * não tem como pedir mais do que ele traz.
 *
 * A pendência se resolve em `/operacion/turmas/:id`, aba "Documentación" — não
 * em `/perfil`, que gerencia documento PESSOAL (CV, REUF, título), conjunto
 * disjunto do documento de TURMA que falta aqui. Por isso a linha inteira é o
 * link, e não há botão único no cabeçalho: com N turmas pendentes um controle
 * do cabeçalho não tem destino único (para qual turma ele levaria?), e um
 * controle por linha mantém uma parada de Tab por item — a mesma razão do
 * UI-08 da revisão de 2026-08-17, que evitava `<Link>` embrulhando `<AppButton>`
 * (aninhamento inválido de `<a>` sobre `<button>`). Aqui a linha É o `<a>`;
 * não há botão de dentro para aninhar (UI-01 da revisão de 2026-08-22).
 */
export function PendenciasList({ items }: { items: RedatorTurmaPendenciaData[] }) {
  const { t } = useTranslation()
  // Contagem só dos bloqueantes: a turma que só tem aviso das evaluaciones opcionais
  // (ruling R13 do bloco 60: concluída, `missing_types=[]`) aparece na lista, mas não é pendência.
  const pendentes = items.filter((item) => item.missing_types.length > 0).length

  return (
    <AppCard>
      <AppCardHeader title={t('dashboard.redator.pendencias.title')} count={pendentes} level={3} />
      {items.length === 0 ? (
        <AppEmptyState
          icon="checkCircle"
          title={t('dashboard.redator.pendencias.empty')}
          description={t('dashboard.redator.pendencias.emptyHint')}
        />
      ) : (
        <ul role="list">
          {items.map((item) => (
            <li
              key={item.turma_id}
              className="border-b px-4 py-2 last:border-b-0"
              style={{ borderColor: 'var(--surface-border)' }}
            >
              {/* O destino é a aba, não só a turma: `turmaTabPath` escreve
                `?tab=docs` e a página abre no painel de documentação. Sem ele o
                link caía na primeira aba (Configuración) e o redator ainda
                tinha de achar a quarta — que em 390x844 nasce fora da tela
                (Q-1 do review de 2026-08-24). */}
              <Link
                to={turmaTabPath(item.turma_id, 'docs')}
                className="flex flex-wrap items-center gap-x-3 gap-y-0.5 no-underline sm:flex-nowrap"
                style={{ color: 'var(--text-color)' }}
              >
                <span className="min-w-0 basis-full sm:flex-1 sm:basis-0">
                  <span className="block truncate text-sm font-medium" title={item.course_name}>
                    {item.course_name}
                  </span>
                  {/* Esta linha QUEBRA, e o nome do curso acima trunca: são dados de
                    natureza diferente. O nome do curso é uma frase única, longa e
                    recuperável por `title`; a lista de documentos que faltam é o dado
                    ACIONÁVEL do card — cortada, o redator não sabe o que subir. Em
                    390x844 ela vazava 111px além da caixa (355 contra 244 em es-CL,
                    já com os rótulos traduzidos de UI-02) e não havia `title` nem
                    scroll que recuperasse (UI-03 da revisão de 2026-08-22). `title`
                    não serviria de saída aqui: hover não existe em toque, que é
                    justamente o viewport do defeito. */}
                  {item.missing_types.length > 0 && (
                    <span className="block text-xs" style={{ color: warningText }}>
                      {/* O código do enum não vai à tela: `EVALUACION_REDATOR` é identificador
                      de banco, e o mesmo dado já aparece traduzido no módulo de Operação,
                      pelas mesmas chaves (UI-07 da revisão de 2026-08-22). O mapa é de
                      `shared/lib` e não uma chave montada por template aqui: quatro sítios
                      imprimiam esta mesma lista e nenhum reprovava tipo sem tradução (Q-4 do
                      review de 2026-08-24). */}
                      {t('dashboard.redator.pendencias.missing', {
                        types: turmaDocumentTypeList(item.missing_types, t),
                      })}
                    </span>
                  )}
                  {/* Aviso, não pendência: abaixo dos bloqueantes e em tom informativo —
                    o redator vê o que ainda pode subir sem achar que algo o trava. */}
                  {item.missing_optional_types.length > 0 && (
                    <span className="block text-xs" style={{ color: infoText }}>
                      {t('dashboard.redator.pendencias.warning', {
                        types: turmaDocumentTypeList(item.missing_optional_types, t),
                      })}
                    </span>
                  )}
                </span>
                <span className={`shrink-0 ${technicalDataClass} text-xs`} style={{ color: 'var(--text-color-secondary)' }}>
                  {t('dashboard.redator.pendencias.until', { date: formatIsoDate(item.end_date) })}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AppCard>
  )
}
