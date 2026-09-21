import { describe, expect, it } from 'vitest'
import { readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

/**
 * `deploy/bin/deploy.sh` é a única sequência de deploy do projeto: o botão do
 * item 12 não a reescreve, ele a INVOCA por SSM. Até 2026-09-21 o script não
 * tinha catraca nenhuma, embora a lição 19 já listasse `deploy/bin/*.sh` entre
 * os pares guardados — glob na lição não é asserção no arquivo.
 *
 * Conferência textual pelo mesmo motivo do backup-db.test.ts: o comportamento se
 * prova rodando contra a produção (tasks 9 a 12 do plano); a catraca guarda a
 * regressão silenciosa.
 */
const RAIZ = resolve(__dirname, '..', '..')
const CAMINHO = join(RAIZ, 'deploy', 'bin', 'deploy.sh')
const SCRIPT = readFileSync(CAMINHO, 'utf8')
const semComentarios = SCRIPT.split(/\r?\n/)
  .filter((linha) => !/^\s*#/.test(linha))
  .join('\n')
const linhas = semComentarios.split(/\r?\n/)
const indiceDe = (agulha: string) => linhas.findIndex((linha) => linha.includes(agulha))

describe('deploy/bin/deploy.sh', () => {
  it('é executável', () => {
    expect(statSync(CAMINHO).mode & 0o111).not.toBe(0)
  })

  it('falha alto em erro, variável indefinida e pipe quebrado', () => {
    expect(semComentarios).toMatch(/^set -euo pipefail$/m)
  })

  it('pega o cadeado sem bloquear e antes de qualquer escrita', () => {
    expect(semComentarios).toMatch(/flock -n 9/)
    const cadeado = indiceDe('flock -n 9')
    expect(cadeado).toBeGreaterThan(-1)
    expect(cadeado).toBeLessThan(indiceDe('docker login'))
  })

  it('abre o cadeado em APPEND — truncar apagaria o PID do detentor', () => {
    expect(semComentarios).toMatch(/exec 9>>/)
    expect(semComentarios).not.toMatch(/exec 9>[^>]/)
  })

  it('grava CURRENT_SHA por mv atômico, nunca por redirecionamento', () => {
    expect(semComentarios).toMatch(/mv -f .* "\$BASE\/CURRENT_SHA"/)
    expect(semComentarios).not.toMatch(/> "\$BASE\/CURRENT_SHA"/)
  })

  it('mantém a conferência de digest puxado contra digest em execução', () => {
    expect(semComentarios).toContain('ID_PUXADO')
    expect(semComentarios).toContain('ID_RODANDO')
    expect(indiceDe('ID_RODANDO')).toBeLessThan(indiceDe('CURRENT_SHA'))
  })

  it('exige os três manifestos antes de puxar', () => {
    expect(semComentarios.match(/docker manifest inspect/g)).toHaveLength(3)
    expect(indiceDe('docker manifest inspect')).toBeLessThan(indiceDe('compose pull'))
  })

  it('mede o schema APLICADO no banco, não um diff de arquivos', () => {
    expect(semComentarios).toContain('SELECT migration FROM migrations')
  })

  it('mede o schema CONHECIDO pela imagem alvo, não pela árvore de trabalho', () => {
    expect(semComentarios).toMatch(/docker run --rm --entrypoint sh "\$APP"/)
    expect(semComentarios).toContain('/var/www/database/migrations')
  })

  it('o gate roda depois do pull e antes do migrate', () => {
    const gate = indiceDe('A_FRENTE=')
    expect(gate).toBeGreaterThan(indiceDe('compose pull'))
    expect(gate).toBeLessThan(indiceDe('artisan migrate'))
  })

  it('recusa alvo cujo schema o banco já ultrapassou', () => {
    expect(semComentarios).toMatch(/exit 4/)
    expect(semComentarios).toContain('LOTUS_ACEITAR_SCHEMA_A_FRENTE')
  })
})
