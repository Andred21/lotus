import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import ts from 'typescript'

const SRC = resolve(__dirname, '..', 'src')

function fontes(dir: string): string[] {
  return readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome)
    if (statSync(caminho).isDirectory()) return fontes(caminho)
    return /\.tsx$/.test(caminho) && !/\.test\.tsx$/.test(caminho) ? [caminho] : []
  })
}

type Uso = { arquivo: string; linha: number; attrs: Map<string, ts.JsxAttribute> }

/** Cada `<Tag ...>` de `src` (fora dos testes), com os atributos por nome. */
function usos(tag: string): Uso[] {
  return fontes(SRC).flatMap((arquivo) => {
    const sf = ts.createSourceFile(arquivo, readFileSync(arquivo, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    const achados: Uso[] = []
    const visita = (no: ts.Node) => {
      if ((ts.isJsxOpeningElement(no) || ts.isJsxSelfClosingElement(no)) && no.tagName.getText(sf) === tag) {
        const attrs = new Map<string, ts.JsxAttribute>()
        for (const a of no.attributes.properties) if (ts.isJsxAttribute(a)) attrs.set(a.name.getText(sf), a)
        achados.push({
          arquivo: relative(SRC, arquivo),
          linha: sf.getLineAndCharacterOfPosition(no.getStart(sf)).line + 1,
          attrs,
        })
      }
      ts.forEachChild(no, visita)
    }
    visita(sf)
    return achados
  })
}

const onde = (u: Uso) => `${u.arquivo}:${u.linha}`

/**
 * B-10 do audit de 2026-11-26: botão só-ícone em pílula (`rounded` do Prime =
 * `p-button-rounded`, raio de 2rem) contra o raio de 4px do tema. A prop mora
 * só em `shared/ui`, onde um wrapper pode decidir; tela que a passa reabre o
 * defeito (a task 9 limpou 8 sítios e a revisão achou mais 3).
 */
describe('catraca: botão não é pílula fora de shared/ui', () => {
  it('nenhum AppButton de feature ou app passa a prop `rounded`', () => {
    const pilulas = usos('AppButton')
      .filter((u) => !u.arquivo.startsWith('shared/ui/') && u.attrs.has('rounded'))
      .map(onde)

    expect(pilulas).toEqual([])
  })

  it('o detector enxerga a prop (prova de que o teste não é vácuo)', () => {
    const sf = ts.createSourceFile('x.tsx', '<AppButton text rounded />', ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    const el = (sf.statements[0] as ts.ExpressionStatement).expression as ts.JsxSelfClosingElement
    expect(el.attributes.properties.map((a) => (a as ts.JsxAttribute).name.getText(sf))).toContain('rounded')
  })
})

/**
 * D-10: `<AppLogo>` emite `width`/`height` do PNG. O projeto NÃO tem Preflight
 * (`index.css`), então nada neutraliza o `height` do atributo: quem fixa só a
 * largura recebe o logo esticado (o Login saía 208x466 para um arquivo de
 * 335x466). Todo call site declara a altura (`h-*`; `h-auto` quando só a
 * largura manda). jsdom não mede layout, então a prova é estrutural.
 */
describe('catraca: todo AppLogo resolve a própria altura', () => {
  it('cada call site tem uma classe h-* no className', () => {
    const semAltura = usos('AppLogo')
      .filter((u) => {
        const classe = u.attrs.get('className')?.initializer?.getText() ?? ''
        return !/["'\s{`]h-[\w.[\]-]+/.test(classe)
      })
      .map(onde)

    expect(semAltura).toEqual([])
  })

  it('há call sites de AppLogo (o teste não é vácuo)', () => {
    expect(usos('AppLogo').length).toBeGreaterThanOrEqual(3)
  })
})
