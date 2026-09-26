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

  it('a confirmação PROMOVER tem mecanismo, não só a palavra solta', () => {
    // As duas linhas acima passam mesmo se o comparador shell inteiro for
    // apagado: 'PROMOVER' sobrevive na description do input e 'confirmar' no
    // nome dele. Esta âncora no `[ "$CONFIRMAR" = "PROMOVER" ]` seguido de um
    // `exit 1` no caminho de falha — se a comparação sumir ou for
    // enfraquecida (por exemplo perder o exit), este teste vai vermelho.
    expect(semComentarios).toMatch(
      /\[\s*"\$CONFIRMAR"\s*=\s*"PROMOVER"\s*\][\s\S]{0,80}\|\|[\s\S]{0,150}exit 1/,
    )
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

  it('o gate de CI verde tem mecanismo: compara com success e sai 1 no caminho de falha', () => {
    // As duas linhas acima são o mesmo defeito que o PROMOVER teve até a9cedc39:
    // continuam verdes com o `exit 1` trocado por um aviso, porque as URLs
    // sobrevivem ao mecanismo apagado. Medido na review de 2026-09-26 (Q-2).
    expect(semComentarios).toMatch(
      /\[\s*"\$CONCLUSAO"\s*=\s*"success"\s*\][\s\S]{0,80}\|\|[\s\S]{0,150}exit 1/,
    )
    // Só o run de PUSH decide: um pull_request verde do mesmo SHA não é a
    // conclusão que a procedência do ci.yml assina.
    expect(semComentarios).toContain('select(.event=="push")')
  })

  it('o gate de SHA na main aceita só identical e behind, e sai 1 em todo o resto', () => {
    // Mesma sonda da de cima: com o ramo `*)` virado aviso, o teste antigo
    // passava. `ahead` e `diverged` são exatamente o SHA fora da main.
    expect(semComentarios).toMatch(
      /case "\$ESTADO" in\s*identical\|behind\)\s*;;\s*\*\)[^\n]*exit 1\s*;;\s*esac/,
    )
  })

  it('tem escopo de leitura do GHCR privado para o imagetools inspect', () => {
    expect(semComentarios).toMatch(/packages:\s*read/)
  })

  it('SHA fora da main não mata o passo antes da própria mensagem de erro', () => {
    // Sob o `bash -e` do runner, um SHA de 404 (o jeito mais provável de cair
    // neste gate) faria a atribuição sem guarda matar o passo antes do `case`
    // rodar, e a mensagem "nao esta na main" nunca chegaria a imprimir. Mesma
    // forma que o ci.yml usa no compare de main do espelho.
    expect(semComentarios).toMatch(
      /ESTADO=\$\(gh api "repos\/\$GITHUB_REPOSITORY\/compare\/main\.\.\.\$SHA" --jq \.status 2>\/dev\/null\) \|\| ESTADO=""/,
    )
  })

  it('orçamento do polling é uma fração sensata do timeout do job, não um número solto', () => {
    // Contar iterações mede só o sleep: cada iteração também chama `aws ssm
    // get-command-invocation`, cuja latência (~0.6-1.5s no AWS CLI v2 num
    // runner hospedado) o workflow não controla — por isso o loop agora usa
    // um deadline de relógio de parede (ORCAMENTO_SEGUNDOS), não um contador.
    // Esta âncora lê os dois números — o orçamento e o timeout-minutes do
    // job — e prende um ao outro: as duas mutações que o teste antigo (que
    // olhava só o orçamento) deixava passar agora ficam vermelhas aqui,
    // porque é a RAZÃO entre os dois que importa — subir o orçamento além
    // do timeout do job, ou cortar o timeout do job com o orçamento parado,
    // quebra a razão nos dois sentidos.
    const orcamentoMatch = semComentarios.match(/ORCAMENTO_SEGUNDOS=(\d+)/)
    expect(orcamentoMatch).not.toBeNull()
    const orcamentoSegundos = Number(orcamentoMatch![1])

    const timeoutMatch = semComentarios.match(/timeout-minutes:\s*(\d+)/)
    expect(timeoutMatch).not.toBeNull()
    const timeoutSegundos = Number(timeoutMatch![1]) * 60

    const fracao = orcamentoSegundos / timeoutSegundos
    expect(fracao).toBeGreaterThanOrEqual(0.55)
    expect(fracao).toBeLessThanOrEqual(0.8)

    // O mecanismo importa tanto quanto a razão entre os números: um
    // contador de iterações que somasse os mesmos 840s não seria imune à
    // latência por chamada que motivou a troca. Ancora que o loop calcula
    // um FIM absoluto contra `date +%s` — não `seq 1 <N>`.
    expect(semComentarios).toMatch(
      /FIM=\$\(\(\s*\$\(date \+%s\)\s*\+\s*ORCAMENTO_SEGUNDOS\s*\)\)/,
    )
    expect(semComentarios).not.toMatch(/seq 1 \d+\); do/)
  })

  it('orçamento esgotado sem estado final não parece falha do deploy', () => {
    // Mensagem distinta de "deploy falhou": o comando pode continuar rodando
    // no host depois que o job desiste de esperar, e não pode ler como se o
    // deploy tivesse dado errado — é isso que evita o operador apertar o
    // botão de novo sobre um deploy ainda em andamento.
    expect(semComentarios).toContain('NAO acione o botao de novo')
    expect(semComentarios).toContain('/opt/lotus/releases.jsonl')
    expect(semComentarios).toMatch(/NAO acione o botao de novo[\s\S]{0,200}exit 1/)
    // E o caso de falha real do host continua distinto e continua saindo 1.
    expect(semComentarios).toMatch(/Failed\|Cancelled\|TimedOut\)[\s\S]{0,120}exit 1/)
  })

  it('nao interpola confirmar direto no run: — so via env', () => {
    expect(semComentarios).toContain('CONFIRMAR: ${{ inputs.confirmar }}')
    // Qualquer ocorrencia de `${{ inputs.confirmar }}` que nao venha logo
    // depois de `CONFIRMAR: ` esta fora do bloco `env:` — ou seja, de volta
    // interpolada direto num `run:`.
    expect(semComentarios).not.toMatch(/(?<!CONFIRMAR: )\$\{\{\s*inputs\.confirmar\s*\}\}/)
  })
})
