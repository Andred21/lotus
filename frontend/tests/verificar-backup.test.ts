import { describe, expect, it } from 'vitest'
import { readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

/**
 * `deploy/bin/verificar-backup.sh` é a DETECÇÃO do gatilho de reversão do
 * ADR-09 (revisão 2026-09). O descarte do RDS foi pago com "backup provado" e a
 * revisão escreveu o gatilho de volta — backup > 7 dias sem sucesso, volta-se ao
 * RDS —, mas ninguém saberia que passaram 7 dias: o cron do `backup-db.sh` manda
 * o resultado para um log local que nada lê e o host não tem MTA. Era o Q-4 do
 * review de 2026-09-20.
 *
 * O comportamento foi provado em sonda no mesmo dia, com `aws` e `.env` de
 * mentira e `LOTUS_BASE` apontando para o scratchpad: backup do dia sai 0 sem
 * publicar; backup de 5 dias e bucket vazio saem 1 e publicam; `.env` sem
 * `LOTUS_ALERT_TOPIC_ARN` sai 1 ANTES de consultar o S3; e o publish foi para
 * `--region us-east-1`, lido do ARN.
 *
 * Esta catraca guarda a regressão silenciosa das propriedades que fazem o aviso
 * chegar — nenhuma delas quebra o `bash -n`, e todas transformam o script de
 * volta no log que ninguém lê.
 */
const RAIZ = resolve(__dirname, '..', '..')
const CAMINHO = join(RAIZ, 'deploy', 'bin', 'verificar-backup.sh')
const SCRIPT = readFileSync(CAMINHO, 'utf8')
const semComentarios = SCRIPT.split(/\r?\n/)
  .filter((linha) => !/^\s*#/.test(linha))
  .join('\n')

describe('deploy/bin/verificar-backup.sh', () => {
  it('é executável', () => {
    expect(statSync(CAMINHO).mode & 0o111).not.toBe(0)
  })

  it('falha alto em erro, variável indefinida e pipe quebrado', () => {
    expect(semComentarios).toMatch(/^set -euo pipefail$/m)
  })

  it('olha o EFEITO no S3, não o log local nem o processo', () => {
    expect(semComentarios).toContain('aws s3api list-objects-v2')
    expect(semComentarios).toContain('sort_by(Contents,&LastModified)[-1].LastModified')
    expect(semComentarios).not.toContain('/var/log/lotus-backup.log')
  })

  it('lê só as chaves que consome, sem `source` do .env inteiro', () => {
    expect(semComentarios).toMatch(/grep -E "\^\$1=" "\$BASE\/\.env"/)
    expect(semComentarios).not.toMatch(/^\s*(source|\.)\s+"\$BASE\/\.env"/m)
  })

  it('a leitura das chaves tolera ausência — senão `set -e` mata antes da guarda', () => {
    // O mesmo defeito que o Q-5 achou no backup-db.sh: sem o `|| true`, grep
    // sem match sai 1, pipefail propaga e o script morre na atribuição, antes
    // da mensagem que explicaria o quê.
    const leitura = semComentarios.split(/\r?\n/).find((l) => l.includes('grep -E "^$1="'))
    expect(leitura).toBeDefined()
    expect(leitura).toMatch(/\|\|\s*true\s*;?\s*\}?\s*$/)
  })

  it('RECUSA rodar sem canal de alerta, em vez de degradar para o silêncio', () => {
    expect(semComentarios).toContain('LOTUS_ALERT_TOPIC_ARN')
    const guarda = semComentarios.split(/\r?\n/).find((l) => l.includes('sem canal nao ha aviso'))
    expect(guarda).toBeDefined()
    expect(guarda).toContain('exit 1')
  })

  it('deriva a região do próprio ARN — o tópico vive em us-east-1 e a EC2 em sa-east-1', () => {
    expect(semComentarios).toMatch(/REGIAO=\$\(printf '%s' "\$TOPICO" \| cut -d: -f4\)/)
    expect(semComentarios).toContain('aws sns publish --region "$REGIAO"')
  })

  it('o caminho de alerta publica E sai não-zero — aviso sem falha vira verde no cron', () => {
    const inicio = semComentarios.indexOf('gritar() {')
    const fim = semComentarios.indexOf('\n}', inicio)
    const corpo = semComentarios.slice(inicio, fim)
    expect(corpo).toContain('aws sns publish')
    expect(corpo).toMatch(/^\s*exit 1$/m)
  })

  it('avisa antes dos 7 dias do ADR — o gatilho é decisão, não descoberta', () => {
    const limite = semComentarios.match(/LIMITE_DIAS="\$\{LOTUS_BACKUP_MAX_DIAS:-(\d+)\}"/)
    expect(limite).not.toBeNull()
    expect(Number(limite![1])).toBeLessThan(7)
  })
})
