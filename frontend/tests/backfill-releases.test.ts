import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { execFileSync, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

/**
 * `scripts/backfill-releases.sh` cria, uma vez, as tags anotadas e as Releases
 * das 13 versões desde o go-live (bloco 45, spec §4.4) e o `CHANGELOG.md`
 * inicial. Quem roda a escrita é o João; o que esta catraca guarda é o que não
 * pode falhar em silêncio: escrever tag com versão que D2 não sustenta (Review
 * 5), calcular bump sobre histórico raso (Review 4), tagar um SHA que não foi o
 * promovido, ou escrever pela metade.
 *
 * Por EXECUÇÃO (lição 19): cada caso roda o script num repositório git
 * sintético (commits `feat`/`fix`/`docs`/`refactor` em caminhos de produto e
 * fora deles, mais um remoto `upstream` com o trailer `Source-Commit`) com o
 * `gh` falso de fixtures/backfill-releases/.
 */
const RAIZ = resolve(__dirname, '..', '..')
const CAMINHO = join(RAIZ, 'scripts', 'backfill-releases.sh')
const TABELA_REAL = join(RAIZ, 'scripts', 'backfill-releases.tsv')
const FAKES = join(__dirname, 'fixtures', 'backfill-releases')

const ORIGEM = 'Andred21/lotus'
const ESPELHO = 'Gatika-CL/lotus'
const IDENT = { GIT_AUTHOR_NAME: 'Autor', GIT_AUTHOR_EMAIL: 'autor@example.com', GIT_COMMITTER_NAME: 'Autor', GIT_COMMITTER_EMAIL: 'autor@example.com' }

let base: string
let contador = 0
let trabalho: string
let linhas: Linha[] // 1.0.0@A, 1.0.1@D, 1.1.0@F, 2.0.0@G
let todos: Record<string, string> // nome do commit -> sha de origem
let espelhos: Record<string, string> // nome do commit -> sha do commit espelho

type Linha = { versao: string; data: string; origem: string; espelho: string }

const git = (cwd: string, ...args: string[]) =>
  execFileSync('git', args, { cwd, encoding: 'utf8', env: { ...process.env, ...IDENT, GIT_CONFIG_GLOBAL: '/dev/null' } }).trim()

let seq = 0
const commitar = (cwd: string, arquivo: string, mensagem: string): string => {
  const destino = join(cwd, arquivo)
  mkdirSync(join(destino, '..'), { recursive: true })
  seq += 1
  writeFileSync(destino, `${mensagem}\n${seq}\n`)
  git(cwd, 'add', arquivo)
  git(cwd, 'commit', '-q', '-m', mensagem)
  return git(cwd, 'rev-parse', 'HEAD')
}

const tsv = (rows: Linha[]) => rows.map((l) => [l.versao, l.data, l.origem, l.espelho].join('\t')).join('\n') + '\n'
const curto = (sha: string) => sha.slice(0, 7)

beforeAll(() => {
  base = mkdtempSync(join(tmpdir(), 'backfill-releases-'))
  trabalho = join(base, 'trabalho')
  mkdirSync(trabalho)
  git(trabalho, 'init', '-q', '-b', 'main')
  git(trabalho, 'config', 'user.name', 'Teste Backfill')
  git(trabalho, 'config', 'user.email', 'teste@example.com')
  todos = {}
  todos.A = commitar(trabalho, 'frontend/a.txt', 'feat: go-live')
  todos.B = commitar(trabalho, 'docs/z.md', 'docs: z')
  // tipo que sobe versão, mas em caminho que não é de produto: não conta (D2)
  todos.H = commitar(trabalho, '.claude/h.md', 'feat: ferramenta do harness')
  todos.C = commitar(trabalho, 'backend/w.txt', 'refactor: w')
  todos.D = commitar(trabalho, 'backend/y.txt', 'fix(api): y')
  todos.E = commitar(trabalho, 'frontend/x.txt', 'feat(ui): x')
  todos.F = commitar(trabalho, 'backend/y2.txt', 'fix: y2')
  todos.G = commitar(trabalho, 'backend/g.txt', 'feat!: troca')

  // O espelho: um commit por promoção, com o trailer que o espelhar-corporativo.sh grava.
  // o caminho carrega o nome do espelho: o script confere que a URL do `upstream` o contém
  const espelho = join(base, ESPELHO)
  mkdirSync(espelho, { recursive: true })
  git(espelho, 'init', '-q', '-b', 'main')
  espelhos = {}
  for (const nome of ['A', 'D', 'F', 'G']) {
    espelhos[nome] = commitar(espelho, `app/${nome}.txt`, `Espelho de ${nome}\n\nSource-Commit: ${todos[nome]}`)
  }
  // um commit espelho cujo trailer aponta para outra origem
  espelhos.X = commitar(espelho, 'app/X.txt', `Espelho de outro\n\nSource-Commit: ${'9'.repeat(40)}`)
  git(trabalho, 'remote', 'add', 'upstream', espelho)

  linhas = [
    { versao: '1.0.0', data: '2026-09-26', origem: todos.A, espelho: espelhos.A },
    { versao: '1.0.1', data: '2026-09-27', origem: todos.D, espelho: espelhos.D },
    { versao: '1.1.0', data: '2026-09-28', origem: todos.F, espelho: espelhos.F },
    { versao: '2.0.0', data: '2026-09-29', origem: todos.G, espelho: espelhos.G },
  ]
})

afterAll(() => {
  rmSync(base, { recursive: true, force: true })
})

type Caso = {
  tabela?: Linha[]
  cwd?: string
  runs?: string[] | null // SHAs que aparecem nos logs das execuções; null = nenhuma execução
  estado?: string[] // fatos que já existem no remoto (ver o gh falso)
  env?: Record<string, string>
}
type Execucao = {
  status: number | null
  stdout: string
  stderr: string
  chamadas: string[][]
  notas: Record<string, string>
  dir: string
}

const rodar = (args: string[], caso: Caso = {}): Execucao => {
  contador += 1
  const dir = join(base, `caso-${contador}`)
  const runs = join(dir, 'runs')
  mkdirSync(runs, { recursive: true })
  const tabela = join(dir, 'tabela.tsv')
  writeFileSync(tabela, tsv(caso.tabela ?? linhas))
  const shas = caso.runs === undefined ? (caso.tabela ?? linhas).map((l) => l.espelho) : (caso.runs ?? [])
  // uma execução fora da tabela (outro SHA promovido) para o filtro não casar tudo
  ;[...shas, 'e'.repeat(40)].forEach((sha, i) => {
    writeFileSync(join(runs, `${100 + i}.log`), `deploy\tPromover\t2026-10-31T00:00:00Z   SHA: ${sha}\ndeploy\tPromover\t2026-10-31T00:00:00Z   CONFIRMAR: sim\n`)
  })
  const log = join(dir, 'chamadas.log')
  writeFileSync(log, '')
  const estado = join(dir, 'estado')
  writeFileSync(estado, (caso.estado ?? []).join('\n') + '\n')
  const notas = join(dir, 'notas')
  const r = spawnSync('bash', [CAMINHO, ...args], {
    cwd: caso.cwd ?? trabalho,
    env: {
      ...process.env,
      ...IDENT,
      GIT_CONFIG_GLOBAL: '/dev/null',
      LOTUS_BACKFILL_TABELA: tabela,
      FAKE_LOG: log,
      FAKE_RUNS: runs,
      FAKE_ESTADO: estado,
      FAKE_NOTAS: notas,
      ...caso.env,
      PATH: `${FAKES}:${process.env.PATH ?? ''}`,
    },
    encoding: 'utf8',
  })
  const chamadas = readFileSync(log, 'utf8')
    .split('---\n')
    .filter(Boolean)
    .map((bloco) => bloco.split('\n').filter(Boolean))
  const gravadas: Record<string, string> = {}
  if (existsSync(notas)) for (const f of readdirSync(notas)) gravadas[f] = readFileSync(join(notas, f), 'utf8')
  return { status: r.status, stdout: r.stdout, stderr: r.stderr, chamadas, notas: gravadas, dir }
}

/** Chamadas que escrevem no remoto: POST de tag/ref e `release create`. */
const escritas = (e: Execucao) =>
  e.chamadas.filter(
    (c) => (c[0] === 'api' && /\/git\/(tags|refs)$/.test(c[1])) || (c[0] === 'release' && c[1] === 'create'),
  )
const campo = (chamada: string[], chave: string) =>
  chamada.find((a) => a.startsWith(`${chave}=`))?.slice(chave.length + 1)
const repoDe = (chamada: string[]) =>
  chamada[0] === 'api' ? chamada[1].replace(/^repos\//, '').replace(/\/git\/.*$/, '') : chamada[chamada.indexOf('--repo') + 1]
const cabecalhos = (e: Execucao) => e.stdout.split('\n').filter((l) => /^v\d/.test(l))
/** Trecho do stdout entre o cabeçalho de uma versão e o da seguinte. */
const secao = (e: Execucao, versao: string) => {
  const ls = e.stdout.split('\n')
  const i = ls.findIndex((l) => l.startsWith(`v${versao}  `))
  const resto = ls.slice(i + 1)
  const fim = resto.findIndex((l) => /^v\d/.test(l))
  return (fim === -1 ? resto : resto.slice(0, fim)).join('\n').trim()
}
const objetoDe = (repo: string, tag: string) => createHash('sha1').update(`${repo} ${tag}`).digest('hex')

describe('scripts/backfill-releases — forma e tabela real', () => {
  it('o script e o gh falso são executáveis e a sintaxe do bash é válida', () => {
    expect(statSync(CAMINHO).mode & 0o111).not.toBe(0)
    expect(statSync(join(FAKES, 'gh')).mode & 0o111).not.toBe(0)
    expect(spawnSync('bash', ['-n', CAMINHO], { encoding: 'utf8' }).status).toBe(0)
  })

  it('a tabela real tem as 13 versões do §4.4, em ordem, com SHAs de 40 hexadecimais', () => {
    const rows = readFileSync(TABELA_REAL, 'utf8')
      .split('\n')
      .filter((l) => l.trim() && !l.startsWith('#'))
      .map((l) => l.split('\t'))
    expect(rows.map((r) => r[0])).toEqual([
      '1.0.0', '1.0.1', '1.1.0', '1.2.0', '1.3.0', '1.4.0', '1.4.1', '1.5.0', '1.6.0', '1.7.0', '1.8.0', '1.9.0', '1.9.1',
    ])
    for (const r of rows) {
      expect(r, r[0]).toHaveLength(4)
      expect(r[1], r[0]).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(r[2], r[0]).toMatch(/^[0-9a-f]{40}$/)
      expect(r[3], r[0]).toMatch(/^[0-9a-f]{40}$/)
    }
    expect(rows[0].slice(1)).toEqual(['2026-09-26', 'ffe092cdfcec2a4be6c114b61313b47203cb1ce5', 'fa5f023aadd22e2e3aa20abf0f561b4fcafa762f'])
    expect(rows[12].slice(1)).toEqual(['2026-10-31', '5fba081d7bff45e4ad4b930d49957f6c91f47978', '935145f5394ed9aa3ba389222591ede703353bca'])
  })

  it('a última versão da tabela é a que está em version.txt', () => {
    const ultima = readFileSync(TABELA_REAL, 'utf8').trim().split('\n').at(-1)!.split('\t')[0]
    expect(ultima).toBe(readFileSync(join(RAIZ, 'version.txt'), 'utf8').trim())
  })

  it('é ferramenta de desenvolvimento: o script e a tabela não atravessam para o espelho', () => {
    const linhasEx = readFileSync(join(RAIZ, '.espelho-exclusoes'), 'utf8').split('\n')
    expect(linhasEx).toContain('scripts/backfill-releases.sh')
    expect(linhasEx).toContain('scripts/backfill-releases.tsv')
    // o teste e a fixture exercitam um script que não atravessa: no espelho reprovariam por acerto
    expect(linhasEx).toContain('frontend/tests/backfill-releases.test.ts')
    expect(linhasEx).toContain('frontend/tests/fixtures/backfill-releases/')
  })
})

describe('scripts/backfill-releases --simular', () => {
  it('imprime uma linha por versão, sem chamar o gh nem escrever nada', () => {
    const e = rodar(['--simular'])
    expect(e.status, e.stderr).toBe(0)
    expect(cabecalhos(e)).toEqual(
      linhas.map((l) => `v${l.versao}  ${l.data}  ${curto(l.origem)}  ${curto(l.espelho)}`),
    )
    expect(e.chamadas).toEqual([])
  })

  it('a 1.0.0 traz só a nota do go-live', () => {
    const e = rodar(['--simular'])
    expect(secao(e, '1.0.0')).toBe('Primeira versão em produção (go-live).')
  })

  it('as notas agrupam feat em Funcionalidades e fix em Correções, só de caminho de produto', () => {
    const e = rodar(['--simular'])
    expect(secao(e, '1.0.1')).toBe(`### Correções\n\n* **api:** y (${curto(todos.D)})`)
    expect(secao(e, '1.1.0')).toBe(
      `### Funcionalidades\n\n* **ui:** x (${curto(todos.E)})\n\n### Correções\n\n* y2 (${curto(todos.F)})`,
    )
    expect(secao(e, '2.0.0')).toBe(`### Funcionalidades\n\n* troca (${curto(todos.G)})`)
    // docs, refactor e o feat que só tocou o harness nunca entram
    expect(e.stdout).not.toContain('harness')
    expect(e.stdout).not.toContain('refactor')
    expect(e.stdout).not.toContain(' z ')
  })

  it('Review 5: só docs/refactor entre duas linhas com bump na tabela para com exit 1 citando a linha', () => {
    const [a] = linhas
    const c = { versao: '1.1.0', data: '2026-09-28', origem: todos.C, espelho: espelhos.F }
    const e = rodar(['--simular', '--changelog', join(base, 'nao-sai.md')], { tabela: [a, c] })
    expect(e.status).toBe(1)
    expect(e.stderr).toMatch(/linha 2/)
    expect(e.stderr).toContain('v1.1.0')
    expect(e.stderr).toMatch(/nenhum/)
    expect(e.stderr).toContain('minor')
    expect(e.stdout).toBe('')
    expect(existsSync(join(base, 'nao-sai.md'))).toBe(false)
  })

  it('bump calculado maior que o da tabela também para: feat numa linha de PATCH', () => {
    const [a, , f] = linhas
    const e = rodar(['--simular'], { tabela: [a, { ...f, versao: '1.0.1' }] })
    expect(e.status).toBe(1)
    expect(e.stderr).toContain('v1.0.1')
    expect(e.stderr).toContain('minor')
    expect(e.stderr).toContain('patch')
    // cita os commits que causaram a divergência
    expect(e.stderr).toContain(curto(todos.E))
  })

  it('Review 5 também na escrita: bump divergente sem --simular para com exit 1 e nenhuma escrita', () => {
    const [a, , f] = linhas
    const e = rodar([], { tabela: [a, { ...f, versao: '1.0.1' }] })
    expect(e.status).toBe(1)
    expect(e.stderr).toContain('v1.0.1')
    expect(escritas(e)).toEqual([])
    expect(e.chamadas).toEqual([])
  })

  it('Review 4 também na escrita: clone raso sem --simular para com exit 1 e nenhuma escrita', () => {
    const raso = join(base, `raso-escrita-${contador}`)
    execFileSync('git', ['clone', '-q', '--depth', '1', `file://${trabalho}`, raso])
    const e = rodar([], { cwd: raso })
    expect(e.status).toBe(1)
    expect(e.stderr).toContain('clone raso')
    expect(escritas(e)).toEqual([])
    expect(e.chamadas).toEqual([])
  })

  it('Review 4: clone raso é recusado, sem calcular bump', () => {
    const raso = join(base, `raso-${contador}`)
    execFileSync('git', ['clone', '-q', '--depth', '1', `file://${trabalho}`, raso])
    expect(git(raso, 'rev-parse', '--is-shallow-repository')).toBe('true')
    const e = rodar(['--simular'], { cwd: raso })
    expect(e.status).toBe(1)
    expect(e.stderr).toContain('clone raso')
    expect(e.stdout).toBe('')
  })

  it('SHA de origem que não existe no repositório para com exit 1', () => {
    const [a, d] = linhas
    const e = rodar(['--simular'], { tabela: [a, { ...d, origem: '7'.repeat(40) }] })
    expect(e.status).toBe(1)
    expect(e.stderr).toContain('7'.repeat(7))
  })

  it('flag desconhecida é erro de uso', () => {
    const e = rodar(['--simulr'])
    expect(e.status).toBe(2)
  })
})

describe('scripts/backfill-releases --changelog', () => {
  it('grava o CHANGELOG no formato do release-please, versão mais nova primeiro', () => {
    const arquivo = join(base, 'CHANGELOG-saida.md')
    const e = rodar(['--simular', '--changelog', arquivo])
    expect(e.status, e.stderr).toBe(0)
    const conteudo = readFileSync(arquivo, 'utf8')
    expect(conteudo.startsWith('# Changelog\n\n')).toBe(true)
    const titulos = conteudo.split('\n').filter((l) => l.startsWith('## '))
    expect(titulos).toEqual([
      '## [2.0.0](https://github.com/Andred21/lotus/compare/v1.1.0...v2.0.0) (2026-09-29)',
      '## [1.1.0](https://github.com/Andred21/lotus/compare/v1.0.1...v1.1.0) (2026-09-28)',
      '## [1.0.1](https://github.com/Andred21/lotus/compare/v1.0.0...v1.0.1) (2026-09-27)',
      '## [1.0.0](https://github.com/Andred21/lotus/releases/tag/v1.0.0) (2026-09-26)',
    ])
    expect(conteudo).toContain(
      `## [1.1.0](https://github.com/Andred21/lotus/compare/v1.0.1...v1.1.0) (2026-09-28)\n\n### Funcionalidades\n\n* **ui:** x (${curto(todos.E)})\n\n### Correções\n\n* y2 (${curto(todos.F)})\n\n`,
    )
    expect(conteudo).toContain('(2026-09-26)\n\nPrimeira versão em produção (go-live).\n')
    expect(conteudo.endsWith('\n')).toBe(true)
  })

  it('a seção de cada versão é a que o publicar-release.sh lê (mesmas notas do --simular)', () => {
    const arquivo = join(base, 'CHANGELOG-awk.md')
    const e = rodar(['--simular', '--changelog', arquivo])
    for (const v of ['1.0.0', '1.0.1', '1.1.0', '2.0.0']) {
      const lido = execFileSync(
        'bash',
        [
          '-c',
          `awk -v v="${v}" '/^## /{ if (dentro) exit; if (index($0,"## [" v "]")==1) dentro=1; next } dentro{ print }' "$1" | sed -e '/./,$!d'`,
          '_',
          arquivo,
        ],
        { encoding: 'utf8' },
      ).trim()
      expect(lido, v).toBe(secao(e, v))
    }
  })
})

describe('scripts/backfill-releases — escrita (sem --simular)', () => {
  it('upstream que não aponta para o espelho: exit 1, nenhuma escrita', () => {
    const outro = join(base, `outro-remoto-${contador}`)
    execFileSync('git', ['clone', '-q', `file://${trabalho}`, outro])
    git(outro, 'config', 'user.name', 'Teste Backfill')
    git(outro, 'config', 'user.email', 'teste@example.com')
    git(outro, 'remote', 'add', 'upstream', join(base, 'Outra-Org', 'lotus'))
    const e = rodar([], { cwd: outro })
    expect(e.status).toBe(1)
    expect(e.stderr).toContain('upstream')
    expect(e.stderr).toContain(ESPELHO)
    expect(escritas(e)).toEqual([])
    expect(e.chamadas).toEqual([])
  })

  it('o espelho vem de LOTUS_BACKFILL_ESPELHO: upstream que o contém passa, e as releases vão para ele', () => {
    const e = rodar([], { env: { LOTUS_BACKFILL_ESPELHO: ESPELHO } })
    expect(e.status, e.stderr).toBe(0)
    expect(escritas(e).some((c) => repoDe(c) === ESPELHO)).toBe(true)
  })

  it('Source-Commit do espelho diferente da origem da tabela: exit 1, nenhuma escrita', () => {
    const tabela = linhas.map((l) => (l.versao === '1.1.0' ? { ...l, espelho: espelhos.X } : l))
    const e = rodar([], { tabela })
    expect(e.status).toBe(1)
    expect(e.stderr).toContain('Source-Commit')
    expect(e.stderr).toContain('v1.1.0')
    expect(escritas(e)).toEqual([])
  })

  it('SHA do espelho que não consta no log de nenhuma execução do deploy.yml: exit 1, nenhuma escrita', () => {
    const e = rodar([], { runs: [espelhos.A, espelhos.D, espelhos.G] }) // falta o da 1.1.0
    expect(e.status).toBe(1)
    expect(e.stderr).toContain('deploy.yml')
    expect(e.stderr).toContain('v1.1.0')
    expect(escritas(e)).toEqual([])
  })

  it('sem nenhuma execução no log: exit 1, nenhuma escrita', () => {
    const e = rodar([], { runs: null })
    expect(e.status).toBe(1)
    expect(escritas(e)).toEqual([])
  })

  it('tag que já existe em outro SHA: exit 1 antes de qualquer escrita', () => {
    const e = rodar([], { estado: [`tag ${ESPELHO} v1.0.1 commit ${'d'.repeat(40)}`] })
    expect(e.status).toBe(1)
    expect(e.stderr).toContain('v1.0.1')
    expect(e.stderr).toContain(ESPELHO)
    expect(escritas(e)).toEqual([])
  })

  it('caminho feliz: tag anotada com a data da promoção e release nos dois repositórios', () => {
    const e = rodar([])
    expect(e.status, e.stderr).toBe(0)
    expect(escritas(e)).toHaveLength(linhas.length * 2 * 3)

    for (const [repo, sha] of [
      [ORIGEM, (l: Linha) => l.origem],
      [ESPELHO, (l: Linha) => l.espelho],
    ] as const) {
      for (const l of linhas) {
        const tag = `v${l.versao}`
        const doRepo = escritas(e).filter((c) => repoDe(c) === repo && (campo(c, 'tag') === tag || campo(c, 'ref') === `refs/tags/${tag}` || c[2] === tag))
        expect(doRepo, `${repo} ${tag}`).toHaveLength(3)
        const [objeto, ref, release] = doRepo
        expect(objeto[1]).toBe(`repos/${repo}/git/tags`)
        expect(campo(objeto, 'object')).toBe(sha(l))
        expect(campo(objeto, 'type')).toBe('commit')
        expect(campo(objeto, 'message')).toBe(`Release ${tag}`)
        expect(campo(objeto, 'tagger[date]')).toBe(`${l.data}T12:00:00Z`)
        expect(campo(objeto, 'tagger[name]')).toBe('Teste Backfill')
        expect(campo(objeto, 'tagger[email]')).toBe('teste@example.com')
        expect(ref[1]).toBe(`repos/${repo}/git/refs`)
        expect(campo(ref, 'ref')).toBe(`refs/tags/${tag}`)
        expect(campo(ref, 'sha')).toBe(objetoDe(repo, tag)) // o objeto de tag, não o commit: é isso que a torna anotada
        expect(release.slice(0, 3)).toEqual(['release', 'create', tag])
        expect(release).toContain('--verify-tag')
        expect(release).toContain(l.versao === '2.0.0' ? '--latest' : '--latest=false')
      }
    }
  })

  it('as notas das Releases são as mesmas do --simular, nos dois repositórios', () => {
    const sim = rodar(['--simular'])
    const e = rodar([])
    for (const l of linhas) {
      for (const repo of ['Andred21_lotus', 'Gatika-CL_lotus']) {
        expect(e.notas[`${repo}__v${l.versao}`], `${repo} v${l.versao}`).toBe(`${secao(sim, l.versao)}\n`)
      }
    }
  })

  it('tag existente no mesmo SHA é pulada (anotada ou leve), e a release já publicada também', () => {
    const [a, d] = linhas
    const e = rodar([], {
      estado: [
        `tag ${ORIGEM} v1.0.0 commit ${a.origem}`, // leve, no SHA certo
        `tag ${ESPELHO} v1.0.1 tag ${'c'.repeat(40)}`, // anotada: o ref guarda o objeto de tag
        `obj ${'c'.repeat(40)} ${d.espelho}`,
        `release ${ORIGEM} v1.0.0`,
      ],
    })
    expect(e.status, e.stderr).toBe(0)
    const w = escritas(e)
    const tocou = (repo: string, tag: string) =>
      w.filter((c) => repoDe(c) === repo && (campo(c, 'tag') === tag || campo(c, 'ref') === `refs/tags/${tag}`))
    expect(tocou(ORIGEM, 'v1.0.0')).toEqual([])
    expect(tocou(ESPELHO, 'v1.0.1')).toEqual([])
    // a release de uma tag pulada que ainda não existia é criada; a que já existia, não
    const releases = w.filter((c) => c[0] === 'release').map((c) => `${repoDe(c)} ${c[2]}`)
    expect(releases).not.toContain(`${ORIGEM} v1.0.0`)
    expect(releases).toContain(`${ESPELHO} v1.0.1`)
    // o resto segue normal
    expect(tocou(ORIGEM, 'v1.0.1')).toHaveLength(2)
    expect(tocou(ESPELHO, 'v2.0.0')).toHaveLength(2)
  })

  it('rodar duas vezes não escreve nada na segunda (tudo já existe)', () => {
    const estado = linhas.flatMap((l) => [
      `tag ${ORIGEM} v${l.versao} commit ${l.origem}`,
      `tag ${ESPELHO} v${l.versao} commit ${l.espelho}`,
      `release ${ORIGEM} v${l.versao}`,
      `release ${ESPELHO} v${l.versao}`,
    ])
    const e = rodar([], { estado })
    expect(e.status, e.stderr).toBe(0)
    expect(escritas(e)).toEqual([])
  })
})
