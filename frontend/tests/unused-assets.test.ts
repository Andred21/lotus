import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

/**
 * D-10 do audit de 2026-11-26: o scaffold do Vite deixou `hero.png`,
 * `react.svg`, `vite.svg`, `favicon.svg` e `icons.svg`, e o logo antigo ficou
 * ao lado dos três que o produto usa. Nada os referenciava, e é por isso que
 * ninguém notou: asset morto não quebra build, só engorda o repositório e
 * confunde quem procura "o logo".
 *
 * A regra: todo arquivo de `src/assets` é citado por algum arquivo de `src`
 * (fora dos testes, que provam o asset, não o usam), e todo arquivo de
 * `public` é citado pelo `index.html` ou por `src`.
 */
const RAIZ = resolve(__dirname, '..')

function arquivos(dir: string): string[] {
  return readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome)
    return statSync(caminho).isDirectory() ? arquivos(caminho) : [caminho]
  })
}

const fonte = arquivos(join(RAIZ, 'src'))
  .filter((f) => /\.(tsx?|css|html)$/.test(f) && !/\.test\.tsx?$/.test(f))
  .map((f) => readFileSync(f, 'utf8'))
  .join('\n')

const indexHtml = readFileSync(join(RAIZ, 'index.html'), 'utf8')

const semUso = (pasta: string, alcance: string) =>
  readdirSync(join(RAIZ, pasta)).filter((nome) => !alcance.includes(nome))

describe('asset sem uso reprova', () => {
  it('cada arquivo de src/assets é referenciado em src', () => {
    expect(semUso('src/assets', fonte)).toEqual([])
  })

  it('cada arquivo de public é referenciado no index.html ou em src', () => {
    expect(semUso('public', `${indexHtml}\n${fonte}`)).toEqual([])
  })

  it('o detector enxerga um asset órfão (prova de que o teste não é vácuo)', () => {
    expect(semUso('src/assets', 'só LogoLight.png')).toContain('LogoDark.png')
  })
})
