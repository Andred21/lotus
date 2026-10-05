import { describe, expect, it } from 'vitest'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

/**
 * `deploy/aws/user-data.sh` é o recreate da EC2 e também o REPARO do host vivo
 * (guardas de reexecução). Desde o item 34 ele instala o CloudWatch agent e o
 * timer da sonda. Rodado no host de produção, ele não pode:
 * - subir versão de pacote — o upgrade do Docker reinicia todos os contêineres;
 * - reiniciar o agente à toa;
 * - escrever uma config que o tradutor do agente recuse. O `set -e` derrubaria
 *   o resto do arquivo depois de o agente já estar instalado.
 *
 * A config do agente é lida do heredoc e PARSEADA, não procurada por
 * substring: substring prova presença, nunca ausência (o padrão do
 * criar-oidc-role.test.ts). A validação de AMBIENTE roda de verdade, mas só o
 * trecho até o `esac`, que não toca no host.
 */
const RAIZ = resolve(__dirname, '..', '..')
const CAMINHO = join(RAIZ, 'deploy', 'aws', 'user-data.sh')
const SCRIPT = readFileSync(CAMINHO, 'utf8')
const LINHAS = SCRIPT.split(/\r?\n/)
const semComentarios = LINHAS.filter((linha) => !/^\s*#/.test(linha)).join('\n')

/**
 * As chaves que o schema do agente aceita num item de `collect_list`, que é
 * `additionalProperties: false`. Lidas do
 * `/opt/aws/amazon-cloudwatch-agent/doc/amazon-cloudwatch-agent-schema.json` do
 * `.deb` 1.300073.2b1889, em 2026-10-04. `from_beginning` NÃO está aqui: o
 * schema a recusa, e o tradutor já usa `true` quando ela falta
 * (`ruleFromBeginning.go`). Trocar a versão do agente é reler esta lista.
 */
const CHAVES_DE_COLLECT_LIST = new Set([
  'auto_removal', 'backpressure_mode', 'blacklist', 'deployment.environment', 'encoding',
  'file_path', 'filters', 'log_group_class', 'log_group_name', 'log_stream_name',
  'multi_line_start_pattern', 'publish_multi_logs', 'retention_in_days', 'service.name',
  'timestamp_format', 'timezone', 'trim_timestamp',
])

type ConfigDoAgente = {
  agent: Record<string, unknown>
  metrics: { namespace: string; metrics_collected: Record<string, Record<string, unknown>> }
  logs: { logs_collected: { files: { collect_list: Record<string, unknown>[] } } }
}

const configDoAgente = (): ConfigDoAgente => {
  // Um heredoc só para o arquivo: um segundo `cat >` sobrescreveria o que foi parseado.
  expect(SCRIPT.match(/cat > "\$CONF\.novo" <<JSON/g)).toHaveLength(1)
  const achado = SCRIPT.match(/cat > "\$CONF\.novo" <<JSON\n([\s\S]*?)\nJSON$/m)
  if (!achado) throw new Error(`heredoc da config do agente não encontrado em ${CAMINHO}`)
  return JSON.parse(achado[1]) as ConfigDoAgente
}

const indice = (teste: (linha: string) => boolean, depoisDe = -1) =>
  LINHAS.findIndex((linha, i) => i > depoisDe && teste(linha))

describe('deploy/aws/user-data.sh', () => {
  it('AMBIENTE=prod no topo, validado antes de qualquer apt-get', () => {
    const ambiente = indice((l) => l === 'AMBIENTE=prod')
    const esac = indice((l) => l.trim() === 'esac', ambiente)
    const apt = indice((l) => /^\s*apt-get\s/.test(l))
    expect(ambiente).toBeGreaterThan(-1)
    expect(esac).toBeGreaterThan(ambiente)
    expect(apt).toBeGreaterThan(esac)
  })

  it('AMBIENTE fora de prod|lab sai 1 sem chegar ao fim do trecho; prod e lab passam', () => {
    const esac = indice((l) => l.trim() === 'esac', indice((l) => l === 'AMBIENTE=prod'))
    const trecho = (valor: string) =>
      `${LINHAS.slice(0, esac + 1).join('\n').replace(/^AMBIENTE=prod$/m, `AMBIENTE=${valor}`)}\necho chegou-ao-fim\n`
    const rodar = (valor: string) => spawnSync('bash', ['-c', trecho(valor)], { encoding: 'utf8' })

    const invalido = rodar('teste')
    expect(invalido.status).toBe(1)
    expect(invalido.stdout).not.toContain('chegou-ao-fim')
    expect(invalido.stderr).toContain('AMBIENTE invalido')
    for (const valor of ['prod', 'lab']) {
      const valido = rodar(valor)
      expect(valido.status).toBe(0)
      expect(valido.stdout).toContain('chegou-ao-fim')
    }
  })

  it('--no-upgrade em todo apt-get install — o reparo nunca sobe versão de pacote', () => {
    const instalacoes = semComentarios.split('\n').filter((l) => /\bapt-get\s+install\b/.test(l))
    expect(instalacoes.length).toBeGreaterThanOrEqual(2)
    for (const linha of instalacoes) expect(linha).toContain('--no-upgrade')
  })

  it('o agente vem fixado — versão, pacote e sha256 — e o sha256 é conferido antes do dpkg', () => {
    const versao = semComentarios.match(/^AGENTE_VERSAO=(\d+\.\d+\.\d+b\d+)$/m)
    const pacote = semComentarios.match(/^AGENTE_PACOTE=(\S+)$/m)
    expect(versao).not.toBeNull()
    expect(pacote?.[1]).toMatch(new RegExp(`^${versao![1].replace(/\./g, '\\.')}-\\d+$`))
    expect(semComentarios).toMatch(/^AGENTE_SHA256=[0-9a-f]{64}$/m)
    expect(semComentarios).toContain('/ubuntu/arm64/$AGENTE_VERSAO/amazon-cloudwatch-agent.deb')
    expect(semComentarios).not.toMatch(/arm64\/latest\//)
    const conferencia = semComentarios.indexOf('sha256sum -c')
    const instalacao = semComentarios.indexOf('dpkg -i')
    expect(conferencia).toBeGreaterThan(-1)
    expect(instalacao).toBeGreaterThan(conferencia)
    // Só instala quando a versão instalada é outra: reexecutar não reinstala.
    expect(semComentarios).toMatch(
      /^if \[ "\$\(dpkg-query -W -f='\$\{Version\}' amazon-cloudwatch-agent 2>\/dev\/null \|\| true\)" != "\$AGENTE_PACOTE" \]; then$/m,
    )
  })

  it('config: métricas com dimensões estáveis entre instâncias', () => {
    const config = configDoAgente()
    // Sem run_as_user: o agente roda como root, o default, que é quem lê /var/lib/docker/containers.
    expect(config.agent).toEqual({ metrics_collection_interval: 60, omit_hostname: true })
    expect(config.metrics.namespace).toBe('Lotus/Host')
    expect(Object.keys(config.metrics.metrics_collected).sort()).toEqual(['disk', 'mem', 'swap'])
    const { disk, mem, swap } = config.metrics.metrics_collected
    expect(disk).toEqual({
      resources: ['/'],
      measurement: ['used_percent'],
      drop_device: true,
      append_dimensions: { Ambiente: '${AMBIENTE}' },
    })
    for (const bloco of [mem, swap]) {
      expect(bloco).toEqual({ measurement: ['used_percent'], append_dimensions: { Ambiente: '${AMBIENTE}' } })
    }
  })

  it('config: todos os contêineres e a sonda, sem retenção vinda do host', () => {
    const [conteineres, sonda, ...resto] = configDoAgente().logs.logs_collected.files.collect_list
    expect(resto).toEqual([])
    expect(conteineres).toEqual({
      file_path: '/var/lib/docker/containers/*/*-json.log',
      log_group_name: '/lotus/${AMBIENTE}/containers',
      log_stream_name: '{instance_id}',
      publish_multi_logs: true,
    })
    expect(sonda).toEqual({
      file_path: '/var/log/lotus/sonda.log',
      log_group_name: '/lotus/${AMBIENTE}/sonda',
      log_stream_name: '{instance_id}',
    })
  })

  it('config: cada item de collect_list só tem chaves que o schema do agente aceita', () => {
    for (const item of configDoAgente().logs.logs_collected.files.collect_list) {
      for (const chave of Object.keys(item)) expect(CHAVES_DE_COLLECT_LIST.has(chave), chave).toBe(true)
    }
  })

  it('a config só é reaplicada quando muda ou com o agente parado', () => {
    expect(semComentarios).toMatch(/^CONF=\/opt\/aws\/amazon-cloudwatch-agent\/etc\/lotus-agente\.json$/m)
    expect(semComentarios).toMatch(
      /^if ! cmp -s "\$CONF\.novo" "\$CONF" \|\| ! systemctl is-active --quiet amazon-cloudwatch-agent; then$/m,
    )
    expect(semComentarios).toContain('amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -c "file:$CONF" -s')
  })

  it('fetch-config falho apaga a config, para a reexecução reaplicar', () => {
    const linhas = semComentarios.split('\n')
    const i = linhas.findIndex((linha) => linha.includes('amazon-cloudwatch-agent-ctl -a fetch-config'))
    expect(i).toBeGreaterThan(-1)
    expect(linhas[i].trimEnd()).toMatch(/ -s \\$/)
    expect(linhas[i + 1].trim()).toBe('|| { rm -f "$CONF"; exit 1; }')
  })

  it('a sonda: timer de um minuto que espera o script chegar pelo §7', () => {
    expect(semComentarios).toContain('ConditionPathExists=/opt/lotus/bin/sondar-saude.sh')
    expect(semComentarios).toContain('ExecStart=/opt/lotus/bin/sondar-saude.sh')
    expect(semComentarios).toContain('Type=oneshot')
    expect(semComentarios).toContain('OnCalendar=minutely')
    expect(semComentarios).toMatch(/^systemctl enable --now lotus-sonda\.timer$/m)
    expect(semComentarios).toMatch(/^install -d -m 0750 \/var\/log\/lotus$/m)
    const rotacao = semComentarios.match(/\/var\/log\/lotus\/sonda\.log \{([\s\S]*?)\}/)
    expect(rotacao?.[1]).toMatch(/^\s*daily$/m)
    expect(rotacao?.[1]).toMatch(/^\s*rotate 7$/m)
  })
})
