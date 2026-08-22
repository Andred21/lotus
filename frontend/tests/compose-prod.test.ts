import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

/**
 * O compose de produção tem propriedades que build, lint e suíte não veem, e
 * cuja violação é silenciosa — não quebram o `docker compose up`. Este
 * arquivo prova por texto: nenhum serviço de dev (mysql/minio/mailpit/...)
 * volta, nenhum bind mount do working tree do host entra (volume nomeado
 * para dado persistente é permitido), nenhum segredo com valor literal
 * aparece em `environment:`/`command:`/em lugar nenhum do arquivo, a imagem
 * de cada serviço é trocável por variável (gancho da promoção por SHA), o
 * nginx depende do app (fastcgi_pass resolve "app" no arranque, em qualquer
 * sintaxe de depends_on) e aponta o healthcheck para 127.0.0.1 (não
 * "localhost" — busybox wget resolve para ::1 e o prod.conf só escuta
 * IPv4), e o Gotenberg (ADR-12) continua presente.
 *
 * A conferência é TEXTUAL de propósito: o projeto não tem parser de YAML, e
 * acrescentar dependência de runtime ao frontend por causa de arquivo de
 * infra seria acoplamento na direção errada. Limitação conhecida: um
 * serviço escrito em fluxo YAML numa linha só (`services: {mysql: {...}}`)
 * escaparia de toda asserção baseada em `^\s{2}nome:` — ninguém escreve
 * compose assim aqui, e a alternativa custava uma dependência nova.
 */
const RAIZ = resolve(__dirname, '..', '..')
const PROD = readFileSync(join(RAIZ, 'docker-compose.prod.yml'), 'utf8')

const SERVICOS_DE_DEV = ['mysql', 'minio', 'createbuckets', 'mailpit']
const CHAVES_SENSIVEIS = ['APP_KEY', 'DB_PASSWORD', 'AWS_SECRET_ACCESS_KEY', 'AWS_ACCESS_KEY_ID', 'MAIL_PASSWORD']

/**
 * Recorta o bloco de um serviço (da linha "  <nome>:" até a próxima linha de
 * serviço no mesmo nível de indentação, ou o fim do arquivo). A âncora
 * aceita qualquer coisa depois dos dois-pontos na mesma linha (ex.: um
 * comentário de fim de linha, "  nginx: # entrega SPA + API") — só o nome do
 * serviço e a indentação de 2 espaços importam. Usado pelas asserções que
 * precisam provar uma propriedade DENTRO de um serviço específico, e não em
 * qualquer lugar do arquivo.
 */
function blocoDoServico(nome: string): string {
  const inicio = new RegExp(`^ {2}${nome}:.*$`, 'm').exec(PROD)
  if (!inicio) {
    throw new Error(`serviço "${nome}" não encontrado em docker-compose.prod.yml`)
  }
  const resto = PROD.slice(inicio.index + inicio[0].length)
  const fimRelativo = resto.slice(1).search(/^ {2}\S/m)
  return fimRelativo === -1 ? resto : resto.slice(0, fimRelativo + 1)
}

/**
 * Recorta TODAS as regiões que uma chave de nível de serviço (indentação
 * fixa, 4 espaços) abrange dentro de um texto: o resto da própria linha da
 * chave (cobre a forma inline, ex. `depends_on: [app]`) mais as linhas
 * seguintes mais indentadas ou em branco (cobre a forma de bloco/lista). Uma
 * região termina na primeira linha não-vazia com indentação igual ou menor
 * que a da chave — ou no fim do texto. A mesma chave pode aparecer em mais
 * de um serviço; retorna uma região por ocorrência, na ordem em que aparecem.
 */
function regioesDaChave(texto: string, chave: string): string[] {
  const linhas = texto.split(/\r?\n/)
  const ehChave = new RegExp(`^ {4}${chave}:`)
  const ehContinuacao = (linha: string) => linha.trim() === '' || /^ {5,}/.test(linha)
  const regioes: string[] = []
  for (let i = 0; i < linhas.length; i++) {
    if (!ehChave.test(linhas[i])) continue
    const regiao = [linhas[i]]
    let j = i + 1
    while (j < linhas.length && ehContinuacao(linhas[j])) {
      regiao.push(linhas[j])
      j++
    }
    regioes.push(regiao.join('\n'))
  }
  return regioes
}

