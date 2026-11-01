import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

/**
 * `.github/scripts/publicar-release.sh` roda no fim do deploy.yml, depois que o
 * SHA já está promovido, e publica a tag `vX.Y.Z` (anotada) e a release da
 * versão (bloco 45). A produção já subiu quando ele roda: ele nunca pode
 * reprovar a promoção (sai sempre 0) e nunca pode reescrever uma tag que já
 * existe. As falhas que importam são silenciosas: mover a tag de uma versão já
 * publicada para outro SHA, criar a tag leve em vez da anotada, ou publicar
 * release sem as notas da versão.
 *
 * Por EXECUÇÃO (lição 19): cada caso roda o script com o `gh` falso de
 * fixtures/publicar-release/ e um diretório-alvo temporário com `version.txt` e
 * `CHANGELOG.md` no formato do release-please.
 */
const RAIZ = resolve(__dirname, '..', '..')
const CAMINHO = join(RAIZ, '.github', 'scripts', 'publicar-release.sh')
const FAKES = join(__dirname, 'fixtures', 'publicar-release')

const SHA = 'a'.repeat(40)
const OUTRO = 'b'.repeat(40)
const OBJETO_TAG = 'c'.repeat(40)
const NOVO_OBJETO = 'f'.repeat(40)
const REPO = 'Gatika-CL/lotus'

const CHANGELOG = `# Changelog

## [1.10.0](https://github.com/Andred21/lotus/compare/v1.9.1...v1.10.0) (2026-10-30)

### Funcionalidades

* versão do sistema exposta a usuário autenticado (acfe318)

### Correções

* certificado com a data certa (1ff7101)

## [1.9.1](https://github.com/Andred21/lotus/compare/v1.9.0...v1.9.1) (2026-10-01)

### Correções

* nota da versão anterior (0123456)
`
const NOTAS_1_10_0 = `### Funcionalidades

* versão do sistema exposta a usuário autenticado (acfe318)

### Correções

* certificado com a data certa (1ff7101)`

let base: string
let contador = 0

beforeAll(() => {
  base = mkdtempSync(join(tmpdir(), 'publicar-release-'))
})

afterAll(() => {
  rmSync(base, { recursive: true, force: true })
})

type Caso = {
  version?: string | null // null = sem version.txt
  changelog?: string | null // null = sem CHANGELOG.md
  env?: Record<string, string>
}
type Execucao = { status: number | null; stdout: string; stderr: string; chamadas: string[][]; notas: string | null }

