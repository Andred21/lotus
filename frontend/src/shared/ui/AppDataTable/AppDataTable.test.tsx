import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { useTranslation } from 'react-i18next'
import i18n from '@shared/config/i18n'
import { formatDate } from '@shared/lib'
import { AppColumn, AppDataTable } from './AppDataTable'
import { stickyActionsColumn } from './style'

const ISO = '2026-08-19T13:00:00Z'
const LINHAS = [{ id: 1, archived_at: ISO }]

/**
 * O consumidor real: quem chama `useTranslation()` e monta as colunas é a TABELA
 * da feature (`ClientsTable`, `CoursesTable`, ...), nao o wrapper. O `body` aqui
 * repete o mecanismo de `archivedColumns` (`shared/ui/archivedColumns.tsx:41`) sem
 * depender do irmao: `formatDate` resolve o locale por `i18n.language` A CADA
 * CHAMADA, entao o texto so congela se a celula nao for reinvocada.
 */
function TabelaDeArquivados() {
  const { t } = useTranslation()

  return (
    <AppDataTable value={LINHAS}>
      <AppColumn field="id" header="id" />
      <AppColumn
        field="archived_at"
        header={t('archive.archivedAt')}
        body={(linha: { archived_at: string }) => formatDate(new Date(linha.archived_at))}
      />
    </AppDataTable>
  )
}

// `beforeEach`, nao `beforeAll`: o primeiro caso termina em `en`, e o segundo
// precisa comecar em es-CL para medir a TROCA. `cleanup` desmonta a arvore, mas
// a instancia de i18n e modulo compartilhado e nao volta sozinha.
beforeEach(async () => {
  await i18n.changeLanguage('es-CL')
})
afterAll(async () => {
  await i18n.changeLanguage('es-CL')
})

describe('AppDataTable — repinte de celula na troca de idioma (D-55)', () => {
  it('CATRACA: o VALOR da celula acompanha a troca de idioma, sem recarga', async () => {
    // O defeito medido no BD-17: com `cellMemo` no default `true`, o comparador do
    // BodyCell ignora `body` (`primereact/datatable/datatable.cjs.js:1795-1808`) e a
    // celula devolve o texto do idioma ANTERIOR ate a proxima recarga.
    render(<TabelaDeArquivados />)

    expect(screen.getByText(new Date(ISO).toLocaleDateString('es-CL'))).toBeTruthy()

    await act(async () => {
      await i18n.changeLanguage('en')
    })

    expect(screen.getByText(new Date(ISO).toLocaleDateString('en'))).toBeTruthy()
    expect(screen.queryByText(new Date(ISO).toLocaleDateString('es-CL'))).toBeNull()
  })

  it('o CABECALHO ja acompanhava — e o contraste que nomeia o defeito', async () => {
    // Sem este par, "a tabela nao troca de idioma" e uma frase vaga. O cabecalho
    // sempre repintou; e a divergencia entre os dois que o D-55 relata.
    render(<TabelaDeArquivados />)

    expect(screen.getByText('Archivado el')).toBeTruthy()

    await act(async () => {
      await i18n.changeLanguage('en')
    })

    expect(screen.getByText('Archived on')).toBeTruthy()
  })
})

