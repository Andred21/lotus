import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { spawn, spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

/**
 * `deploy/bin/sondar-saude.sh` é a sonda do item 34: o timer `lotus-sonda`
 * roda o script a cada minuto, e ele grava UMA linha JSON por execução. Os
 * metric filters fazem dessa linha `Lotus/Sonda Up` e `CertDias`, e o alarme de
 * `/up` trata falta de dado como queda. Por isso as duas falhas que importam
 * são silenciosas:
 * - uma linha mentindo, como `up` 1 com 503, ou `cert_dias` 0 inventado quando
 *   a medição falha;
 * - uma execução que pendura e encosta na seguinte.
 *
 * Por EXECUÇÃO (lição 19): cada caso roda o script de verdade contra um
 * servidor HTTP deste processo e certificados gerados aqui. `spawn` assíncrono,
 * nunca `spawnSync`, porque o servidor vive neste event loop e um `spawnSync`
 * o travaria — o `curl` esperaria uma resposta que nunca vem.
 */
const RAIZ = resolve(__dirname, '..', '..')
const CAMINHO = join(RAIZ, 'deploy', 'bin', 'sondar-saude.sh')
const SCRIPT = readFileSync(CAMINHO, 'utf8')
const semComentarios = SCRIPT.split(/\r?\n/)
  .filter((linha) => !/^\s*#/.test(linha))
  .join('\n')

/** Porta 1 em 127.0.0.1: nada escuta, a conexão é recusada na hora. Nenhum caso sai para a internet. */
const FECHADO = '127.0.0.1:1'

const escutar = (servidor: Server) =>
  new Promise<void>((pronto) => servidor.listen(0, '127.0.0.1', () => pronto()))
const fechar = (servidor: Server) => new Promise<void>((pronto) => servidor.close(() => pronto()))
const porta = (servidor: Server) => (servidor.address() as AddressInfo).port

let base: string
let certificado30: string
let ilegivel: string
let responde: Server
let pendura: Server
let contador = 0

beforeAll(async () => {
  base = mkdtempSync(join(tmpdir(), 'sondar-saude-'))
  certificado30 = join(base, 'certificado-30-dias.pem')
  const gerado = spawnSync(
    'openssl',
    [
      'req', '-x509', '-newkey', 'ec', '-pkeyopt', 'ec_paramgen_curve:prime256v1', '-nodes',
      '-days', '30', '-subj', '/CN=sonda-teste',
      '-keyout', join(base, 'chave.pem'), '-out', certificado30,
    ],
    { encoding: 'utf8' },
  )
  if (gerado.status !== 0) throw new Error(`openssl req falhou: ${gerado.stderr}`)
  ilegivel = join(base, 'ilegivel.pem')
  writeFileSync(ilegivel, 'isto nao e um certificado\n')

  responde = createServer((pedido, resposta) => {
    resposta.statusCode = pedido.url === '/503' ? 503 : 200
    resposta.end('ok')
  })
  // Aceita a conexão e nunca responde: o upstream pendurado.
  pendura = createServer(() => {})
  await Promise.all([escutar(responde), escutar(pendura)])
})

afterAll(async () => {
  pendura.closeAllConnections()
  await Promise.all([fechar(responde), fechar(pendura)])
  rmSync(base, { recursive: true, force: true })
})

type Execucao = { status: number | null; linhas: string[]; segundos: number }

/**
 * Roda a sonda com os overrides dados. Os defaults deste helper nunca saem da
 * máquina: URL e TLS apontam para uma porta fechada.
 */
const sondar = (env: Record<string, string>): Promise<Execucao> => {
  contador += 1
  const log = env.LOTUS_SONDA_LOG ?? join(base, `sonda-${contador}.log`)
  const inicio = Date.now()
  return new Promise((pronto) => {
    const filho = spawn('bash', [CAMINHO], {
      env: {
        ...process.env,
        LOTUS_SONDA_URL: `http://${FECHADO}/up`,
        LOTUS_SONDA_TLS: FECHADO,
        ...env,
        LOTUS_SONDA_LOG: log,
      },
      stdio: 'ignore',
    })
    filho.on('close', (status) => {
      let linhas: string[] = []
      try {
        linhas = readFileSync(log, 'utf8').split('\n').filter(Boolean)
      } catch {
        linhas = []
      }
      pronto({ status, linhas, segundos: (Date.now() - inicio) / 1000 })
    })
  })
}

/** A execução saiu 0 e gravou exatamente uma linha JSON — devolvida parseada. */
const linhaUnica = (e: Execucao): Record<string, unknown> => {
  expect(e.status).toBe(0)
  expect(e.linhas).toHaveLength(1)
  return JSON.parse(e.linhas[0]) as Record<string, unknown>
}

describe('deploy/bin/sondar-saude.sh', () => {
  it('é executável e falha alto', () => {
    expect(statSync(CAMINHO).mode & 0o111).not.toBe(0)
    expect(semComentarios).toMatch(/^set -euo pipefail$/m)
  })

  it('não fala com a AWS nem lê o .env — a medição é a linha', () => {
    expect(semComentarios).not.toMatch(/(^|[\s;&|(])aws\s/m)
    expect(semComentarios).not.toContain('.env')
  })

  it('as duas medições têm teto de 10 s, e o curl não segue redirect', () => {
    const curl = semComentarios.split('\n').find((linha) => /\bcurl\s/.test(linha))
    expect(curl).toBeDefined()
    expect(curl).toContain('--max-time 10')
    expect(curl).not.toMatch(/\s(-L|--location)\b/)
    expect(semComentarios).toMatch(/timeout 10 openssl s_client/)
  })

  it('200 dá up 1, http 200 e os dias do certificado', async () => {
    const linha = linhaUnica(
      await sondar({
        LOTUS_SONDA_URL: `http://127.0.0.1:${porta(responde)}/up`,
        LOTUS_SONDA_CERT_ARQUIVO: certificado30,
      }),
    )
    expect(linha.ts).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/)
    expect(linha.up).toBe(1)
    expect(linha.http).toBe(200)
    // Gerado agora com -days 30: o piso dá 29, ou 30 se tudo cair no mesmo segundo.
    expect([29, 30]).toContain(linha.cert_dias)
  })

  it('503 dá up 0 com o código', async () => {
    const linha = linhaUnica(
      await sondar({
        LOTUS_SONDA_URL: `http://127.0.0.1:${porta(responde)}/503`,
        LOTUS_SONDA_CERT_ARQUIVO: certificado30,
      }),
    )
    expect(linha.up).toBe(0)
    expect(linha.http).toBe(503)
  })

  it('sem servidor dá up 0 e http 0', async () => {
    const linha = linhaUnica(await sondar({ LOTUS_SONDA_CERT_ARQUIVO: certificado30 }))
    expect(linha.up).toBe(0)
    expect(linha.http).toBe(0)
  })

  it('upstream pendurado termina no teto, com up 0 e http 0', async () => {
    const execucao = await sondar({
      LOTUS_SONDA_URL: `http://127.0.0.1:${porta(pendura)}/up`,
      LOTUS_SONDA_CERT_ARQUIVO: certificado30,
    })
    const linha = linhaUnica(execucao)
    expect(linha.up).toBe(0)
    expect(linha.http).toBe(0)
    // Teto de 10 s, com folga para a máquina lenta, e sempre bem abaixo do minuto do timer.
    expect(execucao.segundos).toBeLessThan(20)
  }, 30_000)

  it('certificado ilegível omite cert_dias — nunca grava número inventado', async () => {
    const linha = linhaUnica(
      await sondar({
        LOTUS_SONDA_URL: `http://127.0.0.1:${porta(responde)}/up`,
        LOTUS_SONDA_CERT_ARQUIVO: ilegivel,
      }),
    )
    expect(linha.up).toBe(1)
    expect('cert_dias' in linha).toBe(false)
  })

  it('TLS inalcançável também omite cert_dias', async () => {
    const linha = linhaUnica(await sondar({ LOTUS_SONDA_URL: `http://127.0.0.1:${porta(responde)}/up` }))
    expect('cert_dias' in linha).toBe(false)
  })

  it('grava em append: uma linha por execução', async () => {
    const log = join(base, 'append.log')
    const env = { LOTUS_SONDA_LOG: log, LOTUS_SONDA_CERT_ARQUIVO: certificado30 }
    await sondar(env)
    const segunda = await sondar(env)
    expect(segunda.status).toBe(0)
    expect(segunda.linhas).toHaveLength(2)
  })

  it('sai diferente de 0 quando não consegue gravar a linha', async () => {
    const execucao = await sondar({ LOTUS_SONDA_LOG: join(base, 'nao-existe', 'sonda.log') })
    expect(execucao.status).not.toBe(0)
  })
})
