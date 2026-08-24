import { useTranslation } from 'react-i18next'
import { AppTag, IdentityCell } from '@shared/ui'
import type { TurmaData } from '@shared/types/generated'
import { turmaDisplayStatus, turmaStatusSeverity, turmaModalidadeTagProps } from '../../lib/turmaStatus'

// Os corpos de célula da `TurmasTable` que não são valor cru. Moram aqui
// porque a tabela ganhou as duas colunas do rastreio e a coluna de ações
// (arquivar/restaurar) e passou da régua de 150 linhas que o ESLint impõe a
// `src/features` + `/components`. Molde: `Redator/SlotBody.tsx`.
//
// A política de LARGURA das mesmas colunas mora em `turmaColumns.ts`, e não
// aqui: `react-refresh/only-export-components` reprova constante exportada de
// arquivo que também exporta componente.

export function TurmaCodeCell({ turma }: { turma: TurmaData }) {
  return (
    <span className="font-bold text-sm" style={{ color: 'var(--primary-color)' }}>
      {turma.quote_code ?? '—'}
    </span>
  )
}

export function TurmaClientCell({ turma }: { turma: TurmaData }) {
  return (
    <IdentityCell
      title={turma.client_name ?? '—'}
      description={turma.client_rut}
      image={turma.client_photo_url}
    />
  )
}

export function TurmaModalidadeCell({ turma }: { turma: TurmaData }) {
  const { t } = useTranslation()

  return (
    <AppTag
      value={t(`operation.modality.${turma.modalidade}`)}
      {...turmaModalidadeTagProps(turma.modalidade)}
    />
  )
}

export function TurmaRedatoresCell({ turma }: { turma: TurmaData }) {
  const { t } = useTranslation()
  const [primeiro, ...resto] = turma.redatores

  if (primeiro === undefined)
    return <span style={{ color: 'var(--text-color-secondary)' }}>{t('operation.table.noRedator')}</span>

  /* Primeiro + contador, não N células empilhadas: a altura da linha
   * tem de ser constante na tabela inteira. O `+N` é numeral puro,
   * então não abre chave de i18n; os nomes restantes vão no `title`,
   * que é dado e não copy. */
  return (
    <div className="flex items-center gap-2">
      <IdentityCell title={primeiro.name} description={primeiro.email} image={primeiro.photo_url} />
      {resto.length > 0 && (
        <span
          className="text-xs"
          style={{ color: 'var(--text-color-secondary)' }}
          title={resto.map((r) => r.name).join(', ')}
        >
          +{resto.length}
        </span>
      )}
    </div>
  )
}

export function TurmaStatusCell({ turma }: { turma: TurmaData }) {
  const { t } = useTranslation()
  const status = turmaDisplayStatus(turma)

  return <AppTag value={t(`operation.status.${status}`)} severity={turmaStatusSeverity(status)} />
}
