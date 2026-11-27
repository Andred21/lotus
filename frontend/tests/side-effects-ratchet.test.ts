import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve, join, relative, posix } from 'node:path'

const root = resolve(__dirname, '..')
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')) as { sideEffects?: string[] }

/** Catraca do bloco 67: `sideEffects` só vale se todo import nu de src estiver declarado. */
function arquivos(dir: string, extensoes: RegExp): string[] {
  return readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome)
    if (statSync(caminho).isDirectory()) return arquivos(caminho, extensoes)
    return extensoes.test(nome) ? [caminho] : []
  })
}

const relativo = (caminho: string) => relative(root, caminho).split('\\').join('/')

/** Especificador de cada `import 'x'` sem nome, sem chaves e sem `type`. */
function importsNus(fonte: string): string[] {
  return [...fonte.matchAll(/^\s*import\s+['"]([^'"]+)['"]/gm)].map((m) => m[1])
}

const aliases: Array<[string, string]> = [
  ['@app/', 'src/app/'],
  ['@shared/', 'src/shared/'],
  ['@features/', 'src/features/'],
  ['@/', 'src/'],
]

/** Caminho `./src/...` com extensão do especificador relativo ou de alias; `null` para pacote. */
function resolverEmSrc(arquivo: string, especificador: string): string | null {
  let base: string | null = null
  if (especificador.startsWith('./') || especificador.startsWith('../')) {
    base = posix.join(posix.dirname(arquivo), especificador)
  } else {
    const alias = aliases.find(([prefixo]) => especificador.startsWith(prefixo))
    if (alias) base = alias[1] + especificador.slice(alias[0].length)
  }
  if (base === null) return null
  const candidatos = [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`]
  const achado = candidatos.find((c) => existsSync(resolve(root, c)) && statSync(resolve(root, c)).isFile())
  return `./${achado ?? base}`
}

describe('catraca de sideEffects (bloco 67)', () => {
  it('package.json declara sideEffects com a lista do bloco 67', () => {
    expect(pkg.sideEffects).toEqual(['**/*.css', './src/main.tsx', './src/shared/config/i18n.ts'])
  })

  it('o detector acha import nu e ignora import com nome', () => {
    const fonte = [
      'import "./shared/config/i18n"; // inicializa i18next (side-effect)',
      "import './a.css'",
      "import '@shared/config/b'",
      "import x from './y'",
      "import type { T } from './z'",
      'import {',
      '  a,',
      "} from './d'",
      "export * from './c'",
    ].join('\n')
    expect(importsNus(fonte)).toEqual(['./shared/config/i18n', './a.css', '@shared/config/b'])
    expect(resolverEmSrc('src/main.tsx', './shared/config/i18n')).toBe('./src/shared/config/i18n.ts')
    expect(resolverEmSrc('src/main.tsx', '@shared/config/i18n')).toBe('./src/shared/config/i18n.ts')
    expect(resolverEmSrc('src/main.tsx', 'primereact/resources/primereact.min.css')).toBeNull()
  })

  it('todo import nu em src é CSS, pacote ou módulo da lista sideEffects', () => {
    // Fora do build: testes, test-setup e shared/testing.
    const declarados = pkg.sideEffects ?? []
    const infratores = arquivos(resolve(root, 'src'), /\.(ts|tsx)$/)
      .map(relativo)
      .filter((c) => !/\.test\./.test(c) && c !== 'src/test-setup.ts' && !c.startsWith('src/shared/testing/'))
      .flatMap((arquivo) =>
        importsNus(readFileSync(resolve(root, arquivo), 'utf8'))
          .filter((esp) => !esp.endsWith('.css'))
          .filter((esp) => {
            const alvo = resolverEmSrc(arquivo, esp)
            return alvo !== null && !declarados.includes(alvo)
          })
          .map((esp) => `${arquivo} -> ${esp}`),
      )

    expect(infratores).toEqual([])
  })
})