describe('docker-compose.prod.yml', () => {
  it.each(SERVICOS_DE_DEV)('não declara o serviço de dev %s', (servico) => {
    expect(PROD).not.toMatch(new RegExp(`^\\s{2}${servico}:`, 'm'))
  })

  it('aponta o healthcheck do nginx para 127.0.0.1, nunca "localhost" — busybox wget resolve localhost para ::1 e o prod.conf só escuta IPv4 (o container fica unhealthy pra sempre)', () => {
    // A URL, não a palavra: o bloco do nginx MENCIONA "localhost" de
    // propósito, no comentário que documenta por que ele não é usado aqui.
    const [healthcheckDoNginx] = regioesDaChave(blocoDoServico('nginx'), 'healthcheck')
    expect(healthcheckDoNginx ?? '').toMatch(/http:\/\/127\.0\.0\.1\/up/)
    expect(healthcheckDoNginx ?? '').not.toMatch(/http:\/\/localhost\/up/)
  })

  it('não declara bind mount em serviço nenhum — volume nomeado para dado persistente é permitido, bind mount do working tree do host não', () => {
    // A propriedade é sobre a ORIGEM do mount, não sobre a chave `volumes:`
    // em si — essa chave também abriga volume nomeado, legítimo (ex.:
    // storage). Bind mount se reconhece pela origem começando com "." ou
    // ".." (sozinho ou seguido de "/", cobrindo "- .:/x" e "- ./x:/y"),
    // "/" absoluto, "~" (home) ou "$" (variável de ambiente) — na forma
    // curta de lista. Na forma longa, pelo marcador "type: bind" (em bloco
    // ou inline num mapeamento de fluxo "{type: bind, ...}"). Volume
    // nomeado ("- nome:/caminho", origem é um identificador simples) não
    // bate em nenhum dos dois.
    const origemBindMount = /^\s*-\s*["']?(\.{1,2}(?=[:/])|\/|~|\$)/m
    const tipoBindMountLongo = /\btype:\s*bind\b/
    for (const regiaoVolumes of regioesDaChave(PROD, 'volumes')) {
      expect(regiaoVolumes).not.toMatch(origemBindMount)
      expect(regiaoVolumes).not.toMatch(tipoBindMountLongo)
    }
  })

  it('lê os segredos de um env_file', () => {
    expect(PROD).toMatch(/^ {4}env_file:/m)
  })

  it('não expõe valor literal de segredo em lugar nenhum do arquivo — nem em `environment:` YAML, nem em `command:` shell', () => {
    // Ancorado nos NOMES de chave sensíveis (não na chave `environment:`,
    // que também abriga config não-secreta legítima como LOG_LEVEL/APP_ENV),
    // em qualquer forma de atribuição: "CHAVE: valor" de YAML ou
    // "CHAVE=valor" de shell (cobre segredo dentro de `command:`).
    //
    // Duas ressalvas de precisão, deliberadas: (1) uma linha que é
    // comentário PURO é ignorada — o arquivo pode legitimamente documentar
    // que a chave vem do env_file; (2) uma referência a variável de
    // ambiente sem valor literal ("DB_PASSWORD: ${DB_PASSWORD}") é
    // permitida, porque não é o compose que carrega o segredo ali.
    //
    // Limitação conhecida, não coberta: um comentário de FIM DE LINHA na
    // mesma linha do valor ("APP_KEY: real # comentário") não é distinguido
    // de um valor real, porque o corte de comentário aqui é só por linha
    // inteira. Não medido nenhum caso assim no arquivo hoje.
    const semLinhasDeComentario = PROD.split(/\r?\n/)
      .filter((linha) => !/^\s*#/.test(linha))
      .join('\n')
    for (const chave of CHAVES_SENSIVEIS) {
      const valorLiteral = new RegExp(`\\b${chave}\\s*[:=]\\s*(?!\\$\\{?[A-Z0-9_]+\\}?\\s*$)\\S`, 'm')
      expect(semLinhasDeComentario).not.toMatch(valorLiteral)
    }
  })

  it('deixa a imagem trocável por variável, que é o gancho da promoção por SHA', () => {
    // Ancorado na CHAVE `image:`, não em qualquer ocorrência da string — uma
    // imagem hardcoded com `${LOTUS_IMAGE}` sobrando só num comentário não
    // deve passar.
    expect(PROD).toMatch(/^ {4}image: \$\{LOTUS_IMAGE\b/m)
    expect(PROD).toMatch(/^ {4}image: \$\{LOTUS_WEB_IMAGE\b/m)
  })

  it('liga o nginx ao app via depends_on — fastcgi_pass resolve "app" no arranque do nginx', () => {
    // docker/nginx/prod.conf faz fastcgi_pass app:9000 num host estático
    // (não variável), então o nginx resolve esse nome no ARRANQUE. Sem
    // depends_on garantindo o serviço `app` na rede, o nginx morre com
    // "host not found in upstream" antes mesmo de escutar a porta 80.
    //
    // A propriedade provada é "existe uma chave depends_on: dentro do bloco
    // do nginx, e o nome app aparece na região que ela abrange" — não uma
    // sintaxe específica. Isso cobre a forma curta ("[app]", "[gotenberg,
    // app]"), a forma de lista ("- app") e a forma longa canônica
    // ("app:\n  condition: service_started", inclusive com
    // "condition: service_healthy", para a qual o Compose normaliza e para
    // a qual este arquivo pode evoluir agora que existem healthchecks).
    const blocoNginx = blocoDoServico('nginx')
    const [dependsOnDoNginx] = regioesDaChave(blocoNginx, 'depends_on')
    expect(dependsOnDoNginx ?? '').toMatch(/\bapp\b/)
  })

  it('mantém o Gotenberg, que o ADR-12 exige', () => {
    expect(PROD).toMatch(/^\s{2}gotenberg:/m)
  })
})

describe('docker-compose.prod-probe.yml', () => {
  const PROBE = readFileSync(join(RAIZ, 'docker-compose.prod-probe.yml'), 'utf8')

  it.each(SERVICOS_DE_DEV)('acrescenta %s, que só existe para a prova local', (servico) => {
    expect(PROBE).toMatch(new RegExp(`^\\s{2}${servico}:`, 'm'))
  })

  it('não redefine env_file: a prova troca o arquivo pela variável LOTUS_ENV_FILE', () => {
    expect(PROBE).not.toMatch(/env_file:/)
  })
})
