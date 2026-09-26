import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'

/**
 * `.github/scripts/conferir-alinhamento.sh` decide, no runner, se o host tem o
 * que o SHA alvo pressupõe (item 31, P-87). Runtime e chaves do `.env` contra
 * o SHA ALVO; scripts de `bin/` contra a MAIN — um rollback não pode exigir o
 * `deploy.sh` antigo de volta (D2 da spec).
 *
 * Por EXECUÇÃO, não por texto: a lição 19 já pagou três vezes a catraca que
 * guarda a palavra e deixa o `exit 1` virar aviso. Cada caso roda o script de
 * verdade sobre fixtures num diretório temporário.
 */
const RAIZ = resolve(__dirname, '..', '..')
const CAMINHO = join(RAIZ, '.github', 'scripts', 'conferir-alinhamento.sh')

let base: string
let alvo: string
let main: string
let contador = 0

const escrever = (caminho: string, conteudo: string) => {
  mkdirSync(dirname(caminho), { recursive: true })
  writeFileSync(caminho, conteudo)
}
const sha256 = (caminho: string) => createHash('sha256').update(readFileSync(caminho)).digest('hex')

beforeAll(() => {
  base = mkdtempSync(join(tmpdir(), 'conferir-alinhamento-'))
  alvo = join(base, 'alvo')
  main = join(base, 'main')
  escrever(join(alvo, 'docker-compose.prod.yml'), 'services: {app: {image: alvo}}\n')
  escrever(join(alvo, 'docker-compose.prod-tls.yml'), 'services: {nginx: {ports: ["443:443"]}}\n')
  escrever(join(alvo, 'deploy', 'nginx', 'tls.conf'), 'server { listen 443 ssl; }\n')
  escrever(
    join(alvo, 'deploy', 'aws', 'env.prod.example'),
    '# molde\nAPP_NAME=Lotus\nAPP_LOCALE=es\n# COMENTADA=nao-conta\n\nDB_HOST=<rds>\n',
  )
  // O deploy.sh do ALVO é o antigo: a referência de bin/ é a main, não ele.
  escrever(join(alvo, 'deploy', 'bin', 'deploy.sh'), '#!/bin/sh\necho antigo\n')
  escrever(join(main, 'docker-compose.prod.yml'), 'services: {app: {image: main}}\n')
  escrever(join(main, 'deploy', 'bin', 'deploy.sh'), '#!/bin/sh\necho novo\n')
  escrever(join(main, 'deploy', 'bin', 'backup-db.sh'), '#!/bin/sh\necho backup\n')
  escrever(join(main, 'deploy', 'bin', 'verificar-backup.sh'), '#!/bin/sh\necho verificar\n')
})

afterAll(() => {
  rmSync(base, { recursive: true, force: true })
})

/** A listagem de um host alinhado: runtime do alvo, bin/ da main, chaves do molde. */
const alinhada = (): string[] => [
  `${sha256(join(alvo, 'docker-compose.prod.yml'))}  docker-compose.prod.yml`,
  `${sha256(join(alvo, 'docker-compose.prod-tls.yml'))}  docker-compose.prod-tls.yml`,
  `${sha256(join(alvo, 'deploy', 'nginx', 'tls.conf'))}  nginx/tls.conf`,
  `${sha256(join(main, 'deploy', 'bin', 'backup-db.sh'))}  bin/backup-db.sh`,
  `${sha256(join(main, 'deploy', 'bin', 'deploy.sh'))}  bin/deploy.sh`,
  `${sha256(join(main, 'deploy', 'bin', 'verificar-backup.sh'))}  bin/verificar-backup.sh`,
  '--- chaves',
  'APP_NAME',
  'APP_LOCALE',
  'DB_HOST',
]

/** A listagem alinhada com a linha de `caminhoNoHost` trocada por `nova` (ou removida, com null). */
const comLinha = (caminhoNoHost: string, nova: string | null): string[] =>
  alinhada().flatMap((linha) => (linha.endsWith(`  ${caminhoNoHost}`) ? (nova === null ? [] : [nova]) : [linha]))

const conferir = (listagem: string[] | string, arvoreAlvo = alvo, arvoreMain = main) => {
  contador += 1
  const arquivo = join(base, `listagem-${contador}.txt`)
  writeFileSync(arquivo, typeof listagem === 'string' ? listagem : `${listagem.join('\n')}\n`)
  const r = spawnSync('bash', [CAMINHO, arquivo, arvoreAlvo, arvoreMain], { encoding: 'utf8' })
  return { status: r.status, stdout: r.stdout, stderr: r.stderr }
}

