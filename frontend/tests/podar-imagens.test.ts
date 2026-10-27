import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

/**
 * `deploy/bin/podar-imagens.sh` apaga, depois de uma promoção aprovada, as
 * imagens do Lotus que não são do SHA atual nem do anterior (bloco 42, spec §4).
 * Até aqui o deploy nunca apagava nada, e o disco do host chegou a 87% com 14
 * SHAs guardados. As falhas que importam são silenciosas: apagar o alvo de
 * rollback quando o mesmo SHA é promovido de novo, tocar imagem de terceiros,
 * forçar a remoção de imagem em uso, ou sair 0 com o docker fora.
 *
 * Por EXECUÇÃO (lição 19): cada caso roda o script com o `docker` falso de
 * fixtures/podar-imagens/ e um LOTUS_BASE temporário com o ledger do caso.
 */
const RAIZ = resolve(__dirname, '..', '..')
const CAMINHO = join(RAIZ, 'deploy', 'bin', 'podar-imagens.sh')
const FAKES = join(__dirname, 'fixtures', 'podar-imagens')

const REPOS = ['ghcr.io/gatika-cl/lotus-app', 'ghcr.io/gatika-cl/lotus-web', 'ghcr.io/gatika-cl/lotus-clamav']
const A = 'a'.repeat(40)
const B = 'b'.repeat(40)
const C = 'c'.repeat(40)
const D = 'd'.repeat(40)
const TERCEIROS = ['gotenberg/gotenberg:8', 'mysql:8.0', `ghcr.io/gatika-cl/outra:${A}`, `ghcr.io/outro-dono/lotus-app:${A}`]
const NAO_SHA = ['ghcr.io/gatika-cl/lotus-app:latest', 'ghcr.io/gatika-cl/lotus-app:<none>', '<none>:<none>']

/** As duas formas de linha que o deploy.sh grava no ledger, sem espaços. */
const inicio = (sha: string, anterior: string | null) =>
  JSON.stringify({ ts: '2026-10-25T00:00:00Z', evento: 'inicio', sha, sha_anterior: anterior, migrations: [], schema_a_frente: [], dump: null, ator: 'teste' })
const fim = (sha: string, resultado: 'ok' | 'falha' = 'ok') =>
  JSON.stringify({ ts: '2026-10-25T00:00:00Z', evento: 'fim', sha, resultado, etapa: resultado === 'ok' ? 'ok' : 'up' })

/** Toda tag dos três repositórios para os SHAs dados, em ordem alfabética. */
const doLotus = (...shas: string[]) => REPOS.flatMap((r) => shas.map((s) => `${r}:${s}`)).sort()

let base: string
let contador = 0

beforeAll(() => {
  base = mkdtempSync(join(tmpdir(), 'podar-imagens-'))
})

afterAll(() => {
  rmSync(base, { recursive: true, force: true })
})

type Caso = {
  ledger?: string[] | null // null = sem releases.jsonl
  imagens?: string[] // default: A, B, C e D nos três repositórios, mais os de terceiros
  recusa?: string[] // refs que o daemon recusa remover
  env?: Record<string, string>
}
type Execucao = { status: number | null; stdout: string; stderr: string; chamadas: string[][] }

const rodar = (args: string[], caso: Caso = {}): Execucao => {
  contador += 1
  const dir = join(base, `caso-${contador}`)
  const lotus = join(dir, 'lotus')
  mkdirSync(lotus, { recursive: true })
  const linhas = (xs: string[]) => xs.map((x) => `${x}\n`).join('')
  if (caso.ledger !== null) writeFileSync(join(lotus, 'releases.jsonl'), linhas(caso.ledger ?? []))
  const imagens = join(dir, 'imagens')
  writeFileSync(imagens, linhas(caso.imagens ?? [...doLotus(A, B, C, D), ...TERCEIROS]))
  const recusa = join(dir, 'recusa')
  writeFileSync(recusa, linhas(caso.recusa ?? []))
  const log = join(dir, 'chamadas.log')
  writeFileSync(log, '')
  const r = spawnSync('bash', [CAMINHO, ...args], {
    env: {
      ...process.env,
      LOTUS_BASE: lotus,
      FAKE_LOG: log,
      FAKE_IMAGENS: imagens,
      FAKE_RM_RECUSA: recusa,
      ...caso.env,
      PATH: `${FAKES}:${process.env.PATH ?? ''}`,
    },
    encoding: 'utf8',
  })
  const chamadas = readFileSync(log, 'utf8')
    .split('---\n')
    .filter(Boolean)
    .map((bloco) => bloco.split('\n').filter(Boolean))
  return { status: r.status, stdout: r.stdout, stderr: r.stderr, chamadas }
}

/** As refs que o script mandou o docker remover, em ordem alfabética. */
const removidas = (e: Execucao) =>
  e.chamadas.filter((c) => c[0] === 'image' && c[1] === 'rm').map((c) => c[c.length - 1]).sort()
const mantidas = (e: Execucao) => e.stdout.split('\n')[0]

describe('deploy/bin/podar-imagens.sh — forma', () => {
  it('é executável e falha alto', () => {
    expect(statSync(CAMINHO).mode & 0o111).not.toBe(0)
    expect(readFileSync(CAMINHO, 'utf8')).toMatch(/^set -euo pipefail$/m)
  })

  it('o docker falso é executável', () => {
    expect(statSync(join(FAKES, 'docker')).mode & 0o111).not.toBe(0)
  })
})

