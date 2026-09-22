import { describe, expect, it } from 'vitest'
import { readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

/**
 * `deploy/aws/criar-oidc-e-role.sh` é o único caminho versionado para a
 * identidade que promove release. O que ele não pode virar: uma role ampla, uma
 * trust aberta a qualquer repositório, ou um script que termina verde com o
 * agente SSM morto — role perfeita com agente morto não promove nada.
 */
const RAIZ = resolve(__dirname, '..', '..')
const CAMINHO = join(RAIZ, 'deploy', 'aws', 'criar-oidc-e-role.sh')
const SCRIPT = readFileSync(CAMINHO, 'utf8')
const semComentarios = SCRIPT.split(/\r?\n/)
  .filter((linha) => !/^\s*#/.test(linha))
  .join('\n')

describe('deploy/aws/criar-oidc-e-role.sh', () => {
  it('é executável e falha alto', () => {
    expect(statSync(CAMINHO).mode & 0o111).not.toBe(0)
    expect(semComentarios).toMatch(/^set -euo pipefail$/m)
  })

  it('fixa a trust na main do repositório corporativo', () => {
    expect(semComentarios).toContain('repo:$REPO:ref:refs/heads/main')
    expect(semComentarios).toContain('sts.amazonaws.com')
  })

  it('não usa curinga na condição de sub — trust aberta é conta aberta', () => {
    expect(semComentarios).not.toMatch(/"?[^"]*:sub"?\s*:\s*"[^"]*\*/)
    expect(semComentarios).toContain('StringEquals')
  })

  it('a política é mínima: um comando, uma instância, um documento', () => {
    expect(semComentarios).toContain('ssm:SendCommand')
    expect(semComentarios).toContain('instance/$INSTANCIA')
    expect(semComentarios).toContain('document/AWS-RunShellScript')
    expect(semComentarios).not.toContain('ssm:StartSession')
    expect(semComentarios).not.toMatch(/"Action"\s*:\s*"\*"/)
  })

  it('é idempotente — reexecutar não estraga nada', () => {
    expect(semComentarios).toContain('get-open-id-connect-provider')
    expect(semComentarios).toContain('update-assume-role-policy')
  })

  it('exige o agente SSM Online no readback', () => {
    expect(semComentarios).toContain('describe-instance-information')
    expect(semComentarios).toContain('PingStatus')
    expect(semComentarios).toMatch(/\[ "\$PING" = "Online" \]/)
  })

  it('não deixa documento de política no /tmp depois de rodar', () => {
    expect(semComentarios).toMatch(/^trap .* EXIT$/m)
  })
})
