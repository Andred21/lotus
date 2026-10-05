import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { spawnSync } from 'node:child_process'
import { chmodSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

/**
 * `deploy/aws/criar-observabilidade.sh` cria, com a credencial administrativa
 * do João, a inline da EC2, os log groups, os metric filters e os quatro
 * alarmes do item 34. O que ele não pode virar:
 * - uma role que cria grupo ou muda retenção;
 * - um filtro que publica 0 onde devia calar;
 * - um alarme com limiar ou falta de dado diferentes da spec §4.4;
 * - alarmes criados antes de existir o dado que os tira de INSUFFICIENT_DATA.
 *
 * Duas metades. A política IAM é lida do heredoc e PARSEADA (padrão do
 * criar-oidc-role.test.ts). O resto roda o script DE VERDADE, com o
 * `tests/fixtures/aws-falso.sh` no PATH, que registra cada chamada com um
 * argumento por linha. É a lição 19: a catraca que só guarda a palavra deixa o
 * `exit 1` virar aviso.
 */
const RAIZ = resolve(__dirname, '..', '..')
const CAMINHO = join(RAIZ, 'deploy', 'aws', 'criar-observabilidade.sh')
const FALSO = join(__dirname, 'fixtures', 'aws-falso.sh')
const SCRIPT = readFileSync(CAMINHO, 'utf8')
const semComentarios = SCRIPT.split(/\r?\n/)
  .filter((linha) => !/^\s*#/.test(linha))
  .join('\n')

const TOPICO_FALSO = 'arn:aws:sns:sa-east-1:123456789012:lotus-alertas'
const DISCO = ['Name=Ambiente,Value=prod', 'Name=fstype,Value=ext4', 'Name=path,Value=/']
const P_5XX_REGEX = '{ $.log = %HTTP/[0-9.]+..5[0-9]{2}.% }'
const P_5XX_LITERAL =
  '{ ($.log = "*HTTP/1.1\\" 5*") || ($.log = "*HTTP/2.0\\" 5*") || ($.log = "*HTTP/1.0\\" 5*") }'

/** A tabela da spec §4.4, flag a flag. Mudar um número aqui é mudar a spec. */
const ALARMES: Record<string, Record<string, string | string[]>> = {
  'lotus-prod-up': {
    '--namespace': 'Lotus/Sonda', '--metric-name': 'Up', '--dimensions': [],
    '--statistic': 'Minimum', '--period': '60', '--evaluation-periods': '5', '--datapoints-to-alarm': '3',
    '--comparison-operator': 'LessThanThreshold', '--threshold': '1', '--treat-missing-data': 'breaching',
  },
  'lotus-prod-5xx': {
    '--namespace': 'Lotus/Sonda', '--metric-name': 'Http5xx', '--dimensions': [],
    '--statistic': 'Sum', '--period': '300', '--evaluation-periods': '1', '--datapoints-to-alarm': '1',
    '--comparison-operator': 'GreaterThanOrEqualToThreshold', '--threshold': '5', '--treat-missing-data': 'notBreaching',
  },
  'lotus-prod-disco': {
    '--namespace': 'Lotus/Host', '--metric-name': 'disk_used_percent', '--dimensions': DISCO,
    '--statistic': 'Maximum', '--period': '300', '--evaluation-periods': '2', '--datapoints-to-alarm': '2',
    '--comparison-operator': 'GreaterThanThreshold', '--threshold': '80', '--treat-missing-data': 'ignore',
  },
  'lotus-prod-certificado': {
    '--namespace': 'Lotus/Sonda', '--metric-name': 'CertDias', '--dimensions': [],
    '--statistic': 'Minimum', '--period': '300', '--evaluation-periods': '1', '--datapoints-to-alarm': '1',
    '--comparison-operator': 'LessThanThreshold', '--threshold': '21', '--treat-missing-data': 'ignore',
  },
}

type Statement = {
  Effect: string
  Action: string | string[]
  Resource: string | string[]
  Condition?: Record<string, Record<string, string>>
}

const politica = (): Statement[] => {
  expect(SCRIPT.match(/cat > "\$TMP\/observabilidade\.json"/g)).toHaveLength(1)
  const achado = SCRIPT.match(/cat > "\$TMP\/observabilidade\.json" <<JSON\n([\s\S]*?)\nJSON$/m)
  if (!achado) throw new Error(`heredoc da lotus-observabilidade não encontrado em ${CAMINHO}`)
  return (JSON.parse(achado[1]) as { Statement: Statement[] }).Statement
}

let base: string
let bin: string
let contador = 0

beforeAll(() => {
  base = mkdtempSync(join(tmpdir(), 'criar-observabilidade-'))
  bin = join(base, 'bin')
  mkdirSync(bin)
  copyFileSync(FALSO, join(bin, 'aws'))
  chmodSync(join(bin, 'aws'), 0o755)
})

afterAll(() => {
  rmSync(base, { recursive: true, force: true })
})

type Execucao = { status: number | null; stderr: string; chamadas: string[][] }

/** Roda o script com o `aws` falso na frente do PATH. `env` liga os FAKE_* da fixture. */
const rodar = (args: string[], env: Record<string, string> = {}): Execucao => {
  contador += 1
  const log = join(base, `chamadas-${contador}.log`)
  const r = spawnSync('bash', [CAMINHO, ...args], {
    encoding: 'utf8',
    env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, FAKE_LOG: log, ...env },
  })
  const chamadas = existsSync(log)
    ? readFileSync(log, 'utf8')
        .split('---\n')
        .filter(Boolean)
        .map((bloco) => bloco.replace(/\n$/, '').split('\n'))
    : []
  return { status: r.status, stderr: r.stderr, chamadas }
}

const doTipo = (e: Execucao, servico: string, verbo: string) =>
  e.chamadas.filter((c) => c[0] === servico && c[1] === verbo)

/** Os valores de uma flag: tudo o que vem depois dela, até a próxima `--flag`. */
const valores = (chamada: string[], flag: string): string[] => {
  const i = chamada.indexOf(flag)
  if (i === -1) return []
  const fim = chamada.findIndex((arg, j) => j > i && arg.startsWith('--'))
  return chamada.slice(i + 1, fim === -1 ? undefined : fim)
}
const valor = (chamada: string[], flag: string) => valores(chamada, flag)[0]

const primeiraPosicao = (e: Execucao, servico: string, verbo: string) =>
  e.chamadas.findIndex((c) => c[0] === servico && c[1] === verbo)
const ultimaPosicao = (e: Execucao, servico: string, verbo: string) =>
  e.chamadas.map((c) => c[0] === servico && c[1] === verbo).lastIndexOf(true)

describe('deploy/aws/criar-observabilidade.sh — arquivo', () => {
  it('é executável, falha alto e não deixa a política no /tmp', () => {
    expect(statSync(CAMINHO).mode & 0o111).not.toBe(0)
    expect(semComentarios).toMatch(/^set -euo pipefail$/m)
    expect(semComentarios).toMatch(/^trap 'rm -rf "\$TMP"' EXIT$/m)
  })

  it('nenhum número de conta nem ARN fixo — a conta vem do sts', () => {
    expect(SCRIPT).not.toMatch(/\d{12}/)
    expect(semComentarios).toMatch(/^TOPICO="arn:aws:sns:\$REGIAO:\$CONTA:lotus-alertas"$/m)
  })

  it('a inline da EC2 é mínima: não cria grupo nem muda retenção', () => {
    const statements = politica()
    expect(statements.map((s) => s.Effect)).toEqual(['Allow', 'Allow'])
    expect(statements.flatMap((s) => [s.Action].flat()).sort()).toEqual([
      'cloudwatch:PutMetricData',
      'logs:CreateLogStream',
      'logs:DescribeLogStreams',
      'logs:PutLogEvents',
    ])
    const logs = statements.find((s) => [s.Action].flat().includes('logs:PutLogEvents'))
    expect(logs?.Resource).toEqual([
      'arn:aws:logs:$REGIAO:$CONTA:log-group:/lotus/*',
      'arn:aws:logs:$REGIAO:$CONTA:log-group:/lotus/*:log-stream:*',
    ])
    const metricas = statements.find((s) => s.Action === 'cloudwatch:PutMetricData')
    expect(metricas?.Resource).toBe('*')
    expect(metricas?.Condition).toEqual({ StringEquals: { 'cloudwatch:namespace': 'Lotus/Host' } })
    // A única concessão do script é esta inline, na lotus-ec2, com o documento parseado acima.
    expect(semComentarios.match(/(attach|put)-role-policy/g) ?? []).toHaveLength(1)
    expect(semComentarios).toMatch(
      /aws iam put-role-policy --role-name lotus-ec2 --policy-name lotus-observabilidade \\\n\s+--policy-document "file:\/\/\$TMP\/observabilidade\.json"/,
    )
  })

  it('as linhas de prova do 5xx são a mesma requisição da de 200, com outro status', () => {
    const linha = (nome: string) => semComentarios.match(new RegExp(`^${nome}='(.+)'$`, 'm'))?.[1]
    const n200 = linha('NGINX_200')
    const h2200 = linha('NGINX_H2_200')
    expect(n200).toContain('\\" 200 ')
    expect(h2200).toContain('HTTP/2.0\\" 200 ')
    expect(linha('NGINX_502')).toBe(n200?.replace('\\" 200 ', '\\" 502 '))
    expect(linha('NGINX_H2_503')).toBe(h2200?.replace('\\" 200 ', '\\" 503 '))
  })

  it.each([[[]], [['base']], [['base', 'teste']], [['alarmes', 'prod']], [['outra']]])(
    'uso errado %j sai 2 sem chamar a AWS',
    (args) => {
      const e = rodar(args)
      expect(e.status).toBe(2)
      expect(e.chamadas).toEqual([])
    },
  )
})

describe('criar-observabilidade.sh base', () => {
  it('prod: grupos de 30 dias e os três filtros, cada padrão conferido antes de qualquer put', () => {
    const e = rodar(['base', 'prod'], { FAKE_RETENCAO: '30' })
    expect(e.status, e.stderr).toBe(0)
    expect(doTipo(e, 'logs', 'create-log-group').map((c) => valor(c, '--log-group-name'))).toEqual([
      '/lotus/prod/containers',
      '/lotus/prod/sonda',
    ])
    for (const c of doTipo(e, 'logs', 'put-retention-policy')) expect(valor(c, '--retention-in-days')).toBe('30')
    expect(ultimaPosicao(e, 'logs', 'test-metric-filter')).toBeLessThan(primeiraPosicao(e, 'logs', 'put-metric-filter'))

    const filtros = doTipo(e, 'logs', 'put-metric-filter')
    expect(filtros.map((c) => [valor(c, '--log-group-name'), valor(c, '--filter-name'), valor(c, '--metric-transformations')])).toEqual([
      ['/lotus/prod/sonda', 'Up', 'metricName=Up,metricNamespace=Lotus/Sonda,metricValue=$.up'],
      ['/lotus/prod/sonda', 'CertDias', 'metricName=CertDias,metricNamespace=Lotus/Sonda,metricValue=$.cert_dias'],
      ['/lotus/prod/containers', 'Http5xx', 'metricName=Http5xx,metricNamespace=Lotus/Sonda,metricValue=1,defaultValue=0'],
    ])
    expect(valor(filtros[2], '--filter-pattern')).toBe(P_5XX_REGEX)
  })

  it('lab: 1 dia e nenhum filtro — filtro no lab publicaria na métrica de produção', () => {
    const e = rodar(['base', 'lab'], { FAKE_RETENCAO: '1' })
    expect(e.status, e.stderr).toBe(0)
    for (const c of doTipo(e, 'logs', 'put-retention-policy')) {
      expect(valor(c, '--log-group-name')).toMatch(/^\/lotus\/lab\//)
      expect(valor(c, '--retention-in-days')).toBe('1')
    }
    expect(doTipo(e, 'logs', 'test-metric-filter').length).toBeGreaterThan(0)
    expect(doTipo(e, 'logs', 'put-metric-filter')).toEqual([])
  })

  it('regex recusada: o 5xx sai com o termo literal', () => {
    const e = rodar(['base', 'prod'], { FAKE_RETENCAO: '30', FAKE_RECUSA_REGEX: '1' })
    expect(e.status, e.stderr).toBe(0)
    const http5xx = doTipo(e, 'logs', 'put-metric-filter').find((c) => valor(c, '--filter-name') === 'Http5xx')
    expect(valor(http5xx!, '--filter-pattern')).toBe(P_5XX_LITERAL)
  })

  it('as duas formas recusadas: portão D14, sem filtro nenhum', () => {
    const e = rodar(['base', 'prod'], { FAKE_RETENCAO: '30', FAKE_RECUSA_REGEX: '1', FAKE_RECUSA_LITERAL: '1' })
    expect(e.status).toBe(1)
    expect(e.stderr).toContain('PORTAO D14')
    expect(doTipo(e, 'logs', 'put-metric-filter')).toEqual([])
  })

  it('retenção diferente no readback sai 1', () => {
    const e = rodar(['base', 'prod'], { FAKE_RETENCAO: '7' })
    expect(e.status).toBe(1)
    expect(e.stderr).toContain('retencao')
  })
})

describe('criar-observabilidade.sh alarmes', () => {
  it('os quatro alarmes iguais à spec §4.4, com ALARM e OK no tópico', () => {
    const e = rodar(['alarmes'])
    expect(e.status, e.stderr).toBe(0)
    const criados = doTipo(e, 'cloudwatch', 'put-metric-alarm')
    expect(criados.map((c) => valor(c, '--alarm-name'))).toEqual(Object.keys(ALARMES))
    for (const chamada of criados) {
      const esperado = ALARMES[valor(chamada, '--alarm-name')]
      for (const [flag, valorEsperado] of Object.entries(esperado)) {
        if (Array.isArray(valorEsperado)) expect(valores(chamada, flag), flag).toEqual(valorEsperado)
        else expect(valor(chamada, flag), flag).toBe(valorEsperado)
      }
      expect(valores(chamada, '--alarm-actions')).toEqual([TOPICO_FALSO])
      expect(valores(chamada, '--ok-actions')).toEqual([TOPICO_FALSO])
      expect(valor(chamada, '--alarm-description')).toContain('deploy/aws/README.md secao 14.6')
    }
    // A recusa do disco pergunta pelas MESMAS dimensões que o alarme usa.
    const consulta = doTipo(e, 'cloudwatch', 'get-metric-statistics').find(
      (c) => valor(c, '--metric-name') === 'disk_used_percent',
    )
    expect(valores(consulta!, '--dimensions')).toEqual(DISCO)
  })

  it('recusa sem Up recente, sem criar alarme', () => {
    const e = rodar(['alarmes'], { FAKE_UP: '0' })
    expect(e.status).toBe(1)
    expect(e.stderr).toContain('sem Lotus/Sonda Up')
    expect(doTipo(e, 'cloudwatch', 'put-metric-alarm')).toEqual([])
  })

  it('recusa sem a métrica de disco com as dimensões do alarme', () => {
    const e = rodar(['alarmes'], { FAKE_DISCO: '0' })
    expect(e.status).toBe(1)
    expect(e.stderr).toContain('disk_used_percent')
    expect(doTipo(e, 'cloudwatch', 'put-metric-alarm')).toEqual([])
  })

  it('recusa sem assinatura confirmada — PendingConfirmation não conta', () => {
    const e = rodar(['alarmes'], { FAKE_ASSINATURAS: '0' })
    expect(e.status).toBe(1)
    expect(e.stderr).toContain('assinatura confirmada')
    expect(doTipo(e, 'cloudwatch', 'put-metric-alarm')).toEqual([])
    const consulta = doTipo(e, 'sns', 'list-subscriptions-by-topic')[0]
    expect(valor(consulta, '--query')).toBe("length(Subscriptions[?starts_with(SubscriptionArn, 'arn:')])")
  })
})
