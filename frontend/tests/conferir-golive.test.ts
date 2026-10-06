import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

/**
 * `deploy/bin/conferir-golive.sh` é a linha de base e a rede final do go-live
 * (bloco 13, spec §4.1): sete verificações só de leitura sobre a produção, uma
 * linha cada, exit 1 com qualquer FALHA. As falhas que importam são silenciosas
 * — um leitor fora saindo OK, uma comparação apagada, um valor do `.env` indo
 * parar na saída — e nenhuma quebra o `bash -n`.
 *
 * Por EXECUÇÃO (lição 19): cada caso roda o script de verdade com `docker` e
 * `aws` falsos no PATH (fixtures/conferir-golive/) e um LOTUS_BASE temporário.
 * Cada comparação do script tem o cenário que a faz reprovar sozinha, então
 * trocar `linha FALHA` por `linha OK` em qualquer uma reprova esta suíte.
 */
const RAIZ = resolve(__dirname, '..', '..')
const CAMINHO = join(RAIZ, 'deploy', 'bin', 'conferir-golive.sh')
const FAKES = join(__dirname, 'fixtures', 'conferir-golive')
const SCRIPT = readFileSync(CAMINHO, 'utf8')
const semComentarios = SCRIPT.split(/\r?\n/)
  .filter((linha) => !/^\s*#/.test(linha))
  .join('\n')

/**
 * As verificações que o script já tem. Cresce uma task por vez (Tasks 2–5)
 * até as sete da spec: migrations, rbac, dados-antigos, sondas-dev, env,
 * backup, smoke. A "fixture boa" e o `reprovaSo` exigem exatamente esta lista.
 */
const NOMES: string[] = ['migrations', 'rbac', 'env']
const SENTINELA = 'SENTINELA-NAO-VAZAR-9f3a'

const ATRIBUICAO = /^[A-Za-z_][A-Za-z0-9_]*=/
const CHAVES_MOLDE = readFileSync(join(RAIZ, 'deploy', 'aws', 'env.prod.example'), 'utf8')
  .split(/\r?\n/)
  .filter((l) => ATRIBUICAO.test(l))
  .map((l) => l.slice(0, l.indexOf('=')))

let base: string
let contador = 0

beforeAll(() => {
  base = mkdtempSync(join(tmpdir(), 'conferir-golive-'))
})

afterAll(() => {
  rmSync(base, { recursive: true, force: true })
})

type Execucao = { status: number | null; stdout: string; stderr: string; log: string }
type Linha = { estado: string; detalhe: string }

/** Escreve um arquivo de fixture no diretório do caso e devolve o caminho. */
const arquivo = (dir: string, nome: string, linhas: string[]): string => {
  const caminho = join(dir, nome)
  writeFileSync(caminho, linhas.length === 0 ? '' : linhas.join('\n') + '\n')
  return caminho
}

const horasAtras = (horas: number): string => new Date(Date.now() - horas * 3600_000).toISOString()

/**
 * Cenário em que tudo passa: `.env` com todas as chaves do molde (e uma
 * sentinela como senha), banco igual ao código, nenhum dado antigo, nenhuma
 * sonda, backup de 2 horas, smoke vazio. Cada caso estraga UMA coisa.
 */
const cenarioBom = (): { env: Record<string, string>; dir: string } => {
  contador += 1
  const dir = join(base, `caso-${contador}`)
  const lotus = join(dir, 'lotus')
  mkdirSync(lotus, { recursive: true })
  writeFileSync(
    join(lotus, '.env'),
    CHAVES_MOLDE.map((k) => (k === 'DB_PASSWORD' ? `${k}=${SENTINELA}` : k === 'APP_KEY' ? `${k}=base64:${SENTINELA}==` : `${k}=valor-${k.toLowerCase()}`)).join('\n') + '\n',
  )
  writeFileSync(join(lotus, 'docker-compose.prod.yml'), 'services: {}\n')
  const migracoes = ['0001_01_01_000000_create_users_table', '2026_08_05_100000_certificates']
  const perms = ['identity.user.view', 'identity.user.create', 'certification.certificate.revoke']
  const env: Record<string, string> = {
    LOTUS_BASE: lotus,
    FAKE_LOG: join(dir, 'chamadas.log'),
    FAKE_MIGRACOES_BANCO: arquivo(dir, 'migracoes-banco', migracoes),
    FAKE_MIGRACOES_CODIGO: arquivo(dir, 'migracoes-codigo', migracoes.map((m) => `${m}.php`)),
    FAKE_PERMS_BANCO: arquivo(dir, 'perms-banco', perms),
    FAKE_PERMS_CODIGO: arquivo(dir, 'perms-codigo', perms),
    FAKE_ROLES: 'admin redator superadmin',
    FAKE_SUPERADMIN_N: String(perms.length),
    FAKE_DADOS_ANTIGOS: arquivo(dir, 'dados-antigos', [
      'client_addresses\t-', 'client_contacts\t-', 'users\t2026-09-10 12:00:00', 'course_modules\t-',
      'course_certificate_templates\t-', 'quotes\t-', 'files\t-', 'enrollments\t-',
    ]),
    FAKE_SONDAS_N: '0',
    FAKE_ULTIMO_BACKUP: horasAtras(2),
    FAKE_SMOKE: arquivo(dir, 'smoke', ['certificados\t0\t0', 'clientes\t0\t0', 'cursos\t0\t0', 'turmas\t0\t0', 'alunos\t0\t0']),
  }
  return { env, dir }
}

/** Roda o script com os fakes na frente do PATH. */
const rodar = (env: Record<string, string>, args: string[] = []): Execucao => {
  const r = spawnSync('bash', [CAMINHO, ...args], {
    env: { ...process.env, ...env, PATH: `${FAKES}:${process.env.PATH ?? ''}` },
    encoding: 'utf8',
  })
  let log: string
  try {
    log = readFileSync(env.FAKE_LOG, 'utf8')
  } catch {
    log = ''
  }
  return { status: r.status, stdout: r.stdout, stderr: r.stderr, log }
}

/** Uma entrada por verificação: `OK|FALHA|AVISO|INFO <nome> <detalhe>`. */
const porNome = (saida: string): Record<string, Linha> => {
  const mapa: Record<string, Linha> = {}
  for (const l of saida.split('\n').filter(Boolean)) {
    const m = /^(OK|FALHA|AVISO|INFO) (\S+) (.*)$/.exec(l)
    if (m === null) throw new Error(`linha fora do formato: ${l}`)
    if (mapa[m[2]] !== undefined) throw new Error(`verificacao repetida: ${m[2]}`)
    mapa[m[2]] = { estado: m[1], detalhe: m[3] }
  }
  return mapa
}

/** Cada chamada registrada pelos fakes, como lista de argumentos. */
const chamadas = (log: string): string[][] =>
  log.split('---\n').filter(Boolean).map((bloco) => bloco.split('\n').filter(Boolean))

/** Reprova só `nome`, com todas as outras ainda rodando. */
const reprovaSo = (e: Execucao, nome: string): Linha => {
  const mapa = porNome(e.stdout)
  expect(Object.keys(mapa).sort()).toEqual([...NOMES].sort())
  expect(e.status).toBe(1)
  for (const n of NOMES) if (n !== nome) expect(mapa[n].estado).not.toBe('FALHA')
  expect(mapa[nome].estado).toBe('FALHA')
  return mapa[nome]
}

describe('deploy/bin/conferir-golive.sh — forma', () => {
  it('é executável e falha alto', () => {
    expect(statSync(CAMINHO).mode & 0o111).not.toBe(0)
    expect(semComentarios).toMatch(/^set -euo pipefail$/m)
    expect(semComentarios).toMatch(/^umask 077$/m)
  })

  it('a lista embutida de chaves é igual às chaves de deploy/aws/env.prod.example', () => {
    const m = /^CHAVES_ESPERADAS="([^"]+)"$/m.exec(semComentarios)
    expect(m).not.toBeNull()
    const embutidas = (m as RegExpExecArray)[1].trim().split(/\s+/)
    expect([...embutidas].sort()).toEqual([...CHAVES_MOLDE].sort())
  })
})

