import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve, join, relative } from 'node:path'

const root = resolve(__dirname, '..')

/** Catraca do bloco 64: o PrimeIcons saiu e o Phosphor tem UMA porta (`shared/ui/AppIcon`). */
function arquivos(dir: string, extensoes: RegExp): string[] {
  return readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome)
    if (statSync(caminho).isDirectory()) return arquivos(caminho, extensoes)
    return extensoes.test(nome) ? [caminho] : []
  })
}

const relativo = (caminho: string) => relative(root, caminho).split('\\').join('/')

describe('catraca de ícones (bloco 64)', () => {
  it('nenhuma classe PrimeIcons em src', () => {
    // `pi pi-x` como classe, ou `pi-x` entre aspas/crase (o token solto). O tema
    // gerado traz a folha do Prime e fica de fora.
    const classePrimeIcons = /\bpi pi-|['"`]pi-[a-z]/
    const infratores = arquivos(resolve(root, 'src'), /\.(ts|tsx|css)$/)
      .map(relativo)
      .filter((caminho) => !caminho.startsWith('src/shared/styles/themes/'))
      .filter((caminho) => classePrimeIcons.test(readFileSync(resolve(root, caminho), 'utf8')))

    expect(infratores).toEqual([])
  })

  it('primeicons fora do package.json', () => {
    expect(readFileSync(resolve(root, 'package.json'), 'utf8')).not.toContain('"primeicons"')
  })

  it('primeicons fora de src (import, @import de CSS, url)', () => {
    // `src/shared/styles/themes/` (tema gerado) fica de fora, como na catraca de classes.
    const infratores = arquivos(resolve(root, 'src'), /\.(ts|tsx|css)$/)
      .map(relativo)
      .filter((caminho) => !caminho.startsWith('src/shared/styles/themes/'))
      .filter((caminho) => readFileSync(resolve(root, caminho), 'utf8').includes('primeicons'))

    expect(infratores).toEqual([])
  })

  it('Phosphor só em shared/ui/AppIcon', () => {
    const infratores = arquivos(resolve(root, 'src'), /\.(ts|tsx)$/)
      .map(relativo)
      .filter((caminho) => !caminho.startsWith('src/shared/ui/AppIcon/'))
      .filter((caminho) => readFileSync(resolve(root, caminho), 'utf8').includes("from '@phosphor-icons/react'"))

    expect(infratores).toEqual([])
  })
})
