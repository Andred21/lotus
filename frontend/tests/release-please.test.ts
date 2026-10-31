import { describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const raiz = resolve(__dirname, '..', '..')
const ler = (caminho: string) => readFileSync(resolve(raiz, caminho), 'utf8')

// Bloco 45: o release-please só dispara bump por commit que toca caminho de PRODUTO. O que sobra
// na raiz precisa de classificação explícita, para que uma entrada nova não vire bump (ou deixe de
// virar) sem ninguém decidir. O `exclude-paths` do release-please casa só prefixo de DIRETÓRIO
// (`file.indexOf(path + '/') === 0`): arquivo solto listado ali não tem efeito. Por isso
//   - diretório fora de produto  -> `exclude-paths` (garantido pela ferramenta);
//   - arquivo solto da raiz      -> INERTES_POR_CONVENCAO (garantido só pela regra de tipo de commit).
const PRODUTO = ['backend', 'frontend', 'docker', 'deploy', '.github']

// Spec E3: arquivo solto da raiz não é excluído pelo release-please. Commit que toque só estes usa
// `docs`, `chore` ou `cicd` (regra escrita no CONTRIBUINDO.md); um `feat`/`fix` neles geraria versão.
const INERTES_POR_CONVENCAO = [
  'INSTRUÇÕES-DO-PROJETO.md',
  '.dockerignore',
  '.editorconfig',
  '.env.example',
  '.espelho-exclusoes',
  '.gitignore',
  'AGENTS.md',
  'CLAUDE.md',
  'CONTRIBUINDO.md',
  'DESIGN.md',
  'PRODUCT.md',
  'README.md',
  'docker-compose.prod-probe.yml',
  'docker-compose.prod-tls.yml',
  'docker-compose.prod.yml',
  'docker-compose.yml',
  // nascem em tasks paralelas do bloco e podem ainda não estar no índice do git
  'LICENSE',
  'CHANGELOG.md',
  'version.txt',
  '.release-please-manifest.json',
  'release-please-config.json',
]

type Entrada = { nome: string; diretorio: boolean }

const semBarraFinal = (caminho: string) => caminho.replace(/\/+$/, '')

// Retorna as entradas de primeiro nível sem classificação válida: diretório precisa estar em
// PRODUTO ou em exclude-paths; arquivo, em PRODUTO ou em INERTES_POR_CONVENCAO.
function naoClassificadas(entradas: Entrada[], excluidos: string[]): string[] {
  const dirsExcluidos = new Set(excluidos.map(semBarraFinal))
  const inertes = new Set(INERTES_POR_CONVENCAO)
  return entradas
    .filter(({ nome, diretorio }) => {
      if (PRODUTO.includes(nome)) return false
      return diretorio ? !dirsExcluidos.has(nome) : !inertes.has(nome)
    })
    .map(({ nome }) => nome)
}

// Retorna as entradas do `exclude-paths` que não teriam efeito: arquivo solto rastreado ou arquivo
// inerte por convenção. Entrada AUSENTE da árvore não reprova: no espelho (Gatika-CL) `.agents`,
// `.claude`, `docs` etc. não existem, porque estão no `.espelho-exclusoes`, e o `exclude-paths`
// continua listando-os. A catraca precisa passar nas duas árvores.
function excluidosSemEfeito(entradas: Entrada[], excluidos: string[]): string[] {
  const arquivos = new Set(entradas.filter((e) => !e.diretorio).map((e) => e.nome))
  const inertes = new Set(INERTES_POR_CONVENCAO)
  return excluidos.map(semBarraFinal).filter((e) => arquivos.has(e) || inertes.has(e))
}

function entradasDePrimeiroNivel(): Entrada[] {
  // `-z` evita o escape octal que o git aplica a "INSTRUÇÕES-DO-PROJETO.md" (acentos).
  const arquivos = execFileSync('git', ['ls-files', '-z'], { cwd: raiz, encoding: 'utf8' })
    .split('\0')
    .filter(Boolean)
  // Diretório = algum arquivo tem `entrada/` como prefixo; sem barra, é arquivo solto.
  const mapa = new Map<string, boolean>()
  for (const arquivo of arquivos) {
    const [primeiro, ...resto] = arquivo.split('/')
    mapa.set(primeiro, (mapa.get(primeiro) ?? false) || resto.length > 0)
  }
  // Entradas que nascem em tasks paralelas do bloco e podem ainda não estar no índice (arquivos).
  for (const extra of INERTES_POR_CONVENCAO) if (!mapa.has(extra)) mapa.set(extra, false)
  return [...mapa].map(([nome, diretorio]) => ({ nome, diretorio }))
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

  it('toda entrada de primeiro nível é produto, diretório em exclude-paths ou arquivo inerte por convenção', () => {
    expect(naoClassificadas(entradasDePrimeiroNivel(), excluidos)).toEqual([])
  })

  it('nenhum caminho de produto está em exclude-paths', () => {
    const excluidosSemBarra = excluidos.map(semBarraFinal)
    for (const produto of PRODUTO) {
      expect(excluidosSemBarra, produto).not.toContain(produto)
    }
  })

  it('exclude-paths só tem diretório: arquivo listado ali não teria efeito no release-please', () => {
    expect(excluidosSemEfeito(entradasDePrimeiroNivel(), excluidos)).toEqual([])
  })

  it('exclude-paths não reprova entrada ausente da árvore (espelho sem .claude, docs etc.)', () => {
    const semAusente = entradasDePrimeiroNivel().filter((e) => e.nome !== 'docs')
    expect(semAusente.some((e) => e.nome === 'docs')).toBe(false)
    expect(excluidosSemEfeito(semAusente, [...excluidos, 'docs'])).toEqual([])
  })

  it('reprova arquivo solto rastreado listado no exclude-paths', () => {
    const comArquivo = [...entradasDePrimeiroNivel(), { nome: 'solto.md', diretorio: false }]
    expect(excluidosSemEfeito(comArquivo, [...excluidos, 'solto.md'])).toEqual(['solto.md'])
  })

  it('reprova arquivo inerte por convenção listado no exclude-paths, mesmo fora do índice', () => {
    const semLicense = entradasDePrimeiroNivel().filter((e) => e.nome !== 'LICENSE')
    expect(excluidosSemEfeito(semLicense, [...excluidos, 'LICENSE'])).toEqual(['LICENSE'])
  })

  it('arquivo inerte por convenção não é diretório do repositório', () => {
    const diretorios = entradasDePrimeiroNivel()
      .filter((e) => e.diretorio)
      .map((e) => e.nome)
    expect(INERTES_POR_CONVENCAO.filter((e) => diretorios.includes(e))).toEqual([])
  })

  it('reprova um diretório novo que ninguém classificou', () => {
    const comIntruso = [...entradasDePrimeiroNivel(), { nome: 'naoClassificado', diretorio: true }]
    expect(naoClassificadas(comIntruso, excluidos)).toEqual(['naoClassificado'])
  })

  it('reprova um arquivo solto novo que ninguém classificou', () => {
    const comIntruso = [...entradasDePrimeiroNivel(), { nome: 'novo-arquivo.md', diretorio: false }]
    expect(naoClassificadas(comIntruso, excluidos)).toEqual(['novo-arquivo.md'])
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

  it('o GITHUB_TOKEN só lê o conteúdo: quem escreve é o PAT da action', () => {
    const permissoes = workflow.match(/^permissions:\n((?: {2,}.*\n)+)/m)?.[1] ?? ''
    expect(permissoes).toMatch(/^ {2}contents: read$/m)
    expect(permissoes).not.toMatch(/write/)
  })

  it('dispara só em push na main', () => {
    const on = workflow.match(/^on:\n((?: {2,}.*\n|\n)+)/m)?.[1] ?? ''
    expect(on).toMatch(/^ {2}push:/m)
    expect(on).toMatch(/branches:\s*\[\s*main\s*\]|branches:\n\s+- main/)
    expect(on).not.toMatch(/pull_request|workflow_dispatch|schedule/)
  })
})