describe('deploy/bin/podar-imagens.sh — o que fica', () => {
  it('guarda o atual e o anterior e remove o resto dos três repositórios', () => {
    const e = rodar([C], { ledger: [inicio(A, null), fim(A), inicio(B, A), fim(B), inicio(C, B)] })
    expect(e.status, e.stderr).toBe(0)
    expect(mantidas(e)).toBe(`mantidas: ${C} ${B}`)
    expect(removidas(e)).toEqual(doLotus(A, D))
    for (const ref of doLotus(A, D)) expect(e.stdout).toContain(`removida: ${ref}\n`)
  })

  it('mesmo SHA promovido de novo: o anterior sai do ledger, não do CURRENT_SHA', () => {
    const e = rodar([C], { ledger: [fim(B), inicio(C, B), fim(C), inicio(C, C)] })
    expect(mantidas(e)).toBe(`mantidas: ${C} ${B}`)
    expect(removidas(e)).toEqual(doLotus(A, D))
  })

  it('rollback: promover o anterior guarda o SHA que acabou de sair', () => {
    const e = rodar([B], { ledger: [fim(B), inicio(C, B), fim(C), inicio(B, C)] })
    expect(mantidas(e)).toBe(`mantidas: ${B} ${C}`)
    expect(removidas(e)).toEqual(doLotus(A, D))
  })

  it('fim com falha não conta como anterior', () => {
    const e = rodar([C], { ledger: [fim(A), inicio(B, A), fim(B, 'falha'), inicio(C, A)] })
    expect(mantidas(e)).toBe(`mantidas: ${C} ${A}`)
    expect(removidas(e)).toEqual(doLotus(B, D))
  })

  it('o sha_anterior de uma linha inicio não vira anterior', () => {
    const e = rodar([C], { ledger: [fim(B), inicio(C, D)] })
    expect(mantidas(e)).toBe(`mantidas: ${C} ${B}`)
  })

  it('ledger sem promoção anterior: guarda só o atual e sai 0', () => {
    const e = rodar([C], { ledger: [inicio(C, null)] })
    expect(e.status, e.stderr).toBe(0)
    expect(mantidas(e)).toBe(`mantidas: ${C} nenhum`)
    expect(removidas(e)).toEqual(doLotus(A, B, D))
  })

  it('sem releases.jsonl: guarda só o atual, sai 0 e não reclama do arquivo', () => {
    const e = rodar([C], { ledger: null })
    expect(e.status, e.stderr).toBe(0)
    expect(mantidas(e)).toBe(`mantidas: ${C} nenhum`)
    expect(e.stderr).toBe('')
  })
})

describe('deploy/bin/podar-imagens.sh — o que nunca sai', () => {
  it('imagem fora dos três repositórios do Lotus fica', () => {
    const e = rodar([C], { ledger: [fim(B), inicio(C, B)], imagens: [...doLotus(B, C), ...TERCEIROS] })
    expect(e.status, e.stderr).toBe(0)
    expect(removidas(e)).toEqual([])
  })

  it('tag que não é SHA fica; o que não tem tag sai pelo prune do fim', () => {
    const e = rodar([C], { ledger: [fim(B), inicio(C, B)], imagens: [...doLotus(B, C), ...NAO_SHA] })
    expect(removidas(e)).toEqual([])
    expect(e.chamadas.at(-1)).toEqual(['image', 'prune', '-f'])
  })

  it('nunca força: todo image rm é só `image rm <ref>`', () => {
    const e = rodar([C], { ledger: [fim(B), inicio(C, B)] })
    const rms = e.chamadas.filter((c) => c[0] === 'image' && c[1] === 'rm')
    expect(rms.length).toBeGreaterThan(0)
    for (const c of rms) expect(c).toHaveLength(3)
  })
})

describe('deploy/bin/podar-imagens.sh — falhas', () => {
  it('remoção recusada: as outras saem, a recusa vai ao stderr e o script sai 1', () => {
    const presa = `ghcr.io/gatika-cl/lotus-app:${A}`
    const e = rodar([C], { ledger: [fim(B), inicio(C, B)], recusa: [presa] })
    expect(e.status).toBe(1)
    expect(removidas(e)).toEqual(doLotus(A, D)) // tentou todas, a presa inclusive
    expect(e.stdout).not.toContain(`removida: ${presa}`)
    expect(e.stdout).toContain(`removida: ghcr.io/gatika-cl/lotus-web:${A}`)
    expect(e.stderr).toContain(`recusada: ${presa}`)
  })

  it('docker image ls falhando: sai 1 sem remover nada', () => {
    const e = rodar([C], { ledger: [fim(B), inicio(C, B)], env: { FAKE_LS_FALHA: '1' } })
    expect(e.status).toBe(1)
    expect(e.stderr).toContain('erro: docker image ls falhou')
    expect(removidas(e)).toEqual([])
  })

  it('prune falhando: as remoções valem e o script sai 1', () => {
    const e = rodar([C], { ledger: [fim(B), inicio(C, B)], env: { FAKE_PRUNE_FALHA: '1' } })
    expect(e.status).toBe(1)
    expect(removidas(e)).toEqual(doLotus(A, D))
  })

  const usos: Array<[string, string[]]> = [
    ['sem argumento', []],
    ['39 hexadecimais', ['c'.repeat(39)]],
    ['maiúscula', ['C'.repeat(40)]],
    ['dois argumentos', [C, B]],
  ]
  it.each(usos)('uso (%s): sai 2 sem chamar o docker', (_nome, args) => {
    const e = rodar(args, { ledger: [fim(B)] })
    expect(e.status).toBe(2)
    expect(e.stderr).toContain('uso: podar-imagens.sh <sha de 40 hexadecimais>')
    expect(e.chamadas).toEqual([])
  })
})
