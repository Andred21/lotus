import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

/**
 * Política e lifecycle do bucket de produção (bloco 42, spec §8). O bucket
 * guarda documento de peso legal: apagar tem de poder ser desfeito, e só quem o
 * João autorizou apaga. JSON não tem comentário, então o porquê de cada regra
 * mora aqui e no runbook `deploy/aws/README.md` §3.
 *
 * Asserção exata, e não presença: uma regra que ganha um principal na exceção,
 * perde uma ação ou vira `Allow` continua sendo JSON válido, e a política passa
 * a proteger menos sem nada quebrar.
 */
const RAIZ = resolve(__dirname, '..', '..')
const ler = (nome: string) => JSON.parse(readFileSync(join(RAIZ, 'deploy', 'aws', nome), 'utf8'))

type Regra = {
  Sid: string
  Effect: string
  Principal: unknown
  Action: string | string[]
  Resource: string | string[]
  Condition?: unknown
}
const POLITICA: { Version: string; Statement: Regra[] } = ler('s3-politica.json')
const LIFECYCLE: { Rules: Array<Record<string, unknown>> } = ler('s3-lifecycle.json')

const BUCKET = 'arn:aws:s3:::lotus-prod-760144413534'
const APP = 'arn:aws:iam::760144413534:role/lotus-ec2'
const INFRA = 'arn:aws:iam::760144413534:user/lotus-infra'
const GOVERNANCA = [
  's3:PutBucketPolicy',
  's3:DeleteBucketPolicy',
  's3:PutBucketVersioning',
  's3:PutLifecycleConfiguration',
  's3:PutBucketPublicAccessBlock',
  's3:PutEncryptionConfiguration',
  's3:PutBucketOwnershipControls',
  's3:DeleteBucket',
]

const regra = (sid: string): Regra => {
  const achada = POLITICA.Statement.find((s) => s.Sid === sid)
  if (!achada) throw new Error(`regra ${sid} ausente de deploy/aws/s3-politica.json`)
  return achada
}
const lista = (valor: string | string[]) => (Array.isArray(valor) ? valor : [valor])
const doLifecycle = (id: string) => LIFECYCLE.Rules.find((r) => r.ID === id)

describe('deploy/aws/s3-politica.json', () => {
  it('quatro regras, todas Deny para qualquer principal: a política só tira, nunca concede', () => {
    expect(POLITICA.Version).toBe('2012-10-17')
    expect(POLITICA.Statement.map((s) => s.Sid)).toEqual(['SoHttps', 'NinguemApagaDeVez', 'ApagarSoAppEInfra', 'ProtecaoSoInfra'])
    for (const s of POLITICA.Statement) {
      expect(s.Effect, s.Sid).toBe('Deny')
      expect(s.Principal, s.Sid).toBe('*')
    }
  })

  it('SoHttps: nada passa sem TLS, nem no bucket nem nos objetos', () => {
    const r = regra('SoHttps')
    expect(r.Action).toBe('s3:*')
    expect([...lista(r.Resource)].sort()).toEqual([BUCKET, `${BUCKET}/*`])
    expect(r.Condition).toEqual({ Bool: { 'aws:SecureTransport': 'false' } })
  })

  it('NinguemApagaDeVez: DeleteObjectVersion negado a todos, sem exceção nenhuma', () => {
    const r = regra('NinguemApagaDeVez')
    expect(r.Action).toBe('s3:DeleteObjectVersion')
    expect(r.Resource).toBe(`${BUCKET}/*`)
    expect(r.Condition).toBeUndefined()
  })

  it('ApagarSoAppEInfra: só o app e o lotus-infra apagam, e o apagar vira marca', () => {
    const r = regra('ApagarSoAppEInfra')
    expect(r.Action).toBe('s3:DeleteObject')
    expect(r.Resource).toBe(`${BUCKET}/*`)
    expect(r.Condition).toEqual({ ArnNotEquals: { 'aws:PrincipalArn': [APP, INFRA] } })
  })

  it('ProtecaoSoInfra: só o lotus-infra mexe na proteção do bucket', () => {
    const r = regra('ProtecaoSoInfra')
    expect(r.Resource).toBe(BUCKET)
    expect(r.Condition).toEqual({ ArnNotEquals: { 'aws:PrincipalArn': INFRA } })
    // Pode ganhar ação de governança, nunca perder uma destas (spec §8.1, regra 4).
    for (const acao of GOVERNANCA) expect(lista(r.Action), acao).toContain(acao)
  })
})

describe('deploy/aws/s3-lifecycle.json', () => {
  it('três regras: os backups, as fotos e o resto do bucket', () => {
    expect(LIFECYCLE.Rules.map((r) => r.ID)).toEqual(['expira-backups', 'fotos', 'documentos'])
  })

  it('expira-backups igual à medida em 2026-10-25: o bloco não mexe na retenção do backup', () => {
    expect(doLifecycle('expira-backups')).toEqual({
      ID: 'expira-backups',
      Status: 'Enabled',
      Filter: { Prefix: 'backups/' },
      Expiration: { Days: 30 },
      NoncurrentVersionExpiration: { NoncurrentDays: 7 },
      AbortIncompleteMultipartUpload: { DaysAfterInitiation: 7 },
    })
  })

  it('fotos: versão antiga em 1 dia, o mínimo do S3, e a marca que sobra sozinha sai', () => {
    expect(doLifecycle('fotos')).toEqual({
      ID: 'fotos',
      Status: 'Enabled',
      Filter: { Prefix: 'user-photos/' },
      Expiration: { ExpiredObjectDeleteMarker: true },
      NoncurrentVersionExpiration: { NoncurrentDays: 1 },
    })
  })

  it('documentos: filtro vazio cobre todo prefixo, inclusive os que o app ainda vai criar', () => {
    expect(doLifecycle('documentos')).toEqual({
      ID: 'documentos',
      Status: 'Enabled',
      Filter: {},
      Expiration: { ExpiredObjectDeleteMarker: true },
      NoncurrentVersionExpiration: { NoncurrentDays: 7 },
      AbortIncompleteMultipartUpload: { DaysAfterInitiation: 7 },
    })
  })
})
