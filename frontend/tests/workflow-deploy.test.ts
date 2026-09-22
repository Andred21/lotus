import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

/**
 * `.github/workflows/deploy.yml` é o botão de promoção para a produção do
 * cliente — e `.espelho-exclusoes` NÃO exclui `.github/`, então este arquivo
 * existe também em `Andred21/lotus`, que é PÚBLICO. As duas coisas que esta
 * catraca guarda não têm segunda chance: a guarda de dono e a ausência de
 * identificador de infra no fonte.
 */
const RAIZ = resolve(__dirname, '..', '..')
const YAML = readFileSync(join(RAIZ, '.github', 'workflows', 'deploy.yml'), 'utf8')
const semComentarios = YAML.split(/\r?\n/)
  .filter((linha) => !/^\s*#/.test(linha))
  .join('\n')

describe('.github/workflows/deploy.yml', () => {
  it('só promove a partir do repositório corporativo', () => {
    expect(semComentarios).toContain("github.repository == 'Gatika-CL/lotus'")
  })

  it('não dispara sozinho — só workflow_dispatch', () => {
    expect(semComentarios).toContain('workflow_dispatch:')
    expect(semComentarios).not.toMatch(/^\s{2}push:/m)
    expect(semComentarios).not.toMatch(/^\s{2}schedule:/m)
  })

  it('exige confirmação digitada contra dedo gordo', () => {
    expect(semComentarios).toContain('confirmar')
    expect(semComentarios).toContain('PROMOVER')
  })

  it('serializa sem cancelar — matar um deploy no migrate produz estado inconsistente', () => {
    expect(semComentarios).toMatch(/group:\s*producao/)
    expect(semComentarios).toMatch(/cancel-in-progress:\s*false/)
  })

  it('usa OIDC, não access key', () => {
    expect(semComentarios).toMatch(/id-token:\s*write/)
    expect(semComentarios).toContain('aws-actions/configure-aws-credentials')
    expect(semComentarios).not.toMatch(/AWS_SECRET_ACCESS_KEY/)
    expect(semComentarios).not.toMatch(/AKIA[0-9A-Z]{16}/)
  })

  it('não traz ARN nem InstanceId literais — o arquivo é público', () => {
    expect(semComentarios).not.toMatch(/arn:aws:iam::\d{12}/)
    expect(semComentarios).not.toMatch(/\bi-[0-9a-f]{8,}/)
    expect(semComentarios).toContain('secrets.AWS_DEPLOY_ROLE_ARN')
    expect(semComentarios).toContain('secrets.AWS_INSTANCE_ID')
  })

  it('invoca o caminho versionado do host, sem duplicar a sequência de deploy', () => {
    expect(semComentarios).toContain('/opt/lotus/bin/deploy.sh')
    expect(semComentarios).not.toContain('artisan migrate')
    expect(semComentarios).not.toContain('compose up')
  })

  it('não tem como contornar o gate de schema', () => {
    expect(semComentarios).not.toContain('LOTUS_ACEITAR_SCHEMA_A_FRENTE')
  })

  it('exige CI verde e SHA na main antes de promover', () => {
    expect(semComentarios).toContain('actions/workflows/ci.yml/runs')
    expect(semComentarios).toContain('compare/main...')
  })
})
