import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const css = () => readFileSync(resolve(__dirname, '..', 'src/index.css'), 'utf8')

/** `index.css` sem comentários — palavra dentro de comentário não é seletor. */
function semComentarios(texto: string): string {
  return texto.replace(/\/\*[\s\S]*?\*\//g, '')
}

/**
 * Fatia `index.css` em duas partes: TODOS os blocos `@layer base { ... }` (não
 * só o primeiro) e tudo que está FORA de qualquer `@layer`.
 *
 * Ler só o primeiro bloco era o furo — provado com sonda: um segundo
 * `@layer base { input, button, textarea { ... } }` no fim do arquivo passava
 * pela catraca inteira sem ser visto (Q-1 do review de 2026-08-27). E a região
 * fora de layer importa ainda mais: ela é o idiom que este mesmo arquivo já usa
 * duas vezes (`*, *::before, *::after` e `html, body, #root`), e CSS fora de
 * layer VENCE todo CSS em layer na cascata — quem escrevesse o reset de form
 * control ali derrubaria o tema com mais força, não menos.
 */
function fatias(): { base: string; foraDeLayer: string } {
  const texto = semComentarios(css())
  const base: string[] = []
  let foraDeLayer = ''
  let i = 0
  while (i < texto.length) {
    const abre = texto.indexOf('@layer', i)
    if (abre === -1) {
      foraDeLayer += texto.slice(i)
      break
    }
    foraDeLayer += texto.slice(i, abre)
    const chave = texto.indexOf('{', abre)
    const fimDaLinha = texto.indexOf(';', abre)
    // `@layer theme, base, components, utilities;` declara ORDEM, não bloco.
    if (chave === -1 || (fimDaLinha !== -1 && fimDaLinha < chave)) {
      i = fimDaLinha === -1 ? texto.length : fimDaLinha + 1
      continue
    }
    const nome = texto.slice(abre + '@layer'.length, chave).trim()
    let profundidade = 0
    let fim = texto.length - 1
    for (let j = chave; j < texto.length; j++) {
      if (texto[j] === '{') profundidade++
      if (texto[j] === '}') {
        profundidade--
        if (profundidade === 0) {
          fim = j
          break
        }
      }
    }
    if (nome === 'base') base.push(texto.slice(chave, fim + 1))
    i = fim + 1
  }
  return { base: base.join('\n'), foraDeLayer }
}


/**
 * P-46. O Preflight do Tailwind é omitido de propósito (`index.css:1-9`, ADR-16):
 * ele zera botão, input e borda, e a aparência dos componentes vem exatamente
 * de lá. A consequência não decidida era que TODA tag de bloco herdava a margem
 * do agente do usuário — proporcional ao tamanho da fonte, o que fez o número
 * em `text-3xl` do `KpiRow` receber `margin: 30px 0` e a faixa do
 * `AppCardHeader` medir 80px de altura para 24px de texto.
 *
 * O mini-reset fecha a classe inteira. E é por isso que ESTA catraca existe: a
 * regressão perigosa aqui não é alguém apagar o reset — é alguém "completar" o
 * reset acrescentando form control, e derrubar o tema numa mudança que parece
 * melhoria.
 */
describe('mini-reset escopado (P-46)', () => {
  it('zera a margem das tags de bloco', () => {
    const bloco = fatias().base

    for (const tag of ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'ul', 'ol', 'dl', 'dd', 'blockquote', 'figure']) {
      expect(bloco, `tag de bloco ausente do reset: ${tag}`).toMatch(new RegExp(`(^|[\\s,])${tag}([\\s,{]|$)`, 'm'))
    }
    expect(bloco).toContain('margin: 0')
  })

  it('NÃO alcança form control, tabela nem imagem — em NENHUM `@layer base` nem fora de layer', () => {
    const { base, foraDeLayer } = fatias()

    for (const [regiao, css] of [
      ['@layer base', base],
      ['fora de layer', foraDeLayer],
    ] as const) {
      for (const proibido of ['button', 'input', 'select', 'textarea', 'table', 'img', 'fieldset', 'legend']) {
        expect(css, `${regiao} alcançou ${proibido} — é o que quebra o PrimeReact`).not.toMatch(
          new RegExp(`(^|[\\s,])${proibido}([\\s,{:]|$)`, 'm'),
        )
      }
    }
  })

  it('o Preflight completo continua fora', () => {
    expect(css()).not.toContain('tailwindcss/preflight')
  })
})