describe('AppDataTable — modo lazy (spec §5)', () => {
  it('CATRACA: com totalRecords acima de rows, os controles de página aparecem mesmo com uma página só de linhas', () => {
    // A página vem do servidor com 10 linhas no máximo: `data.length > rows`
    // nunca ligaria o paginador, e a lista de 5.000 alunos ficaria presa na
    // primeira página sem botão nenhum.
    render(
      <AppDataTable value={LINHAS} footerCount={<span>1</span>} lazy totalRecords={30} rows={10}>
        <AppColumn field="id" header="id" />
      </AppDataTable>,
    )

    expect(document.querySelector('.p-paginator-next')).not.toBeNull()
  })

  it('sem totalRecords, uma página de linhas segue sem controles (client-side intacto)', () => {
    render(
      <AppDataTable value={LINHAS} footerCount={<span>1</span>} rows={10}>
        <AppColumn field="id" header="id" />
      </AppDataTable>,
    )

    expect(document.querySelector('.p-paginator-next')).toBeNull()
  })

  it('em erro, totalRecords não segura o paginador sobre linhas vazias', () => {
    render(
      <AppDataTable value={LINHAS} footerCount={<span>1</span>} lazy totalRecords={30} rows={10} error={{ detail: 'x' }}>
        <AppColumn field="id" header="id" />
      </AppDataTable>,
    )

    expect(document.querySelector('.p-paginator-next')).toBeNull()
  })
})

describe('AppDataTable — dataKey (f3 UI-06)', () => {
  /**
   * `dataKey="id"` é o default do wrapper, e o DTO das linhas de emissão expõe
   * `enrollment_id`: cada linha resolvia a chave para `undefined` e o React
   * acusava `Each child in a list should have a unique "key" prop` no console,
   * de forma determinística, numa tabela cujas linhas carregam ação de
   * documento com peso legal (f3 UI-06, run de 2026-08-28). A prop do
   * chamador vence o default — e este teste é o que garante que continue.
   */
  it('a linha sem `id` declara a própria chave e o console fica limpo', () => {
    const erro = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <AppDataTable value={[{ enrollment_id: 7 }, { enrollment_id: 8 }]} dataKey="enrollment_id">
        <AppColumn field="enrollment_id" header="id" />
      </AppDataTable>,
    )
    expect(erro.mock.calls.flat().join(' ')).not.toContain('unique "key" prop')
    erro.mockRestore()
  })
})

describe('stickyActionsColumn', () => {
  it('a coluna de acoes presa recebe o tinte do hover por cima do card opaco', () => {
    const style = stickyActionsColumn('8rem')

    // Card opaco embaixo (conteudo nao rola visivel por baixo) e o tinte da
    // linha por cima, que a `tr` injeta em `--sticky-cell-tint`. O hover do
    // tema escuro e translucido, entao a cor do hover NAO pode ser o fundo
    // unico da celula presa.
    expect(style.backgroundColor).toBe('var(--surface-card)')
    expect(style.backgroundImage).toBe(
      'linear-gradient(var(--sticky-cell-tint, transparent), var(--sticky-cell-tint, transparent))',
    )
  })

  it('a coluna presa desenha a propria sombra, porque cobre a do involucro', () => {
    const style = stickyActionsColumn('8rem')

    expect(style.boxShadow).toBe(
      '-1rem 0 1rem -1rem color-mix(in srgb, var(--text-color) 22%, transparent)',
    )
  })
})

/**
 * P-70 atravessando a árvore de render, e não parando na função: o par
 * `screenDetail(error) ?? t(loadErrorHint(error))` decide QUAL frase o
 * `AppErrorState` imprime, e é a frase na tela que a ficha cobra.
 */
describe('detalhe do servidor no estado de erro (P-70)', () => {
  it('403: a frase que o servidor escreveu aparece na tela', () => {
    render(
      <AppDataTable value={[]} error={{ detail: 'La cotización no tiene cliente', status: 403 }}>
        <AppColumn field="id" header="id" />
      </AppDataTable>,
    )

    expect(screen.getByText('La cotización no tiene cliente')).toBeTruthy()
  })

  it('500: a dica do i18n assume, porque o `detail` daquele status não é localizado', () => {
    render(
      <AppDataTable value={[]} error={{ detail: 'Ocorreu um erro inesperado.', status: 500 }}>
        <AppColumn field="id" header="id" />
      </AppDataTable>,
    )

    expect(screen.queryByText('Ocorreu um erro inesperado.')).toBeNull()
    expect(screen.getByText(i18n.t('common.loadErrorHint'))).toBeTruthy()
  })
})
