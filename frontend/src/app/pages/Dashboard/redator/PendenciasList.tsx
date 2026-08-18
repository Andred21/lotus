import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AppCard, AppCardHeader, AppEmptyState, AppButton } from '@shared/ui'
import { formatIsoDate } from '@shared/lib'
import { warningText } from '@shared/styles/tokens'
import type { RedatorTurmaPendenciaData } from '@shared/types/generated'

/**
 * Turmas do próprio Redator com documento faltando. Sem cliente, sem UF, sem
 * turma alheia — o payload `view=redator` já chega filtrado da API, e esta tela
 * não tem como pedir mais do que ele traz.
 *
 * A ação leva ao Meu Perfil e não a um formulário local: o Redator anexa
 * documento POR LÁ, e este bloco é read-only. Botão fora do `<li>` para o
 * ponteiro não competir com nada dentro da linha.
 */
export function PendenciasList({ items }: { items: RedatorTurmaPendenciaData[] }) {
  const { t } = useTranslation()
  const navegar = useNavigate()

  return (
    <AppCard>
      <AppCardHeader
        title={t('dashboard.redator.pendencias.title')}
        count={items.length}
        actions={
          items.length > 0 ? (
            // UM controle, e não `<Link>` embrulhando `<AppButton>`. Conteúdo
            // interativo dentro de `<a>` é aninhamento inválido, e a árvore de
            // acessibilidade mostrava o resultado: dois pontos de parada para uma
            // ação, o primeiro deles um link SEM nome, porque o nome estava no
            // botão de dentro (UI-08 da revisão de 2026-08-17). O `AppButton`
            // embrulha um `Button` do Prime, que renderiza `<button>` e não
            // aceita virar âncora — então quem navega é o router, por `navigate`.
            //
            // `/perfil` — o path que o `AppRouter` registra. Não é `/mi-perfil`.
            <AppButton
              label={t('dashboard.redator.pendencias.goToProfile')}
              text
              onClick={() => void navegar('/perfil')}
            />
          ) : undefined
        }
      />
      {items.length === 0 ? (
        <AppEmptyState
          icon="pi pi-check-circle"
          title={t('dashboard.redator.pendencias.empty')}
          description={t('dashboard.redator.pendencias.emptyHint')}
        />
      ) : (
        <ul className="m-0 list-none p-0">
          {items.map((item) => (
            <li
              key={item.turma_id}
              className="border-b px-4 py-2 last:border-b-0"
              style={{ borderColor: 'var(--surface-border)' }}
            >
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                <span className="min-w-0 basis-full sm:flex-1 sm:basis-0">
                  <span className="block truncate text-sm font-medium" title={item.course_name}>
                    {item.course_name}
                  </span>
                  <span className="block truncate text-xs" style={{ color: warningText }}>
                    {t('dashboard.redator.pendencias.missing', { types: item.missing_types.join(', ') })}
                  </span>
                </span>
                <span className="shrink-0 font-mono text-xs" style={{ color: 'var(--text-color-secondary)' }}>
                  {t('dashboard.redator.pendencias.until', { date: formatIsoDate(item.end_date) })}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </AppCard>
  )
}
