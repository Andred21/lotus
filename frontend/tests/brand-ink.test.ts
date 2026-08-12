import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(__dirname, '..')
const fonte = (caminho: string) => readFileSync(resolve(root, caminho), 'utf8')

const temaClaro = fonte('src/shared/styles/themes/lara-light-lotus.css')
const camadaDeMarca = fonte('src/shared/styles/brand-theme.css')
const variantDeMarca = fonte('src/shared/ui/AppButton/style.ts')

const token = (css: string, nome: string) =>
  css.match(new RegExp(`${nome}:\\s*(#[0-9a-f]{3,6})`, 'i'))?.[1].toLowerCase() ?? ''

const luminancia = (hex: string) => {
  const canal = (i: number) => {
    const s = parseInt(hex.slice(i, i + 2), 16) / 255
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * canal(1) + 0.7152 * canal(3) + 0.0722 * canal(5)
}

const contraste = (a: string, b: string) => {
  const [claro, escuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x)
  return (claro + 0.05) / (escuro + 0.05)
}

/**
 * UI-01 do review de 2026-08-12. O achado 3 tirou o celeste de primeiro plano
 * do TEMA gerado, mas o visual de marca do `AppButton` é Tailwind — o
 * transform não o enxerga —, e ele seguiu pintando rótulo e borda de celeste
 * sobre a superfície branca do botão, a 2,77:1, em 22 call sites. É a ação
 * primária de quase todo módulo ("New instructor", "Approve", "Next").
 *
 * O teste mede a razão de contraste em vez de conferir um hex escolhido: um
 * degrau novo da rampa só passa aqui se for legível de fato.
 */
describe('tinta de marca sobre superfície clara (UI-01)', () => {
  const superficie = token(temaClaro, '--surface-card')
  const tinta = token(temaClaro, '--primary-700')
  const celeste = token(temaClaro, '--primary-500')

  it('a tinta do claro passa AA em texto (4,5:1) e em elemento gráfico (3:1)', () => {
    expect(contraste(tinta, superficie)).toBeGreaterThanOrEqual(4.5)
  })

  /** O controle que faz o teste discriminar: o celeste é justamente quem
   * reprovava, então uma "correção" que voltasse a ele cairia aqui. */
  it('o celeste reprova nessa mesma superfície — é o defeito que o token evita', () => {
    expect(contraste(celeste, superficie)).toBeLessThan(3)
  })

  it('o variant de marca lê a tinta, não o celeste, na camada clara', () => {
    const camadaClara = variantDeMarca
      .split('\n')
      .filter((linha) => linha.includes('var(--brand'))
      .join('\n')
      .replace(/dark:\S+/g, '')

    expect(camadaClara).toContain('text-[var(--brand-ink)]')
    expect(camadaClara).toContain('border-[var(--brand-ink)]')
    expect(camadaClara).not.toContain('text-[var(--brand)]')
    expect(camadaClara).not.toContain('border-[var(--brand)]')
  })

  it('a camada de marca aponta --brand-ink para o degrau 700 no claro e para o celeste fora dele', () => {
    // Pelo BLOCO, não pelo texto: o seletor também aparece em comentário.
    const claro = camadaDeMarca.match(/^html:not\(\.dark\)\s*\{([^}]*)\}/m)?.[1] ?? ''
    const raiz = camadaDeMarca.match(/^:root\s*\{([^}]*)\}/m)?.[1] ?? ''

    expect(claro).toContain('--brand-ink: var(--primary-700)')
    expect(raiz).toContain('--brand-ink: var(--brand)')
  })
})
