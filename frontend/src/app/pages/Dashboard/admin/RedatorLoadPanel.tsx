import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AppCard, AppCardHeader, AppDataTable, AppColumn, AppEmptyState } from '@shared/ui'
import { dangerText, warningText } from '@shared/styles/tokens'
import type { RedatorLoadData } from '@shared/types/generated'

/** Contador que só ganha tinta quando é diferente de zero: um "0 vencidos" em
 * vermelho leria como alarme sobre a informação mais tranquilizadora da linha.
 * Cor por `style` e token, nunca por classe Tailwind (ADR-16). */
function Contador({ valor, ink }: { valor: number; ink?: string }) {
  return (
    <span className="font-mono tabular-nums" style={valor > 0 && ink ? { color: ink } : undefined}>
      {valor}
    </span>
  )
}

/**
 * Carga dos redatores: quantas turmas cada um tem agora e em seguida, e quantos
 * documentos dele estão vencidos ou vencendo. Estado ATUAL — a janela histórica
 * não alcança esta seção (D3 do bloco A).
 *
 * Tabela e não lista (D9): 6 campos por linha, todos numéricos exceto o nome.
 *
 * LIMITAÇÃO DECLARADA (P-44, D10): no banco de dev esta tabela mostra dois
 * usuários-sonda de gates anteriores. Apagá-los é mutação de dado alheia a um
 * bloco read-only, e a ficha da pendência fecha "quando um bloco puder
 * reseedar o banco de dev" — este não pode.
 */
export function RedatorLoadPanel({ redatores }: { redatores: RedatorLoadData[] }) {
  const { t } = useTranslation()

  return (
    <AppCard>
      <AppCardHeader title={t('dashboard.redatorLoad.title')} count={redatores.length} />
      <AppDataTable
        value={redatores}
        dataKey="redator_id"
        emptyMessage={<AppEmptyState icon="pi pi-users" title={t('dashboard.redatorLoad.empty')} />}
        footerCount={t('dashboard.redatorLoad.count', { count: redatores.length })}
      >
        <AppColumn
          field="name"
          header={t('dashboard.redatorLoad.name')}
          sortable
          body={(r: RedatorLoadData) => (
            // `/personas` SEM parâmetro, e não `/personas/{id}`: não existe rota
            // de detalhe de relator — `AppRouter` registra só `/personas`, e o
            // `navigation.ts:49-50` já resolveu o mesmo caso com `key: null`
            // ("listagem com diálogo, sem rota de detalhe"). Ancorar na entidade
            // é o FUT-2 do backlog e depende de decisão do João; inventar
            // `/personas/{id}` aqui daria 404 depois do clique, que é pior que
            // link nenhum.
            <Link to="/personas" className="no-underline" style={{ color: 'var(--text-color)' }}>
              {r.name}
            </Link>
          )}
        />
        <AppColumn
          field="current_turmas"
          header={t('dashboard.redatorLoad.current')}
          sortable
          body={(r: RedatorLoadData) => <Contador valor={r.current_turmas} />}
        />
        <AppColumn
          field="upcoming_turmas"
          header={t('dashboard.redatorLoad.upcoming')}
          sortable
          body={(r: RedatorLoadData) => <Contador valor={r.upcoming_turmas} />}
        />
        <AppColumn
          field="expired_documents"
          header={t('dashboard.redatorLoad.expired')}
          sortable
          body={(r: RedatorLoadData) => <Contador valor={r.expired_documents} ink={dangerText} />}
        />
        <AppColumn
          field="expiring_documents"
          header={t('dashboard.redatorLoad.expiring')}
          sortable
          body={(r: RedatorLoadData) => <Contador valor={r.expiring_documents} ink={warningText} />}
        />
      </AppDataTable>
    </AppCard>
  )
}