describe('.github/scripts/conferir-alinhamento.sh', () => {
  it('é executável', () => {
    expect(statSync(CAMINHO).mode & 0o111).not.toBe(0)
  })

  it('host alinhado sai 0', () => {
    const r = conferir(alinhada())
    expect(r.stdout).toContain('host alinhado')
    expect(r.status).toBe(0)
  })

  it('compose diferente do ALVO reprova, nomeando o arquivo e apontando o runbook', () => {
    // O host tem o compose da main; o alvo pressupõe outro. É o rollback com
    // runtime diferente (spec §5.4).
    const r = conferir(
      comLinha(
        'docker-compose.prod.yml',
        `${sha256(join(main, 'docker-compose.prod.yml'))}  docker-compose.prod.yml`,
      ),
    )
    expect(r.stdout).toMatch(/^docker-compose\.prod\.yml diferente$/m)
    expect(r.stderr).toContain('deploy/aws/README.md')
    expect(r.status).toBe(1)
  })

  // Cada arquivo de runtime tem a conferência dele. Só o compose principal
  // tinha caso negativo, e apagar a linha do overlay TLS no script passava
  // verde (Q-3 do review do item 31).
  it.each(['docker-compose.prod.yml', 'docker-compose.prod-tls.yml', 'nginx/tls.conf'])(
    '%s com hash diferente do ALVO reprova',
    (caminho) => {
      const r = conferir(comLinha(caminho, `${'0'.repeat(64)}  ${caminho}`))
      expect(r.stdout).toMatch(new RegExp(`^${caminho.replace(/[./-]/g, '\\$&')} diferente$`, 'm'))
      expect(r.status).toBe(1)
    },
  )

  // Todo script de deploy/bin/ da main é conferido, não uma lista fixa: com
  // dois scripts na fixture, trocar o glob por `{backup-db,deploy}.sh`
  // passava verde (Q-3 do review do item 31).
  it.each(['backup-db.sh', 'deploy.sh', 'verificar-backup.sh'])(
    'bin/%s da main ausente no host reprova',
    (script) => {
      const r = conferir(comLinha(`bin/${script}`, null))
      expect(r.stdout).toMatch(new RegExp(`^bin/${script.replace(/[.-]/g, '\\$&')} ausente$`, 'm'))
      expect(r.status).toBe(1)
    },
  )

  it('deploy.sh diferente da MAIN reprova, mesmo igual ao do alvo', () => {
    const r = conferir(
      comLinha('bin/deploy.sh', `${sha256(join(alvo, 'deploy', 'bin', 'deploy.sh'))}  bin/deploy.sh`),
    )
    expect(r.stdout).toMatch(/^bin\/deploy\.sh diferente$/m)
    expect(r.status).toBe(1)
  })

  it('tls.conf ausente no host reprova', () => {
    const r = conferir(comLinha('nginx/tls.conf', 'AUSENTE  nginx/tls.conf'))
    expect(r.stdout).toMatch(/^nginx\/tls\.conf ausente$/m)
    expect(r.status).toBe(1)
  })

  it('script da main que não está no host reprova', () => {
    const r = conferir(comLinha('bin/backup-db.sh', null))
    expect(r.stdout).toMatch(/^bin\/backup-db\.sh ausente$/m)
    expect(r.status).toBe(1)
  })

  it('chave do molde do alvo que falta no .env reprova, pelo nome', () => {
    const r = conferir(alinhada().filter((linha) => linha !== 'APP_LOCALE'))
    expect(r.stdout).toMatch(/^chave faltando: APP_LOCALE$/m)
    expect(r.stdout).not.toContain('COMENTADA')
    expect(r.status).toBe(1)
  })

  it('várias divergências saem uma por linha', () => {
    const listagem = alinhada()
      .filter((linha) => !linha.endsWith('  bin/backup-db.sh') && linha !== 'DB_HOST')
      .map((linha) => (linha.endsWith('  nginx/tls.conf') ? 'AUSENTE  nginx/tls.conf' : linha))
    const r = conferir(listagem)
    expect(r.stdout).toMatch(/^nginx\/tls\.conf ausente$/m)
    expect(r.stdout).toMatch(/^bin\/backup-db\.sh ausente$/m)
    expect(r.stdout).toMatch(/^chave faltando: DB_HOST$/m)
    expect(r.status).toBe(1)
  })

  it('script e chave a mais no host não reprovam — sobra inofensiva', () => {
    const listagem = alinhada()
    listagem.splice(5, 0, `${'0'.repeat(64)}  bin/velho.sh`)
    listagem.push('CHAVE_A_MAIS')
    const r = conferir(listagem)
    expect(r.stdout).toContain('host alinhado')
    expect(r.status).toBe(0)
  })

  it('listagem sem o marcador não prova alinhamento', () => {
    const r = conferir(alinhada().filter((linha) => linha !== '--- chaves'))
    expect(r.stderr).toContain('marcador')
    expect(r.status).toBe(1)
  })

  it('listagem vazia não prova alinhamento', () => {
    const r = conferir('')
    expect(r.stderr).toContain('marcador')
    expect(r.status).toBe(1)
  })

  it('referência que falta no alvo reprova, não passa em silêncio', () => {
    const incompleto = join(base, 'alvo-incompleto')
    escrever(join(incompleto, 'docker-compose.prod.yml'), readFileSync(join(alvo, 'docker-compose.prod.yml'), 'utf8'))
    escrever(
      join(incompleto, 'docker-compose.prod-tls.yml'),
      readFileSync(join(alvo, 'docker-compose.prod-tls.yml'), 'utf8'),
    )
    const r = conferir(alinhada(), incompleto)
    expect(r.stdout).toMatch(/^nginx\/tls\.conf sem referencia/m)
    expect(r.stdout).toMatch(/^\.env sem referencia/m)
    expect(r.status).toBe(1)
  })

  it('uso errado sai 2', () => {
    const r = spawnSync('bash', [CAMINHO, 'so-um-argumento'], { encoding: 'utf8' })
    expect(r.stderr).toContain('uso:')
    expect(r.status).toBe(2)
  })
})