describe('deploy/bin/conferir-golive.sh — fixture boa', () => {
  it('sai 0 com uma linha por verificação e nenhuma FALHA', () => {
    const e = rodar(cenarioBom().env)
    expect(e.status).toBe(0)
    const mapa = porNome(e.stdout)
    expect(Object.keys(mapa).sort()).toEqual([...NOMES].sort())
    for (const n of NOMES) expect(mapa[n].estado).not.toBe('FALHA')
  })

  it('nenhum valor do .env aparece na saída, nem com todos os leitores fora', () => {
    const bom = rodar(cenarioBom().env)
    expect(bom.stdout + bom.stderr).not.toContain(SENTINELA)
    const ruim = rodar({ ...cenarioBom().env, FAKE_MYSQL_FORA: '1', FAKE_APP_FORA: '1', FAKE_AWS_FORA: '1' })
    expect(ruim.stdout + ruim.stderr).not.toContain(SENTINELA)
    expect(ruim.log).not.toContain(SENTINELA)
  })

  it('não emite nenhum comando de escrita: só compose ps e docker exec, e nenhum SQL que escreva', () => {
    const e = rodar(cenarioBom().env)
    for (const args of chamadas(e.log)) {
      expect(args[0]).toMatch(/^(compose|exec|s3api)$/)
      if (args[0] === 'compose') {
        expect(args).toContain('ps')
        for (const proibido of ['run', 'up', 'down', 'stop', 'start', 'restart', 'exec']) expect(args).not.toContain(proibido)
      }
      const junto = args.join(' ')
      expect(junto).not.toMatch(/\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|REPLACE)\b/i)
      expect(junto).not.toContain('artisan')
    }
    expect(semComentarios).not.toMatch(/docker run\b/)
    expect(semComentarios).not.toMatch(/\bartisan\b/)
  })
})

