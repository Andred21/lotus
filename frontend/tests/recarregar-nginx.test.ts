import { describe, expect, it } from 'vitest'
import { readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

/**
 * `deploy/bin/recarregar-nginx.sh` é o deploy hook do certbot (runbook §11): certificado renovado
 * em /etc/letsencrypt, nginx recarrega. Até o item 32 o hook existia só como texto no runbook —
 * com `restart nginx`, que derruba a 443 a cada renovação — fora do repositório e fora da
 * conferência de alinhamento do botão. Agora mora em `deploy/bin/`, então a conferência o exige
 * no host como aos outros, e esta catraca guarda o que o texto não segurava (lição 19).
 *
 * Textual, como `deploy-sh.test.ts`: o comportamento se prova executando o hook em produção
 * (Task 11 do plano do item 32).
 */
const RAIZ = resolve(__dirname, '..', '..')
const CAMINHO = join(RAIZ, 'deploy', 'bin', 'recarregar-nginx.sh')
const SCRIPT = readFileSync(CAMINHO, 'utf8')
const semComentarios = SCRIPT.split(/\r?\n/)
  .filter((linha) => !/^\s*#/.test(linha))
  .join('\n')
/** O comando inteiro numa linha, com as continuações `\` coladas. */
const comando = semComentarios.replace(/\\\n\s*/g, ' ')

describe('deploy/bin/recarregar-nginx.sh', () => {
  it('é executável', () => {
    expect(statSync(CAMINHO).mode & 0o111).not.toBe(0)
  })

  it('falha alto em erro, variável indefinida e pipe quebrado', () => {
    expect(semComentarios).toMatch(/^set -euo pipefail$/m)
  })

  it('fala com o MESMO projeto compose do deploy.sh — -p lotus, /opt/lotus e os dois arquivos', () => {
    // Sem o -p e os dois -f o compose não acha o serviço `nginx` que o deploy.sh subiu.
    expect(semComentarios).toMatch(/^BASE=\/opt\/lotus$/m)
    expect(comando).toMatch(/docker compose -p lotus --project-directory "\$BASE"/)
    expect(comando).toContain('-f "$BASE/docker-compose.prod.yml"')
    expect(comando).toContain('-f "$BASE/docker-compose.prod-tls.yml"')
  })

  it('testa a conf ANTES de recarregar, no mesmo comando — conf ou certificado quebrado não derruba o nginx', () => {
    // Âncora de fim: sem ela, um `|| true` colado depois do reload (silencia falha do nginx -t)
    // passaria pela mesma regex (lição 19).
    expect(comando).toMatch(/exec -T nginx sh -c 'nginx -t && nginx -s reload'\s*$/)
  })

  it('recarrega, nunca reinicia — restart/stop/down/up derrubam a 443 na renovação', () => {
    expect(comando).not.toMatch(/\b(restart|stop|down|up)\b/)
  })
})
