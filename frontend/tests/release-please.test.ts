import { describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const raiz = resolve(__dirname, '..', '..')
const ler = (caminho: string) => readFileSync(resolve(raiz, caminho), 'utf8')

// Bloco 45: o release-please só dispara bump por commit que toca caminho de PRODUTO. O que sobra
// na raiz entra em `exclude-paths`. A catraca abaixo obriga a classificar toda entrada nova da
// raiz, para que um diretório novo não vire bump (ou deixe de virar) sem ninguém decidir.
const PRODUTO = ['backend', 'frontend', 'docker', 'deploy', '.github']

// Entradas que nascem em tasks paralelas do bloco e podem ainda não estar no índice do git.
const EXTRAS_DO_BLOCO = [
  'LICENSE',
  'CHANGELOG.md',
  'version.txt',
  '.release-please-manifest.json',
  'release-please-config.json',
]

const semBarraFinal = (caminho: string) => caminho.replace(/\/+$/, '')

// Retorna as entradas de primeiro nível que não estão em PRODUTO nem em exclude-paths.
function naoClassificadas(entradas: string[], excluidos: string[]): string[] {
  const conhecidas = new Set([...PRODUTO, ...excluidos.map(semBarraFinal)])
  return entradas.filter((entrada) => !conhecidas.has(entrada))
}

function entradasDePrimeiroNivel(): string[] {
  // `-z` evita o escape octal que o git aplica a "INSTRUÇÕES-DO-PROJETO.md" (acentos).
  const arquivos = execFileSync('git', ['ls-files', '-z'], { cwd: raiz, encoding: 'utf8' })
    .split('\0')
    .filter(Boolean)
  return [...new Set([...arquivos.map((a) => a.split('/')[0]), ...EXTRAS_DO_BLOCO])]
}

const config = JSON.parse(ler('release-please-config.json'))
const pacote = config.packages['.']

describe('release-please: configuração (bloco 45)', () => {
  it('parte do commit de bootstrap e do manifesto de versão única na raiz', () => {
    expect(config['bootstrap-sha']).toBe('5fba081d7bff45e4ad4b930d49957f6c91f47978')
    expect(config.$schema).toContain('release-please')
    expect(pacote['release-type']).toBe('simple')
    expect(pacote['include-v-in-tag']).not.toBe(false)
    expect(pacote['include-component-in-tag']).toBe(false)
  })

  it('mostra só feat, fix e perf no CHANGELOG, em pt-BR, e esconde o resto', () => {
    const secoes: { type: string; section: string; hidden?: boolean }[] =
      pacote['changelog-sections']
    const visiveis = secoes.filter((s) => !s.hidden).map((s) => [s.type, s.section])
    expect(visiveis).toEqual([
      ['feat', 'Funcionalidades'],
      ['fix', 'Correções'],
      ['perf', 'Desempenho'],
    ])
    const escondidos = secoes.filter((s) => s.hidden)
    expect(escondidos.length).toBeGreaterThan(0)
    expect(escondidos.map((s) => s.type)).toEqual(
      expect.arrayContaining(['docs', 'chore', 'refactor', 'test', 'style', 'build', 'ci', 'cicd']),
    )
  })

  it('atualiza a versão no package.json do frontend e no config/app.php do backend', () => {
    expect(pacote['extra-files']).toEqual(
      expect.arrayContaining([
        { type: 'json', path: 'frontend/package.json', jsonpath: '$.version' },
        { type: 'generic', path: 'backend/config/app.php' },
      ]),
    )
    expect(ler('backend/config/app.php')).toContain('x-release-please-version')
  })
})

describe('release-please: catraca da raiz (bloco 45)', () => {
  const excluidos: string[] = pacote['exclude-paths']

  it('toda entrada de primeiro nível do repositório é de produto ou está em exclude-paths', () => {
    expect(naoClassificadas(entradasDePrimeiroNivel(), excluidos)).toEqual([])
  })

  it('nenhum caminho de produto está em exclude-paths', () => {
    const excluidosSemBarra = excluidos.map(semBarraFinal)
    for (const produto of PRODUTO) {
      expect(excluidosSemBarra, produto).not.toContain(produto)
    }
  })

  it('reprova uma entrada nova que ninguém classificou', () => {
    const comIntruso = [...entradasDePrimeiroNivel(), 'naoClassificado']
    expect(naoClassificadas(comIntruso, excluidos)).toEqual(['naoClassificado'])
  })
})

describe('release-please: workflow (bloco 45)', () => {
  const workflow = ler('.github/workflows/release-please.yml')

  it('só roda no repositório Andred21/lotus', () => {
    expect(workflow).toContain("github.repository == 'Andred21/lotus'")
  })

  it('usa a action v4 com o secret RELEASE_PLEASE_TOKEN, nunca com o GITHUB_TOKEN', () => {
    expect(workflow).toContain('googleapis/release-please-action@v4')
    expect(workflow).toContain('secrets.RELEASE_PLEASE_TOKEN')
    expect(workflow).not.toContain('GITHUB_TOKEN')
  })

  it('dispara só em push na main', () => {
    const on = workflow.match(/^on:\n((?: {2,}.*\n|\n)+)/m)?.[1] ?? ''
    expect(on).toMatch(/^ {2}push:/m)
    expect(on).toMatch(/branches:\s*\[\s*main\s*\]|branches:\n\s+- main/)
    expect(on).not.toMatch(/pull_request|workflow_dispatch|schedule/)
  })
})