describe('deploy/bin/conferir-golive.sh — env', () => {
  it('chave da lista faltando no .env → FALHA nomeando a chave', () => {
    const { env } = cenarioBom()
    const semMail = CHAVES_MOLDE.filter((k) => k !== 'MAIL_MAILER').map((k) => `${k}=x`)
    writeFileSync(join(env.LOTUS_BASE, '.env'), semMail.join('\n') + '\n')
    const l = reprovaSo(rodar(env), 'env')
    expect(l.detalhe).toContain('MAIL_MAILER')
  })

  it('chave a mais sai AVISO, não FALHA, e o script sai 0', () => {
    const { env } = cenarioBom()
    writeFileSync(join(env.LOTUS_BASE, '.env'), CHAVES_MOLDE.map((k) => `${k}=x`).concat('EXTRA_DO_HOST=1').join('\n') + '\n')
    const e = rodar(env)
    expect(e.status).toBe(0)
    const l = porNome(e.stdout).env
    expect(l.estado).toBe('AVISO')
    expect(l.detalhe).toContain('EXTRA_DO_HOST')
  })

  it('valor com `=` e linha de comentário não viram chave', () => {
    const { env } = cenarioBom()
    writeFileSync(
      join(env.LOTUS_BASE, '.env'),
      ['# comentario=nao-e-chave', ...CHAVES_MOLDE.map((k) => (k === 'APP_KEY' ? `${k}=base64:abc==` : `${k}=x`))].join('\n') + '\n',
    )
    const e = rodar(env)
    expect(porNome(e.stdout).env.estado).toBe('OK')
  })

  it('.env ilegível → FALHA', () => {
    const { env } = cenarioBom()
    rmSync(join(env.LOTUS_BASE, '.env'))
    const l = reprovaSo(rodar(env), 'env')
    expect(l.detalhe).toContain('.env')
  })
})