const rodar = (caso: Caso = {}): Execucao => {
  contador += 1
  const dir = join(base, `caso-${contador}`)
  const alvo = join(dir, 'alvo')
  mkdirSync(alvo, { recursive: true })
  if (caso.version !== null) writeFileSync(join(alvo, 'version.txt'), caso.version ?? '1.10.0\n')
  if (caso.changelog !== null) writeFileSync(join(alvo, 'CHANGELOG.md'), caso.changelog ?? CHANGELOG)
  const log = join(dir, 'chamadas.log')
  writeFileSync(log, '')
  const notas = join(dir, 'notas')
  const r = spawnSync('bash', [CAMINHO, alvo], {
    env: {
      ...process.env,
      SHA,
      GITHUB_REPOSITORY: REPO,
      GH_TOKEN: 'falso',
      FAKE_LOG: log,
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
  let corpo: string | null = null
  try {
    corpo = readFileSync(notas, 'utf8')
  } catch {
    // o gh falso só grava as notas quando recebe `release create`
  }
  return { status: r.status, stdout: r.stdout, stderr: r.stderr, chamadas, notas: corpo }
}

/** Chamadas que escrevem: POST de tag/ref e `release create`. */
const escritas = (e: Execucao) =>
  e.chamadas.filter(
    (c) => (c[0] === 'api' && /\/git\/(tags|refs)$/.test(c[1])) || (c[0] === 'release' && c[1] === 'create'),
  )
const ultimaLinha = (e: Execucao) => e.stdout.trimEnd().split('\n').at(-1)
const avisos = (e: Execucao) => e.stdout.split('\n').filter((l) => l.startsWith('::warning::'))
/** Valor do argumento depois da flag, nas chamadas `api ... -f chave=valor`. */
const campo = (chamada: string[], chave: string) =>
  chamada.find((a) => a.startsWith(`${chave}=`))?.slice(chave.length + 1)

describe('.github/scripts/publicar-release.sh — forma', () => {
  it('é executável e o gh falso também', () => {
    expect(statSync(CAMINHO).mode & 0o111).not.toBe(0)
    expect(statSync(join(FAKES, 'gh')).mode & 0o111).not.toBe(0)
  })

  it('não usa set -e: cada falha vira aviso, não reprovação', () => {
    const fonte = readFileSync(CAMINHO, 'utf8')
    expect(fonte).toMatch(/^set -u$/m)
    expect(fonte).not.toMatch(/^set -[a-z]*e/m)
  })
})

describe('.github/scripts/publicar-release.sh — tag nova', () => {
  it('cria o objeto de tag anotada, o ref e a release com as notas da seção', () => {
    const e = rodar()
    expect(e.status, e.stderr).toBe(0)
    expect(ultimaLinha(e)).toBe('release: criada v1.10.0')
    expect(avisos(e)).toEqual([])

    const [objeto, ref, release] = escritas(e)
    expect(escritas(e)).toHaveLength(3)
    expect(objeto[1]).toBe(`repos/${REPO}/git/tags`)
    expect(campo(objeto, 'tag')).toBe('v1.10.0')
    expect(campo(objeto, 'object')).toBe(SHA)
    expect(campo(objeto, 'type')).toBe('commit')
    expect(campo(objeto, 'message')).toBeTruthy()

    expect(ref[1]).toBe(`repos/${REPO}/git/refs`)
    expect(campo(ref, 'ref')).toBe('refs/tags/v1.10.0')
    expect(campo(ref, 'sha')).toBe(NOVO_OBJETO) // o objeto de tag, não o commit: é isso que a torna anotada

    expect(release.slice(0, 3)).toEqual(['release', 'create', 'v1.10.0'])
    expect(release).toContain('--verify-tag')
    expect(release[release.indexOf('--repo') + 1]).toBe(REPO)
    expect(release[release.indexOf('--title') + 1]).toBe('v1.10.0')
    // as notas entram pelo stdin: `--notes-file -`, nunca um arquivo no disco do runner
    expect(release[release.indexOf('--notes-file') + 1]).toBe('-')
    expect(e.notas).toBe(`${NOTAS_1_10_0}\n`)
  })

  it('as notas são só a seção da versão: nada da seguinte nem do cabeçalho', () => {
    const e = rodar()
    expect(e.notas).not.toContain('## [')
    expect(e.notas).not.toContain('versão anterior')
    expect(e.notas).not.toContain('# Changelog')
  })

  it('a versão vem do version.txt do alvo, com espaço e quebra de linha aparados', () => {
    const e = rodar({ version: '  1.9.1 \n' })
    expect(ultimaLinha(e)).toBe('release: criada v1.9.1')
    expect(e.notas).toBe('### Correções\n\n* nota da versão anterior (0123456)\n')
  })

  it('o ponto da versão não vale curinga ao achar a seção', () => {
    const changelog = '# Changelog\n\n## [1x10y0](https://x) (2026-10-30)\n\n### Correções\n\n* nao e esta (1111111)\n'
    const e = rodar({ changelog })
    expect(e.notas).toBe('Notas em CHANGELOG.md.\n')
  })

  it('primeira seção sem link de comparação também é reconhecida', () => {
    const changelog = '# Changelog\n\n## 1.10.0 (2026-10-30)\n\n### Funcionalidades\n\n* primeira (2222222)\n'
    const e = rodar({ changelog })
    expect(avisos(e)).toEqual([])
    expect(e.notas).toBe('### Funcionalidades\n\n* primeira (2222222)\n')
  })
})

describe('.github/scripts/publicar-release.sh — tag que já existe', () => {
  it('repromoção: o ref aponta para objeto de tag cujo commit é o SHA, e nada é escrito', () => {
    const e = rodar({
      env: { FAKE_TAG_EXISTE: '1', FAKE_TAG_TIPO: 'tag', FAKE_TAG_OBJETO: OBJETO_TAG, FAKE_TAG_COMMIT: SHA },
    })
    expect(e.status, e.stderr).toBe(0)
    expect(ultimaLinha(e)).toBe('release: ja publicada v1.10.0')
    expect(escritas(e)).toEqual([])
    // desreferenciou o objeto de tag antes de comparar
    expect(e.chamadas.some((c) => c[1] === `repos/${REPO}/git/tags/${OBJETO_TAG}`)).toBe(true)
  })

  it('tag leve (type=commit) no mesmo SHA também é "ja publicada"', () => {
    const e = rodar({ env: { FAKE_TAG_EXISTE: '1', FAKE_TAG_TIPO: 'commit', FAKE_TAG_OBJETO: SHA } })
    expect(ultimaLinha(e)).toBe('release: ja publicada v1.10.0')
    expect(escritas(e)).toEqual([])
  })

  it('tag em outro SHA: avisa com os dois SHAs, não escreve e pula', () => {
    const e = rodar({
      env: { FAKE_TAG_EXISTE: '1', FAKE_TAG_TIPO: 'tag', FAKE_TAG_OBJETO: OBJETO_TAG, FAKE_TAG_COMMIT: OUTRO },
    })
    expect(e.status, e.stderr).toBe(0)
    expect(ultimaLinha(e)).toBe('release: pulada')
    expect(escritas(e)).toEqual([])
    const [aviso] = avisos(e)
    expect(avisos(e)).toHaveLength(1)
    expect(aviso).toContain(OUTRO)
    expect(aviso).toContain(SHA)
    expect(e.stdout.indexOf('::warning::')).toBeLessThan(e.stdout.indexOf('release: pulada'))
  })

  it('tag leve em outro SHA: mesmo tratamento', () => {
    const e = rodar({ env: { FAKE_TAG_EXISTE: '1', FAKE_TAG_TIPO: 'commit', FAKE_TAG_OBJETO: OUTRO } })
    expect(ultimaLinha(e)).toBe('release: pulada')
    expect(escritas(e)).toEqual([])
    expect(avisos(e)[0]).toContain(OUTRO)
  })

  it('falha ao ler o objeto da tag anotada: aviso, "release: pulada" e nenhuma escrita', () => {
    const e = rodar({
      env: { FAKE_TAG_EXISTE: '1', FAKE_TAG_TIPO: 'tag', FAKE_TAG_OBJETO: OBJETO_TAG, FAKE_FALHA: 'tagobj' },
    })
    expect(e.status, e.stderr).toBe(0)
    expect(ultimaLinha(e)).toBe('release: pulada')
    expect(escritas(e)).toEqual([])
    expect(avisos(e)).toHaveLength(1)
    expect(avisos(e)[0]).toContain(OBJETO_TAG)
    expect(e.chamadas.some((c) => c[1] === `repos/${REPO}/git/tags/${OBJETO_TAG}`)).toBe(true)
  })

  it('stderr do gh numa consulta que deu certo não entra no veredito (repromoção segue "ja publicada")', () => {
    const e = rodar({
      env: { FAKE_TAG_EXISTE: '1', FAKE_TAG_TIPO: 'tag', FAKE_TAG_OBJETO: OBJETO_TAG, FAKE_TAG_COMMIT: SHA, FAKE_RUIDO: '1' },
    })
    expect(e.status, e.stderr).toBe(0)
    expect(ultimaLinha(e)).toBe('release: ja publicada v1.10.0')
    expect(escritas(e)).toEqual([])
  })

  it('consulta da tag falhando por outra causa que não 404: não presume tag nova', () => {
    const e = rodar({ env: { FAKE_FALHA: 'lookup' } })
    expect(e.status, e.stderr).toBe(0)
    expect(ultimaLinha(e)).toBe('release: pulada')
    expect(escritas(e)).toEqual([])
    expect(avisos(e)).toHaveLength(1)
  })
})

describe('.github/scripts/publicar-release.sh — falhas nunca reprovam a promoção', () => {
  for (const etapa of ['tags', 'refs', 'release']) {
    it(`gh falhando em ${etapa}: aviso, exit 0 e "release: pulada"`, () => {
      const e = rodar({ env: { FAKE_FALHA: etapa } })
      expect(e.status, e.stderr).toBe(0)
      expect(ultimaLinha(e)).toBe('release: pulada')
      expect(avisos(e).length).toBeGreaterThan(0)
    })
  }

  it('falha ao criar o objeto de tag não segue para o ref nem para a release', () => {
    const e = rodar({ env: { FAKE_FALHA: 'tags' } })
    expect(escritas(e)).toHaveLength(1)
  })

  it('version.txt ausente no alvo: aviso, exit 0 e nenhuma chamada ao gh', () => {
    const e = rodar({ version: null })
    expect(e.status, e.stderr).toBe(0)
    expect(ultimaLinha(e)).toBe('release: pulada')
    expect(avisos(e)).toHaveLength(1)
    expect(e.chamadas).toEqual([])
  })

  it('version.txt que não é X.Y.Z: aviso, exit 0 e nenhuma chamada ao gh', () => {
    const e = rodar({ version: 'latest\n' })
    expect(e.status, e.stderr).toBe(0)
    expect(ultimaLinha(e)).toBe('release: pulada')
    expect(e.chamadas).toEqual([])
  })

  it('SHA ausente do ambiente: aviso, exit 0 e nenhuma chamada ao gh', () => {
    const e = rodar({ env: { SHA: '' } })
    expect(e.status, e.stderr).toBe(0)
    expect(ultimaLinha(e)).toBe('release: pulada')
    expect(e.chamadas).toEqual([])
  })

  it('sem argumento: aviso e exit 0, também', () => {
    const r = spawnSync('bash', [CAMINHO], { env: { ...process.env, SHA }, encoding: 'utf8' })
    expect(r.status).toBe(0)
    expect(r.stdout.trimEnd().split('\n').at(-1)).toBe('release: pulada')
  })
})

describe('.github/scripts/publicar-release.sh — seção ausente no CHANGELOG', () => {
  it('cria a release com a nota de reserva e avisa', () => {
    const e = rodar({ version: '2.0.0\n' })
    expect(e.status, e.stderr).toBe(0)
    expect(ultimaLinha(e)).toBe('release: criada v2.0.0')
    expect(avisos(e)).toHaveLength(1)
    expect(e.notas).toBe('Notas em CHANGELOG.md.\n')
  })

  it('CHANGELOG.md ausente: mesmo caminho', () => {
    const e = rodar({ changelog: null })
    expect(ultimaLinha(e)).toBe('release: criada v1.10.0')
    expect(avisos(e)).toHaveLength(1)
    expect(e.notas).toBe('Notas em CHANGELOG.md.\n')
  })

  it('seção presente mas vazia: mesmo caminho', () => {
    const e = rodar({ changelog: '# Changelog\n\n## [1.10.0](https://x) (2026-10-30)\n\n## [1.9.1](https://x) (2026-10-01)\n\n* a (1)\n' })
    expect(avisos(e)).toHaveLength(1)
    expect(e.notas).toBe('Notas em CHANGELOG.md.\n')
  })
})
