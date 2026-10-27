import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

/**
 * O runbook `deploy/aws/README.md` depois do bloco 42 (higiene da produção).
 * Q-1 do bloco 13: `docker rm` sem `-v` deixou no host um volume anônimo com uma
 * cópia do banco de produção. O §7 é a lista do que vai ao host: script de
 * `deploy/bin/` fora dela trava o botão no sha256 de `bin/` (item 31). E o §3 é
 * a ordem de aplicar a política do bucket, com a saída de emergência antes.
 */
const RAIZ = resolve(__dirname, '..', '..')
const RUNBOOK = readFileSync(join(RAIZ, 'deploy', 'aws', 'README.md'), 'utf8')
const secao = (inicio: string, fim: string): string => {
  const a = RUNBOOK.indexOf(inicio)
  expect(a, inicio).toBeGreaterThan(-1)
  const b = fim === '' ? RUNBOOK.length : RUNBOOK.indexOf(fim, a + 1)
  expect(b, fim).toBeGreaterThan(a)
  return RUNBOOK.slice(a, b)
}

describe('deploy/aws/README.md — higiene da produção (bloco 42)', () => {
  it('Q-1: contêiner descartável sai com o volume anônimo, no runbook inteiro', () => {
    expect(RUNBOOK).not.toMatch(/docker rm -f\s/)
    expect(RUNBOOK.match(/docker rm -fv /g)?.length ?? 0).toBeGreaterThanOrEqual(3)
  })

  it('§7 leva o podar-imagens.sh ao host — sem ele o botão trava no sha256 de bin/', () => {
    const s7 = secao('\n## 7. ', '\n## 8. ')
    expect(s7).toMatch(/^scp .*deploy\/bin\/podar-imagens\.sh/m)
    expect(s7).toMatch(/^sudo mv .*\/tmp\/podar-imagens\.sh/m)
  })

  it('§3: lifecycle, prova da saída pelo IAM e só então a política, dos arquivos versionados', () => {
    const s3 = secao('\n## 3. ', '\n### 3.1 ')
    const lifecycle = s3.indexOf('--lifecycle-configuration file://deploy/aws/s3-lifecycle.json')
    const saida = s3.indexOf('--action-names s3:PutBucketPolicy s3:DeleteBucketPolicy')
    const chave = s3.indexOf('--action-names iam:CreateAccessKey')
    const politica = s3.indexOf('--policy file://deploy/aws/s3-politica.json')
    expect(lifecycle).toBeGreaterThan(-1)
    expect(saida).toBeGreaterThan(lifecycle)
    expect(chave).toBeGreaterThan(saida)
    expect(politica).toBeGreaterThan(chave)
    // sem a política de recurso, o simulador avalia só a de identidade e dá allowed sempre
    const simulacao = s3.slice(saida, chave)
    expect(simulacao).toContain('--resource-policy file://deploy/aws/s3-politica.json')
    expect(simulacao).toContain(
      'ContextKeyName=aws:PrincipalArn,ContextKeyValues=arn:aws:iam::760144413534:user/lotus-infra',
    )
    expect(s3).toContain('https://docs.aws.amazon.com/AmazonS3/latest/userguide/lifecycle-conflicts.html')
    expect(s3).toContain('aws s3api delete-bucket-policy --bucket lotus-prod-760144413534')
    // ruling 6 do bloco 42: o João não tem as credenciais da raiz da conta
    expect(s3).not.toContain('login da raiz')
  })

  it('§3.1 desfaz um apagão copiando a versão anterior por cima da chave', () => {
    const s31 = secao('\n### 3.1 ', '\n## 4. ')
    expect(s31).toContain('aws s3api list-object-versions')
    expect(s31).toContain('--copy-source "lotus-prod-760144413534/<chave>?versionId=<id>"')
    expect(s31).toContain('s3:DeleteObjectVersion')
  })

  it('§14.6: o alarme de disco aponta a poda do §16.1', () => {
    const disco = secao('**`lotus-prod-disco`.**', '**`lotus-prod-certificado`.**')
    expect(disco).toContain('§16.1')
    expect(disco).toContain('aviso: a poda de imagens falhou')
  })

  it('§16: a poda à mão, os três arquivos do user-data e a janela manual', () => {
    const s16 = secao('\n## 16. ', '')
    expect(s16).toContain(`sudo sh -c '/opt/lotus/bin/podar-imagens.sh "$(cat /opt/lotus/CURRENT_SHA)"'`)
    // a saída 1 do podar-imagens.sh também vem de listagem ou prune que falham
    expect(s16).toContain('erro: docker image ls falhou')
    expect(s16).toContain('erro: docker image prune falhou')
    for (const arquivo of [
      '/etc/systemd/journald.conf.d/lotus.conf',
      '/etc/apt/apt.conf.d/52lotus-limpeza',
      '/etc/apt/apt.conf.d/53lotus-reboot',
    ]) {
      expect(s16).toContain(arquivo)
    }
    expect(s16).toContain('08:30')
    expect(s16).toContain('§14.7')
    expect(s16).toContain('apt list --upgradable')
  })
})
