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

  it('nem legível por qualquer usuário local enquanto ele existe', () => {
    // O `trap ... EXIT` cobre REMOÇÃO, não permissão. /tmp é 1777 e o umask
    // default do root é 022, então o dump e o .gz nasciam 0644 — medido em
    // 2026-09-20 (Q-8), e 0600 com o `umask 077`. O arquivo carrega as tabelas
    // `certificates` e `audits` inteiras, e o host tem o usuário `ubuntu` além
    // do root.
    const linhas = semComentarios.split(/\r?\n/)
    const umask = linhas.findIndex((linha) => /^umask 077$/.test(linha))
    const primeiroArquivo = linhas.findIndex((linha) => linha.includes('> "$BRUTO"'))
    expect(umask).toBeGreaterThan(-1)
    expect(primeiroArquivo).toBeGreaterThan(umask)
  })

  it('lê só a chave do bucket, sem `source` do .env inteiro', () => {
    expect(semComentarios).toContain("grep -E '^LOTUS_BACKUP_BUCKET=' \"$BASE/.env\"")
    expect(semComentarios).not.toMatch(/^\s*(source|\.)\s+"\$BASE\/\.env"/m)
  })

  it('a guarda do bucket é ALCANÇÁVEL — sem o `|| true`, `set -e` mata uma linha antes dela', () => {
    // Medido em 2026-09-20 (Q-5): grep sem match sai 1, `pipefail` propaga pelo
    // `cut` e a atribuição sai 1, então o script morria MUDO na linha de cima e
    // a mensagem nunca imprimia. Com o `|| true`, a mesma sonda imprime
    // "erro: LOTUS_BACKUP_BUCKET ausente do .env" e sai 1. A guarda existe
    // exatamente para quem edita o `.env` do host e derruba a chave.
    const leitura = semComentarios
      .split(/\r?\n/)
      .find((linha) => linha.startsWith('BUCKET='))
    expect(leitura).toBeDefined()
    expect(leitura).toMatch(/\|\|\s*true\s*\)$/)
  })

  it('a senha do mysql vem do ambiente do container, não da linha de comando do host', () => {
    expect(semComentarios).toContain('-p"$MYSQL_ROOT_PASSWORD"')
    expect(semComentarios).toContain('docker exec "$MYSQL" sh -c')
  })

  it('publica a chave do dump sem obrigar ninguém a parsear a frase', () => {
    expect(semComentarios).toContain('LOTUS_BACKUP_SAIDA')
  })

  it('só publica a chave DEPOIS do upload — chave sem objeto no S3 é mentira', () => {
    const linhas = semComentarios.split(/\r?\n/)
    const envio = linhas.findIndex((linha) => linha.includes('aws s3 cp'))
    const chave = linhas.findIndex((linha) => linha.includes('LOTUS_BACKUP_SAIDA'))
    expect(envio).toBeGreaterThan(-1)
    expect(chave).toBeGreaterThan(envio)
  })

  it('não mexe no stdout que o cron do host consome', () => {
    expect(semComentarios).toMatch(/^echo "backup ok: /m)
  })
})
