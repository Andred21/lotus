import { describe, expect, it } from 'vitest'
import { readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

/**
 * `deploy/aws/criar-oidc-e-role.sh` é o único caminho versionado para a
 * identidade que promove release. O que ele não pode virar: uma role ampla, uma
 * trust aberta a qualquer repositório, ou um script que termina verde com o
 * agente SSM morto — role perfeita com agente morto não promove nada.
 *
 * Os dois documentos IAM são lidos do heredoc e PARSEADOS, não procurados por
 * substring: a versão anterior desta catraca deixava passar um terceiro
 * statement `{"Action":"ssm:*","Resource":"*"}`, a remoção da condição de
 * `aud` e um `sub` em lista com curinga no segundo item — os três medidos,
 * verdes nos sete testes. Substring prova presença, nunca ausência.
 */
const RAIZ = resolve(__dirname, '..', '..')
const CAMINHO = join(RAIZ, 'deploy', 'aws', 'criar-oidc-e-role.sh')
const SCRIPT = readFileSync(CAMINHO, 'utf8')
const semComentarios = SCRIPT.split(/\r?\n/)
  .filter((linha) => !/^\s*#/.test(linha))
  .join('\n')

type Statement = {
  Effect: string
  Action: string | string[]
  Resource?: string | string[]
  Principal?: Record<string, string>
  Condition?: Record<string, Record<string, string | string[]>>
}
type Documento = { Version: string; Statement: Statement[] }

/**
 * O heredoc é JSON válido antes da expansão: as variáveis do shell vivem todas
 * dentro de strings. Parsear aqui é o que permite asserção sobre o CONJUNTO de
 * ações — uma ação a mais reprova, e é a ação a mais que amplia privilégio.
 */
const documento = (nome: string): Documento => {
  const achado = SCRIPT.match(
    new RegExp(`cat > "\\$TMP/${nome}\\.json" <<JSON\\n([\\s\\S]*?)\\nJSON$`, 'm'),
  )
  if (!achado) throw new Error(`heredoc de ${nome}.json não encontrado em ${CAMINHO}`)
  return JSON.parse(achado[1]) as Documento
}

const acoesDe = (doc: Documento): string[] =>
  doc.Statement.flatMap((s) => [s.Action].flat()).sort()

/**
 * Um comando por entrada, com a continuação de linha do shell já juntada.
 * `[ \t]*` e não `\s*`: `\s` come o `\n`, então uma continuação seguida de
 * LINHA EM BRANCO colava o comando seguinte na mesma entrada — o bash termina o
 * comando ali e roda dois. Medido: uma barra e uma linha em branco antes de um
 * `attach-role-policy` de AdministratorAccess deixavam as quatro asserções
 * verdes, lendo o `--role-name` do PRIMEIRO comando.
 */
const comandosAws = semComentarios
  .replace(/\\\n[ \t]*/g, ' ')
  .split('\n')
  .map((linha) => linha.trim())
  // `aws` também aparece depois de `if` e dentro de `$(…)`, e as duas formas
  // concedem igual.
  .filter((linha) => /(^|[\s;&|(])aws\s/.test(linha))

const alvoDe = (comando: string): string | undefined =>
  comando.match(/--role-name (\S+)/)?.[1]

describe('deploy/aws/criar-oidc-e-role.sh', () => {
  it('é executável e falha alto', () => {
    expect(statSync(CAMINHO).mode & 0o111).not.toBe(0)
    expect(semComentarios).toMatch(/^set -euo pipefail$/m)
  })

  it('fixa a trust na main do repositório corporativo', () => {
    // O único literal de que a trust inteira depende; trocá-lo falha fechado,
    // mas falha no lugar errado — nenhum token do GitHub casaria.
    expect(semComentarios).toContain('EMISSOR=token.actions.githubusercontent.com')
    const trust = documento('trust')
    expect(trust.Statement).toHaveLength(1)
    const statement = trust.Statement[0]
    expect(statement.Effect).toBe('Allow')
    expect(statement.Action).toBe('sts:AssumeRoleWithWebIdentity')
    expect(statement.Principal).toEqual({ Federated: '$ARN_OIDC' })
    expect(statement.Condition).toEqual({
      StringEquals: {
        '$EMISSOR:aud': 'sts.amazonaws.com',
        '$EMISSOR:sub': 'repo:$REPO:ref:refs/heads/main',
      },
    })
  })

  it('não usa curinga na condição de sub — trust aberta é conta aberta', () => {
    const condicao = documento('trust').Statement[0].Condition ?? {}
    // Só StringEquals: StringLike existe para aceitar curinga, e é assim que a
    // trust se abre sem que nenhum `*` apareça onde se costuma procurar.
    expect(Object.keys(condicao)).toEqual(['StringEquals'])
    for (const valor of Object.values(condicao.StringEquals)) {
      expect(Array.isArray(valor)).toBe(false)
      expect(valor as string).not.toContain('*')
    }
  })

  it('a política é mínima: um comando, uma instância, um documento', () => {
    const politica = documento('ssm')
    expect(politica.Statement.map((s) => s.Effect)).toEqual(['Allow', 'Allow'])
    // Conjunto EXATO. Ampliar a role passa a exigir mexer nesta linha.
    expect(acoesDe(politica)).toEqual([
      'ssm:GetCommandInvocation',
      'ssm:ListCommandInvocations',
      'ssm:SendCommand',
    ])
    const envio = politica.Statement.find((s) => [s.Action].flat().includes('ssm:SendCommand'))
    expect(envio?.Resource).toEqual([
      'arn:aws:ec2:$REGIAO:$CONTA:instance/$INSTANCIA',
      'arn:aws:ssm:$REGIAO::document/AWS-RunShellScript',
    ])
  })

  it('a lotus-deploy não recebe permissão além da inline mínima', () => {
    // Parsear os heredocs prova o CONTEÚDO dos documentos, nunca que eles são a
    // única concessão: um `attach-role-policy --role-name "$ROLE" --policy-arn
    // …/AdministratorAccess` ao lado deles passava nos nove testes, e o readback
    // também não lista as managed policies da role. Aqui se conta.
    // Tripwire independente do parse acima: qualquer forma de escrever a
    // concessão entra nesta contagem, inclusive as que o filtro não pegaria.
    expect(semComentarios.match(/(attach|put)-role-policy/g) ?? []).toHaveLength(2)

    const concessoes = comandosAws.filter((c) => /(attach|put)-role-policy/.test(c))
    expect(concessoes).toHaveLength(2)

    const inline = concessoes.filter((c) => c.includes('put-role-policy'))
    expect(inline).toHaveLength(1)
    expect(alvoDe(inline[0])).toBe('"$ROLE"')
    expect(inline[0]).toContain('--policy-name lotus-deploy-ssm')
    // Amarra a chamada ao documento que esta catraca parseou: sem isto, o
    // heredoc pode estar perfeito e a role receber outro arquivo.
    expect(inline[0]).toContain('--policy-document "file://$TMP/ssm.json"')

    // A única managed policy do script é a do agente, e vai para a role da EC2.
    const anexada = concessoes.filter((c) => c.includes('attach-role-policy'))
    expect(anexada).toHaveLength(1)
    expect(alvoDe(anexada[0])).toBe('lotus-ec2')
    expect(anexada[0]).toContain('arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore')
  })

  it('é idempotente — reexecutar não estraga nada', () => {
    expect(semComentarios).toContain('get-open-id-connect-provider')
    const trust = comandosAws.filter((c) => /(update-assume-role-policy|create-role)/.test(c))
    expect(trust).toHaveLength(2)
    // Os dois ramos — role nova e role que já existia — têm de aplicar o mesmo
    // documento, que é o que a catraca leu.
    for (const comando of trust) expect(comando).toContain('file://$TMP/trust.json')
  })

  it('garante a audiência no provider que já existia', () => {
    // Provider vindo de outra ferramenta pode não ter sts.amazonaws.com no
    // ClientIDList. Sem isto, o erro só aparece no configure-aws-credentials,
    // com cara de bug de trust policy.
    expect(semComentarios).toContain('add-client-id-to-open-id-connect-provider')
    expect(semComentarios).toMatch(/--query '?ClientIDList'?/)
  })

  it('espera o agente SSM registrar antes de acusar agente morto', () => {
    // O attach de AmazonSSMManagedInstanceCore pode ser a primeira permissão de
    // SSM que o host recebe; o agente reregistra no próprio retry, em minutos.
    // Medir uma vez só reprovaria a execução correta.
    expect(semComentarios).toMatch(/FIM=\$\(\(\s*\$\(date \+%s\)\s*\+\s*\$?ESPERA_SEGUNDOS\s*\)\)/)
    expect(semComentarios).toMatch(/\[ "\$\(date \+%s\)" -l[te] "\$FIM" \]/)
    const espera = semComentarios.match(/ESPERA_SEGUNDOS=(\d+)/)
    expect(espera).not.toBeNull()
    expect(Number(espera?.[1])).toBeGreaterThanOrEqual(120)
  })

  it('exige o agente SSM Online no readback', () => {
    expect(semComentarios).toContain('describe-instance-information')
    expect(semComentarios).toContain('PingStatus')
    // O `exit 1` tem de estar DENTRO da guarda: solto, qualquer `exit 1` do
    // arquivo satisfazia a asserção.
    const guarda = semComentarios.match(/if \[ "\$PING" != "Online" \]; then([\s\S]*?)\nfi/)
    expect(guarda).not.toBeNull()
    expect(guarda?.[1]).toMatch(/\n\s*exit 1\s*$/)
    // 300 s é cerca de um heartbeat do agente, então o operador pode cair aqui
    // com o host são. A saída que ele lê tem de dizer o que fazer.
    expect(guarda?.[1]).toContain('reexecutar este script')
  })

  it('não deixa documento de política no /tmp depois de rodar', () => {
    expect(semComentarios).toMatch(/^trap 'rm -rf "\$TMP"' EXIT$/m)
  })
})
