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
 * IPv4), o Gotenberg (ADR-12) continua presente e o `scheduler` — o runner
 * de `schedule:work`, sem o qual a poda de retenção nunca executa — continua
 * declarado com a mesma imagem e o mesmo env_file do app.
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

const SERVICOS_DE_DEV = ['minio', 'createbuckets', 'mailpit']
const CHAVES_SENSIVEIS = ['APP_KEY', 'DB_PASSWORD', 'AWS_SECRET_ACCESS_KEY', 'AWS_ACCESS_KEY_ID', 'MAIL_PASSWORD']

/**
 * Bind mount se reconhece pela origem começando com "." ou ".." (sozinho ou
 * seguido de "/", cobrindo "- .:/x" e "- ./x:/y"), "/" absoluto, "~" (home)
 * ou "$" (variável de ambiente) — na forma curta de lista. Na forma longa,
 * pelo marcador "type: bind" (em bloco ou inline num mapeamento de fluxo
 * "{type: bind, ...}"). Volume nomeado ("- nome:/caminho", origem é um
 * identificador simples) não bate em nenhum dos dois. Compartilhado pelos
 * dois describes deste arquivo — compose de produção e overlay de sonda —
 * para provar a mesma propriedade nos dois arquivos que a prova de DoD nº4
 * mergeia.
 */
