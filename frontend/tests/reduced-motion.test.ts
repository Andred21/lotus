import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const css = readFileSync(resolve(__dirname, '../src/index.css'), 'utf8')

/** O corpo (com chaves aninhadas) do primeiro `@media (prefers-reduced-motion: reduce)`. */
function blocoReduzido(): string {
  const inicio = css.search(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{/)
  if (inicio < 0) return ''
  let i = css.indexOf('{', inicio)
  const comeco = i + 1
  let nivel = 0
  for (; i < css.length; i++) {
    if (css[i] === '{') nivel++
    if (css[i] === '}' && --nivel === 0) break
  }
  return css.slice(comeco, i)
}

describe('movimento reduzido (A-11)', () => {
  it('index.css desliga animação sob movimento reduzido', () => {
    const bloco = blocoReduzido()

    expect(bloco, 'falta @media (prefers-reduced-motion: reduce)').not.toBe('')
    expect(bloco).toMatch(/animation-duration:\s*0\.01ms\s*!important/)
    expect(bloco).toMatch(/transition-duration:\s*0\.01ms\s*!important/)
    expect(bloco).toMatch(/\.p-skeleton:after\s*\{[^}]*animation:\s*none/)
  })
})
