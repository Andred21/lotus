import { Children, isValidElement } from 'react'
import type { CSSProperties } from 'react'
import type { ReactNode } from 'react'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import i18n from '@shared/config/i18n'
import { AppColumn, ARCHIVED_COLUMN } from './AppDataTable'
import { archivedColumns } from './archivedColumns'

// O idioma da INTERFACE, nao o do runtime: em jsdom o `toLocaleDateString()` sem
// argumento resolve pelo locale do processo (en-US), e e justamente a divergencia
// entre os dois que o D-51 relata. Mesmo molde do AppFileRow.test.tsx.
beforeAll(async () => {
  await i18n.changeLanguage('es-CL')
})
afterAll(async () => {
  await i18n.changeLanguage('es-CL')
})

const t = (key: string) => key

/** Le as props de uma coluna do array devolvido. */
function coluna(indice: number) {
  const elemento = archivedColumns(t)[indice]
  return elemento.props as {
    field?: string
    header?: string
    style?: CSSProperties
    body?: (linha: { archived_at?: string; archived_by?: string | null }) => unknown
  }
}

/** O `field` de cada filho DIRETO, como o DataTable o le
 * (`primereact/datatable/datatable.cjs.js:5973`). */
const campos = (filhos: ReactNode) =>
  Children.toArray(filhos).map((filho) =>
    isValidElement<{ field?: string }>(filho) ? filho.props.field : undefined,
  )

describe('archivedColumns', () => {
  it('devolve as DUAS colunas do rastreio, com field e header', () => {
    expect(archivedColumns(t)).toHaveLength(2)
    expect(coluna(0).field).toBe('archived_at')
    expect(coluna(0).header).toBe('archive.archivedAt')
    expect(coluna(1).field).toBe('archived_by')
    expect(coluna(1).header).toBe('archive.archivedBy')
  })

  it('formata a data no idioma da INTERFACE, nao no do navegador', () => {
    // D-51, o defeito que este bloco existe para pagar. `archived_at` vem do
    // backend como `->toIso8601String()` — data-hora completa, igual ao
    // `created_at` do AppFileRow —, entao NAO carrega o problema de fuso do
    // `formatIsoDate`: o defeito aqui e de idioma.
    //
    // A assercao mede contra o `Intl` da TAG fixada, nao contra `formatDate`:
    // comparar com `formatDate` passaria por acaso numa maquina cujo locale
    // coincidisse com o da interface — que e justamente a condicao em que o
    // defeito e invisivel.
    const iso = '2026-08-19T13:00:00Z'

    expect(coluna(0).body?.({ archived_at: iso })).toBe(new Date(iso).toLocaleDateString('es-CL'))
  })

  it('acompanha a TROCA de idioma da interface', async () => {
    const iso = '2026-08-19T13:00:00Z'
    await i18n.changeLanguage('en')

    expect(coluna(0).body?.({ archived_at: iso })).toBe(new Date(iso).toLocaleDateString('en'))

    await i18n.changeLanguage('es-CL')
  })

  it('cai no travessao quando nao ha data', () => {
    expect(coluna(0).body?.({})).toBe('—')
  })

  it('cai na chave de autor desconhecido quando archived_by e nulo', () => {
    expect(coluna(1).body?.({ archived_by: null })).toBe('archive.unknownAuthor')
    expect(coluna(1).body?.({ archived_by: 'Ana Perez' })).toBe('Ana Perez')
  })

  it('CATRACA: achata para duas colunas com field, e nao para uma', () => {
    // §2 da spec. `AppColumn` e reexport direto do `Column` do PrimeReact
    // (`AppDataTable.tsx:125`) e o DataTable le o filho DIRETO como coluna. Uma
    // versao COMPONENTE desta peca — ou um Fragment envolvendo as duas colunas —
    // achata para UM elemento sem `field`, e renderiza uma coluna lixo sem
    // estourar: build, lint e o resto desta suite passam do mesmo jeito. E por
    // isso que a decisao "funcao, nunca componente" precisa de catraca.
    const comoFuncao = [<AppColumn key="id" field="id" />, archivedColumns(t)]
    expect(campos(comoFuncao)).toEqual(['id', 'archived_at', 'archived_by'])

    const ComoComponente = () => <>{archivedColumns(t)}</>
    const comoComponente = [<AppColumn key="id" field="id" />, <ComoComponente key="c" />]
    expect(campos(comoComponente)).toEqual(['id', undefined])
  })

  it('CATRACA: o `archived &&` das tabelas segue seguro', () => {
    // `{archived && archivedColumns(t)}` no modo ativo passa `false`, e
    // `Children.toArray` o descarta — nenhuma coluna fantasma no modo ativo.
    expect(campos([<AppColumn key="id" field="id" />, false])).toEqual(['id'])
  })

  it('declara a largura das duas colunas, somando o que o orcamento desconta', () => {
    // A catraca de ESLint do item 17 nao alcanca `src/shared/**`: os arquivos de
    // teste de shared renderizam AppColumn de fixture sem largura, e po-los sob a
    // regra exigiria um `ignores` que desligaria junto a catraca de cor. O par vive
    // aqui, entao a prova vive aqui.
    expect(coluna(0).style).toEqual(ARCHIVED_COLUMN.archived_at)
    expect(coluna(1).style).toEqual(ARCHIVED_COLUMN.archived_by)
    expect(
      parseFloat(String(ARCHIVED_COLUMN.archived_at.width)) +
        parseFloat(String(ARCHIVED_COLUMN.archived_by.width)),
    ).toBe(24)
  })
})