const origemBindMount = /^\s*-\s*["']?(\.{1,2}(?=[:/])|\/|~|\$)/m
const tipoBindMountLongo = /\btype:\s*bind\b/

/**
 * Recorta o bloco de um serviço (da linha "  <nome>:" até a próxima linha de
 * serviço no mesmo nível de indentação, ou o fim do texto). A âncora aceita
 * qualquer coisa depois dos dois-pontos na mesma linha (ex.: um comentário
 * de fim de linha, "  nginx: # entrega SPA + API") — só o nome do serviço e
 * a indentação de 2 espaços importam. Usado pelas asserções que precisam
 * provar uma propriedade DENTRO de um serviço específico, e não em qualquer
 * lugar do arquivo. Recebe o texto a recortar (default PROD) para servir
 * também o describe do overlay, contra PROBE.
 */
function blocoDoServico(nome: string, texto: string = PROD): string {
  const inicio = new RegExp(`^ {2}${nome}:.*$`, 'm').exec(texto)
  if (!inicio) {
    throw new Error(`serviço "${nome}" não encontrado no texto informado`)
  }
  const resto = texto.slice(inicio.index + inicio[0].length)
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
    // storage). Ver o docblock de origemBindMount/tipoBindMountLongo acima.
    for (const regiaoVolumes of regioesDaChave(PROD, 'volumes')) {
      expect(regiaoVolumes).not.toMatch(origemBindMount)
      expect(regiaoVolumes).not.toMatch(tipoBindMountLongo)
    }
  })

  it('lê os segredos de um env_file TROCÁVEL por variável — um caminho fixo aqui sobe produção com o env da sonda', () => {
    // Existir a chave não basta, e essa era a folga: `env_file: docker/probe.env`
    // hardcoded passava por esta catraca e subiria produção apontada para o
    // MinIO/Mailpit da sonda, com as credenciais públicas que o arquivo carrega.
    // A propriedade é a mesma já exigida de `image:` — o valor vem de fora.
    const [envFileDoApp] = regioesDaChave(blocoDoServico('app'), 'env_file')
    expect(envFileDoApp ?? '').toMatch(/\$\{LOTUS_ENV_FILE\b/)
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
    // O antivírus entrou na promoção por SHA em 2026-09-04: `clamav/clamav`
    // publica só linux/amd64 e o host é t4g/Graviton, então a imagem passou a
    // ser construída aqui. Imagem de terceiro de volta neste serviço é o
    // defeito que travou o primeiro deploy — "no matching manifest for
    // linux/arm64/v8" no `compose pull`.
    expect(PROD).toMatch(/^ {4}image: \$\{LOTUS_CLAMAV_IMAGE\b/m)
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

  it('mantém o serviço scheduler rodando schedule:work — sem o runner, a poda de retenção é código que nunca executa', () => {
    // Achado Q-2 do review de 2026-08-28. `PodaAgendadaRatchetTest` prova as
    // entradas do `Schedule` (que o comando existe e está agendado); nada
    // provava o CONTAINER que as executa. Apagar este serviço deixava a suíte
    // inteira verde e a poda parada em produção — a descoberta seria PII
    // sobrevivendo além da janela decidida, semanas depois, longe da mudança
    // que a causou. `blocoDoServico` já lança se o serviço sumir: essa é a
    // asserção de existência.
    const bloco = blocoDoServico('scheduler')

    // O comando é o que distingue o runner de um segundo app ocioso.
    const [comando] = regioesDaChave(bloco, 'command')
    expect(comando ?? '').toMatch(/schedule:work/)

    // Mesma imagem e mesmo env_file do app: o scheduler roda o MESMO código
    // com a MESMA configuração, e é isso que faz a promoção por SHA e a
    // rotação de segredo valerem para ele também (docs/operacao-segredos.md §1).
    expect(bloco).toMatch(/^ {4}image: \$\{LOTUS_IMAGE\b/m)
    const [envFile] = regioesDaChave(bloco, 'env_file')
    expect(envFile ?? '').toMatch(/\$\{LOTUS_ENV_FILE\b/)
  })

  it('declara o mysql com imagem fixada por digest, sem porta publicada e com dado em volume nomeado — a revisão 2026-09 do ADR-09', () => {
    const bloco = blocoDoServico('mysql')
    expect(bloco).toMatch(/^ {4}image: mysql:8\.0@sha256:[0-9a-f]{64}$/m)
    // 3306 NUNCA publicada: porta só na rede interna do Compose.
    expect(regioesDaChave(bloco, 'ports')).toHaveLength(0)
    // Dado persistente em volume NOMEADO (bind mount já é proibido acima).
    const [volumes] = regioesDaChave(bloco, 'volumes')
    expect(volumes ?? '').toMatch(/mysql-data:\/var\/lib\/mysql/)
    // Env trocável, como app/scheduler — MYSQL_* vem do env_file do servidor.
    const [envFile] = regioesDaChave(bloco, 'env_file')
    expect(envFile ?? '').toMatch(/\$\{LOTUS_ENV_FILE\b/)
  })

  it('força TCP no healthcheck do mysql e lê a senha do ambiente — socket Unix abre antes do listener e senha literal é segredo em repo', () => {
    const [health] = regioesDaChave(blocoDoServico('mysql'), 'healthcheck')
    expect(health ?? '').toMatch(/-h["',\s]+127\.0\.0\.1/)
    expect(health ?? '').toMatch(/MYSQL_ROOT_PASSWORD/)
    expect(health ?? '').not.toMatch(/-p['"]?secret/)
  })

  it('faz app e scheduler esperarem o mysql por service_healthy — a corrida do migrate contra o listener TCP foi medida', () => {
    for (const servico of ['app', 'scheduler']) {
      const [dependsOn] = regioesDaChave(blocoDoServico(servico), 'depends_on')
      expect(dependsOn ?? '').toMatch(/mysql:\s*\{?\s*condition:\s*service_healthy\b/)
    }
  })

  it('guarda a base do clamav em volume nomeado e dá teto de memória acima do que a base ocupa — 768m matava o daemon no carregamento', () => {
    const bloco = blocoDoServico('clamav')
    // Sem volume, os ~167 MB da base seriam rebaixados a cada deploy, porque a
    // tag da imagem é o SHA do commit.
    const [volumes] = regioesDaChave(bloco, 'volumes')
    expect(volumes ?? '').toMatch(/clamav-data:\/var\/lib\/clamav/)
    // Medido em 2026-09-04: a base carregada ocupa 1,03–1,11 GiB. O teto tem de
    // ficar ACIMA disso, senão o cgroup mata o clamd durante o boot — e o
    // sintoma seria upload em 503, longe da causa.
    const [teto] = bloco.match(/^ {4}mem_limit: (\d+)m$/m)?.slice(1) ?? []
    expect(Number(teto)).toBeGreaterThanOrEqual(1280)
  })

  it('põe teto de memória em todo serviço — t4g.small tem 2 GiB e OOM sem teto derruba o vizinho, não o culpado', () => {
    for (const servico of ['app', 'scheduler', 'nginx', 'mysql', 'gotenberg', 'clamav']) {
      expect(blocoDoServico(servico)).toMatch(/^ {4}mem_limit: /m)
    }
  })
})

describe('docker-compose.prod-probe.yml', () => {
  const PROBE = readFileSync(join(RAIZ, 'docker-compose.prod-probe.yml'), 'utf8')

  it.each(SERVICOS_DE_DEV)('acrescenta %s, que só existe para a prova local', (servico) => {
    expect(PROBE).toMatch(new RegExp(`^\\s{2}${servico}:`, 'm'))
  })

  it('não redefine env_file: a prova troca o arquivo pela variável LOTUS_ENV_FILE', () => {
    // Ancorado em início de linha e sem comentário, como a mesma checagem no
    // describe do compose de produção — um comentário futuro explicando por
    // que o overlay não usa env_file: não pode reprovar a catraca à toa.
    const semLinhasDeComentario = PROBE.split(/\r?\n/)
      .filter((linha) => !/^\s*#/.test(linha))
      .join('\n')
    expect(semLinhasDeComentario).not.toMatch(/^ {4}env_file:/m)
  })

  it('não declara bind mount de código no app do overlay', () => {
    // Mesma propriedade do describe do compose de produção, medida sobre o
    // arquivo que falta guardar: a prova de DoD nº4 (mudar código no host
    // não muda o container) roda sobre a stack MERGEADA, e o overlay é o
    // segundo arquivo do merge — um bind mount aqui passaria batido.
    for (const regiaoVolumes of regioesDaChave(blocoDoServico('app', PROBE), 'volumes')) {
      expect(regiaoVolumes).not.toMatch(origemBindMount)
      expect(regiaoVolumes).not.toMatch(tipoBindMountLongo)
    }
  })

  it('não redeclara o mysql — desde a revisão 2026-09 do ADR-09 ele mora no compose de produção', () => {
    expect(PROBE).not.toMatch(/^\s{2}mysql:/m)
  })

  it('não redefine image: no app do overlay', () => {
    // O app do overlay só acrescenta depends_on; a imagem continua vindo do
    // compose de produção. Uma image: aqui destrancaria a mesma brecha do
    // teste anterior por outra porta — o container deixaria de rodar a
    // imagem buildada e testada.
    expect(blocoDoServico('app', PROBE)).not.toMatch(/^ {4}image:/m)
  })
})

describe('docker-compose.prod-tls.yml', () => {
  const TLS = readFileSync(join(RAIZ, 'docker-compose.prod-tls.yml'), 'utf8')

  it('publica 443 e mantém 80 — o redirect vive no tls.conf, não na retirada da porta', () => {
    const [ports] = regioesDaChave(blocoDoServico('nginx', TLS), 'ports')
    expect(ports ?? '').toMatch(/443:443/)
    expect(ports ?? '').toMatch(/80\}?:80/)
  })

  it('monta certificado e conf como read-only — o container serve TLS, não administra certificado', () => {
    const [volumes] = regioesDaChave(blocoDoServico('nginx', TLS), 'volumes')
    expect(volumes ?? '').toMatch(/\/etc\/letsencrypt:\/etc\/letsencrypt:ro/)
    expect(volumes ?? '').toMatch(/tls\.conf:\/etc\/nginx\/conf\.d\/default\.conf:ro/)
    expect(volumes ?? '').toMatch(/certbot-webroot/)
  })

  it('só toca o serviço nginx — app, mysql e o resto não mudam sob TLS', () => {
    expect(TLS).not.toMatch(/^ {2}(app|mysql|scheduler|gotenberg|clamav):/m)
  })
})
