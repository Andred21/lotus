import { describe, expect, it } from 'vitest'
import { readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

/**
 * `deploy/bin/backup-db.sh` é a mitigação escrita na revisão 2026-09 do ADR-09:
 * sem réplica, o backup diário é a única cópia do banco de produção. A catraca
 * existe porque a primeira execução real (2026-09-17, Task 17 do item 10) recusou
 * um dump ÍNTEGRO: a guarda media o arquivo JÁ COMPRIMIDO contra um piso de 10 KiB
 * escrito para o tamanho BRUTO — schema completo + seed mínimo dão 62 KiB crus e
 * 8,9 KiB em gzip, e o backup nunca chegava ao S3.
 *
 * Conferência textual pelo mesmo motivo do provar-release.test.ts: o comportamento
 * se prova rodando o script contra o mysql de produção (a Task 17 faz isso); a
 * catraca guarda a regressão silenciosa — a guarda voltar a medir o comprimido, ou
 * alguém baixar o piso "porque estava reclamando" em vez de olhar o dump.
 */
const RAIZ = resolve(__dirname, '..', '..')
const CAMINHO = join(RAIZ, 'deploy', 'bin', 'backup-db.sh')
const SCRIPT = readFileSync(CAMINHO, 'utf8')
const semComentarios = SCRIPT.split(/\r?\n/)
  .filter((linha) => !/^\s*#/.test(linha))
  .join('\n')

describe('deploy/bin/backup-db.sh', () => {
  it('é executável', () => {
    expect(statSync(CAMINHO).mode & 0o111).not.toBe(0)
  })

  it('falha alto em erro, variável indefinida e pipe quebrado', () => {
    expect(semComentarios).toMatch(/^set -euo pipefail$/m)
  })

  it('mede o dump BRUTO, nunca o comprimido, contra o piso de 10 KiB', () => {
    const guarda = semComentarios
      .split(/\r?\n/)
      .find((linha) => linha.includes('10240'))
    expect(guarda).toBeDefined()
    expect(guarda).toContain('$BRUTO')
    expect(guarda).not.toContain('$ARQ')
  })

  it('exige o rodapé do mysqldump — dump truncado não vira backup', () => {
    expect(semComentarios).toContain('-- Dump completed')
  })

  it('só comprime e envia depois de aprovar o bruto', () => {
    const linhas = semComentarios.split(/\r?\n/)
    const guarda = linhas.findIndex((linha) => linha.includes('10240'))
    const rodape = linhas.findIndex((linha) => linha.includes('-- Dump completed'))
    const gzip = linhas.findIndex((linha) => /^gzip /.test(linha))
    const envio = linhas.findIndex((linha) => linha.includes('aws s3 cp'))
    expect(guarda).toBeGreaterThan(-1)
    expect(rodape).toBeGreaterThan(guarda)
    expect(gzip).toBeGreaterThan(rodape)
    expect(envio).toBeGreaterThan(gzip)
  })

  it('não deixa dump de produção no /tmp do host quando falha no meio', () => {
    expect(semComentarios).toMatch(/^trap .* EXIT$/m)
  })

  it('lê só a chave do bucket, sem `source` do .env inteiro', () => {
    expect(semComentarios).toContain("grep -E '^LOTUS_BACKUP_BUCKET=' \"$BASE/.env\"")
    expect(semComentarios).not.toMatch(/^\s*(source|\.)\s+"\$BASE\/\.env"/m)
  })

  it('a senha do mysql vem do ambiente do container, não da linha de comando do host', () => {
    expect(semComentarios).toContain('-p"$MYSQL_ROOT_PASSWORD"')
    expect(semComentarios).toContain('docker exec "$MYSQL" sh -c')
  })
})