describe('deploy/bin/conferir-golive.sh — migrations', () => {
  it('migration só no código → FALHA listando-a', () => {
    const { env, dir } = cenarioBom()
    env.FAKE_MIGRACOES_CODIGO = arquivo(dir, 'migracoes-codigo-2', [
      '0001_01_01_000000_create_users_table.php', '2026_08_05_100000_certificates.php', '2026_12_01_000000_nova.php',
    ])
    const l = reprovaSo(rodar(env), 'migrations')
    expect(l.detalhe).toContain('so-no-codigo: 2026_12_01_000000_nova')
  })

  it('migration só no banco → FALHA listando-a', () => {
    const { env, dir } = cenarioBom()
    env.FAKE_MIGRACOES_BANCO = arquivo(dir, 'migracoes-banco-2', [
      '0001_01_01_000000_create_users_table', '2026_08_05_100000_certificates', '2026_07_01_000000_sumiu',
    ])
    const l = reprovaSo(rodar(env), 'migrations')
    expect(l.detalhe).toContain('so-no-banco: 2026_07_01_000000_sumiu')
  })

  it('OK imprime as duas contagens', () => {
    const e = rodar(cenarioBom().env)
    expect(porNome(e.stdout).migrations).toEqual({ estado: 'OK', detalhe: 'banco=2 codigo=2' })
  })

  it('mysql fora → FALHA em migrations e rbac nomeando o mysql; env segue', () => {
    const e = rodar({ ...cenarioBom().env, FAKE_MYSQL_FORA: '1' })
    const mapa = porNome(e.stdout)
    expect(e.status).toBe(1)
    expect(Object.keys(mapa).sort()).toEqual([...NOMES].sort())
    expect(mapa.migrations).toEqual({ estado: 'FALHA', detalhe: 'leitor indisponivel: mysql' })
    expect(mapa.rbac).toEqual({ estado: 'FALHA', detalhe: 'leitor indisponivel: mysql' })
    expect(mapa.env.estado).toBe('OK')
  })

  it('serviço mysql fora do compose (ps -q vazio) → mesma FALHA', () => {
    const e = rodar({ ...cenarioBom().env, FAKE_SEM_SERVICO: '1' })
    const mapa = porNome(e.stdout)
    expect(mapa.migrations.estado).toBe('FALHA')
    expect(mapa.rbac.estado).toBe('FALHA')
    expect(mapa.env.estado).toBe('OK')
  })

  it('app fora → FALHA em migrations e rbac nomeando o app; o resto segue', () => {
    const e = rodar({ ...cenarioBom().env, FAKE_APP_FORA: '1' })
    const mapa = porNome(e.stdout)
    expect(mapa.migrations).toEqual({ estado: 'FALHA', detalhe: 'leitor indisponivel: app' })
    expect(mapa.rbac).toEqual({ estado: 'FALHA', detalhe: 'leitor indisponivel: app' })
    expect(mapa.env.estado).toBe('OK')
  })
})

describe('deploy/bin/conferir-golive.sh — rbac', () => {
  it('permissão no catálogo e não no banco → FALHA listando-a', () => {
    const { env, dir } = cenarioBom()
    env.FAKE_PERMS_CODIGO = arquivo(dir, 'perms-codigo-2', ['identity.user.view', 'identity.user.create', 'certification.certificate.revoke', 'nova.perm'])
    const l = reprovaSo(rodar(env), 'rbac')
    expect(l.detalhe).toContain('so-no-codigo: nova.perm')
  })

  it('permissão no banco e não no catálogo → FALHA listando-a', () => {
    const { env, dir } = cenarioBom()
    env.FAKE_PERMS_BANCO = arquivo(dir, 'perms-banco-2', ['identity.user.view', 'identity.user.create', 'certification.certificate.revoke', 'velha.perm'])
    const l = reprovaSo(rodar(env), 'rbac')
    expect(l.detalhe).toContain('so-no-banco: velha.perm')
  })

  it('role de sistema ausente → FALHA nomeando-a', () => {
    const env = { ...cenarioBom().env, FAKE_ROLES: 'admin superadmin' }
    const l = reprovaSo(rodar(env), 'rbac')
    expect(l.detalhe).toContain('roles ausentes: redator')
  })

  it('superadmin sem todas as permissões → FALHA com as contagens', () => {
    const env = { ...cenarioBom().env, FAKE_SUPERADMIN_N: '2' }
    const l = reprovaSo(rodar(env), 'rbac')
    expect(l.detalhe).toContain('superadmin tem 2 de 3')
  })

  it('OK imprime contagem e roles', () => {
    const e = rodar(cenarioBom().env)
    expect(porNome(e.stdout).rbac).toEqual({ estado: 'OK', detalhe: '3 permissoes; roles admin,redator,superadmin; superadmin com todas' })
  })
})
