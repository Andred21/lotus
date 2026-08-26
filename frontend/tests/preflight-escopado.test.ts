import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const css = () => readFileSync(resolve(__dirname, '..', 'src/index.css'), 'utf8')

/** O bloco `@layer base { ... }` de `index.css`, sem o resto do arquivo. */
function blocoBase(): string {
  const texto = css()
  const inicio = texto.indexOf('@layer base {')
  if (inicio === -1) return ''
  let profundidade = 0
  for (let i = texto.indexOf('{', inicio); i < texto.length; i++) {
    if (texto[i] === '{') profundidade++
    if (texto[i] === '}') {
      profundidade--
      if (profundidade === 0) return texto.slice(inicio, i + 1)
    }
  }
  return ''
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
    const bloco = blocoBase()

    for (const tag of ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'ul', 'ol', 'dl', 'blockquote', 'figure']) {
      expect(bloco, `tag de bloco ausente do reset: ${tag}`).toMatch(new RegExp(`(^|[\\s,])${tag}([\\s,{]|$)`, 'm'))
    }
    expect(bloco).toContain('margin: 0')
  })

  it('NÃO alcança form control, tabela nem imagem', () => {
    const bloco = blocoBase()

    for (const proibido of ['button', 'input', 'select', 'textarea', 'table', 'img', 'fieldset', 'legend']) {
      expect(bloco, `o reset alcançou ${proibido} — é o que quebra o PrimeReact`).not.toMatch(
        new RegExp(`(^|[\\s,])${proibido}([\\s,{:]|$)`, 'm'),
      )
    }
  })

  it('o Preflight completo continua fora', () => {
    expect(css()).not.toContain('tailwindcss/preflight')
  })
})
