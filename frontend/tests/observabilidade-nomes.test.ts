import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

/**
 * Os nomes do item 34 vivem em quatro arquivos, e nenhum outro teste os junta:
 * - o user-data escreve no grupo;
 * - o criar-observabilidade.sh cria o grupo, o filtro e o alarme;
 * - a sonda grava o JSON que o filtro lê;
 * - o runbook §14 manda o operador ler e responder.
 *
 * Um grupo renomeado num arquivo só não quebra nenhum deles sozinho. Quebra a
 * produção: o agente escreve num grupo que não existe (a role não cria grupo),
 * ou o alarme olha uma métrica que ninguém publica.
 */
const RAIZ = resolve(__dirname, '..', '..')
const ler = (...partes: string[]) => readFileSync(join(RAIZ, ...partes), 'utf8')

/** `${AMBIENTE}`, `$AMBIENTE` e `$ambiente` viram `<amb>`: o nome é o mesmo, a variável muda de arquivo para arquivo. */
const normal = (texto: string) => texto.replace(/\$\{AMBIENTE\}|\$AMBIENTE|\$ambiente/g, '<amb>')

const RUNBOOK = ler('deploy', 'aws', 'README.md')
const secao = (de: string, ate?: string) => {
  const inicio = RUNBOOK.indexOf(de)
  if (inicio === -1) return ''
  const fim = ate === undefined ? -1 : RUNBOOK.indexOf(ate, inicio)
  return RUNBOOK.slice(inicio, fim === -1 ? undefined : fim)
}

const ARQUIVOS = {
  'user-data': normal(ler('deploy', 'aws', 'user-data.sh')),
  criar: normal(ler('deploy', 'aws', 'criar-observabilidade.sh')),
  sonda: ler('deploy', 'bin', 'sondar-saude.sh'),
  'runbook §14': secao('\n## 14. '),
} as const
type Arquivo = keyof typeof ARQUIVOS

const NOMES: [string, Arquivo[]][] = [
  ['/lotus/<amb>/containers', ['user-data', 'criar']],
  ['/lotus/<amb>/sonda', ['user-data', 'criar']],
  ['/lotus/prod/containers', ['criar', 'runbook §14']],
  ['/lotus/prod/sonda', ['criar', 'runbook §14']],
  ['Lotus/Host', ['user-data', 'criar', 'runbook §14']],
  ['Lotus/Sonda', ['criar', 'runbook §14']],
  ['disk_used_percent', ['criar', 'runbook §14']],
  ['mem_used_percent', ['runbook §14']],
  ['swap_used_percent', ['runbook §14']],
  ['/var/log/lotus/sonda.log', ['user-data', 'sonda', 'runbook §14']],
  ['/opt/lotus/bin/sondar-saude.sh', ['user-data', 'runbook §14']],
  ['lotus-sonda.timer', ['user-data', 'runbook §14']],
  ['lotus-observabilidade', ['criar', 'runbook §14']],
  ['lotus-alertas', ['criar', 'runbook §14']],
  ['lotus-prod-up', ['criar', 'runbook §14']],
  ['lotus-prod-5xx', ['criar', 'runbook §14']],
  ['lotus-prod-disco', ['criar', 'runbook §14']],
  ['lotus-prod-certificado', ['criar', 'runbook §14']],
]

describe('nomes da observabilidade (item 34)', () => {
  it('o runbook tem a §14', () => {
    expect(ARQUIVOS['runbook §14']).not.toBe('')
  })

  it.each(NOMES)('%s aparece igual em %j', (nome, arquivos) => {
    for (const arquivo of arquivos) expect(ARQUIVOS[arquivo], arquivo).toContain(nome)
  })

  it.each(['Up', 'CertDias', 'Http5xx'])('a métrica %s que o filtro publica é a que o alarme lê', (metrica) => {
    expect(ARQUIVOS.criar).toMatch(new RegExp(`^\\s*filtro /lotus/prod/\\S+ ${metrica} `, 'm'))
    expect(ARQUIVOS.criar).toMatch(new RegExp(`^\\s*alarme lotus-prod-\\S+\\s+Lotus/Sonda\\s+${metrica}\\s`, 'm'))
    expect(ARQUIVOS['runbook §14']).toContain(`\`${metrica}\``)
  })

  it('a sonda grava as chaves que os filtros leem', () => {
    expect(ARQUIVOS.sonda).toContain('"up":%d')
    expect(ARQUIVOS.sonda).toContain('\\"cert_dias\\":')
    expect(ARQUIVOS.criar).toContain("'$.up'")
    expect(ARQUIVOS.criar).toContain("'$.cert_dias'")
  })

  it('o §7 leva o sondar-saude.sh ao host — sem ele o timer pula calado e o botão trava', () => {
    const s7 = secao('\n## 7. ', '\n## 8. ')
    expect(s7).toMatch(/^scp .*deploy\/bin\/sondar-saude\.sh/m)
    expect(s7).toMatch(/^sudo mv .*\/tmp\/sondar-saude\.sh/m)
  })

  it('a descrição dos alarmes aponta para uma seção que existe', () => {
    expect(ARQUIVOS.criar).toContain('deploy/aws/README.md secao 14.6')
    expect(ARQUIVOS['runbook §14']).toMatch(/^### 14\.6 /m)
  })
})
