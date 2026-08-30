import { describe, expect, it } from 'vitest'
import { readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

/**
 * `scripts/provar-release.sh` é a especificação executável da sequência que o
 * servidor fará no deploy (login → pull → migrate → up → /up). Ele atravessa
 * o espelho e roda contra o registry corporativo, então as propriedades que o
 * tornam PROVA — e não só mais um `up` — ganham catraca (lição 19): nada é
 * construído localmente, nada é puxado por baixo dos panos no `up`, o projeto
 * Compose é próprio, o env é o de sonda e a máquina volta ao que era.
 *
 * Conferência textual pelo mesmo motivo do compose-prod.test.ts: o
 * comportamento se prova rodando o script (o plano do bloco faz isso, duas
 * vezes); a catraca existe para a regressão silenciosa — alguém tirar o
 * `--pull never` "porque estava lento" e a prova passar a rodar outra imagem.
 */
const RAIZ = resolve(__dirname, '..', '..')
const CAMINHO = join(RAIZ, 'scripts', 'provar-release.sh')
const SCRIPT = readFileSync(CAMINHO, 'utf8')
const semComentarios = SCRIPT.split(/\r?\n/)
  .filter((linha) => !/^\s*#/.test(linha))
  .join('\n')

describe('scripts/provar-release.sh', () => {
  it('é executável', () => {
    expect(statSync(CAMINHO).mode & 0o111).not.toBe(0)
  })

  it('falha alto em erro, variável indefinida e pipe quebrado', () => {
    expect(semComentarios).toMatch(/^set -euo pipefail$/m)
  })

  it('sobe num projeto Compose próprio, com o compose de produção e o overlay de sonda', () => {
    expect(semComentarios).toContain('PROJETO=lotus-release')
    expect(semComentarios).toContain(
      'docker compose -p "$PROJETO" -f docker-compose.prod.yml -f docker-compose.prod-probe.yml',
    )
  })

  it('aponta o app para o env de sonda e a porta 8081', () => {
    expect(semComentarios).toContain('LOTUS_ENV_FILE=docker/probe.env')
    expect(semComentarios).toContain('PORTA=8081')
    expect(semComentarios).toContain('LOTUS_HTTP_PORT="$PORTA"')
  })

  it('exige os dois manifestos antes de tocar o Docker local', () => {
    expect(semComentarios).toContain('docker manifest inspect')
  })

  it('reproduz o fluxo de deploy: pull, migrate, up — e o up não constrói nem puxa nada', () => {
    const pull = semComentarios.indexOf('compose pull')
    const migrate = semComentarios.indexOf('php artisan migrate --force')
    const up = semComentarios.indexOf('up -d --no-build --pull never')
    expect(pull).toBeGreaterThan(-1)
    expect(migrate).toBeGreaterThan(pull)
    expect(up).toBeGreaterThan(migrate)
  })

  it('julga por GET /up 200 e imprime os dois RepoDigests', () => {
    expect(semComentarios).toContain('/up')
    expect(semComentarios).toContain('RepoDigests')
  })

  it('derruba o projeto com down -v em trap, com sucesso ou sem', () => {
    expect(semComentarios).toContain('down -v')
    expect(semComentarios).toMatch(/^trap limpar EXIT$/m)
  })
})
