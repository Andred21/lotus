import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const raiz = resolve(__dirname, '..', '..')
const ler = (caminho: string) => readFileSync(resolve(raiz, caminho), 'utf8')

const SEMVER = /^\d+\.\d+\.\d+$/

describe('versão do sistema: fonte única (bloco 45)', () => {
  it('version.txt, manifesto, package.json e config/app.php dizem a mesma versão', () => {
    const txt = ler('version.txt').trim()
    const manifesto = JSON.parse(ler('.release-please-manifest.json'))['.']
    const pacote = JSON.parse(ler('frontend/package.json')).version
    const casamento = ler('backend/config/app.php').match(
      /'version' => '([^']+)', \/\/ x-release-please-version/,
    )
    expect(casamento, "linha 'version' marcada x-release-please-version ausente em config/app.php").not.toBeNull()
    const backend = casamento![1]

    expect(txt).toMatch(SEMVER)
    expect({ manifesto, pacote, backend }).toEqual({ manifesto: txt, pacote: txt, backend: txt })
  })

  it('brand.ts não carrega literal de versão', () => {
    expect(ler('frontend/src/shared/config/brand.ts')).not.toMatch(/['"`]v?\d+\.\d+\.\d+['"`]/)
  })
})
