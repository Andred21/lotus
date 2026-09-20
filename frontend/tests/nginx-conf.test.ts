import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

/**
 * `deploy/nginx/tls.conf` DUPLICA `docker/nginx/prod.conf`. A duplicação é
 * deliberada — o overlay de TLS troca o arquivo inteiro por bind mount, então
 * o `tls.conf` tem de ser autossuficiente — mas até 2026-09-20 o único guarda
 * da igualdade era um comentário ("Mudou o proxy lá? Muda aqui no mesmo
 * commit"), e a lição 19 existe justamente porque comentário não segura
 * arquivo de produção.
 *
 * O custo já foi pago uma vez: o `tls.conf` divergiu do `prod.conf` no ponto
 * que o healthcheck do nginx e o gate pós-deploy do `deploy.sh` consomem — o
 * `/up` caía no `location /` e voltava 301 em vez de 200, matando o deploy
 * logo depois do `up -d`. Era o Q-1 do review de 2026-09-20; este arquivo é o
 * Q-7, que impede a volta.
 *
 * Conferência TEXTUAL pelo mesmo motivo dos outros catracas de infra: o
 * projeto não tem parser de nginx.conf, e acrescentar um ao frontend por causa
 * de arquivo de infra seria acoplamento na direção errada. O comportamento se
 * prova rodando o nginx (feito em 2026-09-20 com `nginx:alpine`: `/up` deu
 * 502 — chegou ao fastcgi — e `/qualquer-outra` deu 301); a catraca guarda a
 * regressão silenciosa.
 */
const RAIZ = resolve(__dirname, '..', '..')
const PROD = limpar(readFileSync(join(RAIZ, 'docker', 'nginx', 'prod.conf'), 'utf8'))
const TLS = limpar(readFileSync(join(RAIZ, 'deploy', 'nginx', 'tls.conf'), 'utf8'))

/** Fora comentário e linha em branco — o que sobra é diretiva. */
function limpar(texto: string): string {
  return texto
    .split(/\r?\n/)
    .filter((linha) => !/^\s*#/.test(linha))
    .map((linha) => linha.trim())
    .filter((linha) => linha !== '')
    .join('\n')
}

/**
 * Corpo de um bloco `{ ... }`, casando chaves. Roda sobre o texto JÁ limpo,
 * então nenhuma chave dentro de comentário entra na contagem.
 */
function corpo(texto: string, cabecalho: string): string {
  const inicio = texto.indexOf(cabecalho)
  if (inicio === -1) throw new Error(`bloco ausente: ${cabecalho}`)
  const abre = texto.indexOf('{', inicio)
  let nivel = 0
  for (let i = abre; i < texto.length; i++) {
    if (texto[i] === '{') nivel += 1
    else if (texto[i] === '}') {
      nivel -= 1
      if (nivel === 0) return limpar(texto.slice(abre + 1, i))
    }
  }
  throw new Error(`bloco sem fechamento: ${cabecalho}`)
}

/** Os `server { ... }` do arquivo, na ordem em que aparecem. */
function servidores(texto: string): string[] {
  const achados: string[] = []
  let cursor = 0
  for (;;) {
    const inicio = texto.indexOf('server {', cursor)
    if (inicio === -1) return achados
    const abre = texto.indexOf('{', inicio)
    let nivel = 0
    let fim = -1
    for (let i = abre; i < texto.length; i++) {
      if (texto[i] === '{') nivel += 1
      else if (texto[i] === '}') {
        nivel -= 1
        if (nivel === 0) {
          fim = i
          break
        }
      }
    }
    if (fim === -1) throw new Error('server sem fechamento')
    achados.push(limpar(texto.slice(abre + 1, fim)))
    cursor = fim
  }
}

const PROXY = 'location ~ ^/(api|sanctum|up)(/|$)'

const [PROD_80] = servidores(PROD)
const TLS_SERVIDORES = servidores(TLS)
const TLS_80 = TLS_SERVIDORES.find((s) => s.includes('listen 80;'))!
const TLS_443 = TLS_SERVIDORES.find((s) => s.includes('listen 443'))!

describe('deploy/nginx/tls.conf vs docker/nginx/prod.conf', () => {
  it('cada arquivo tem os servidores que se espera — 80 no prod, 80 + 443 no tls', () => {
    expect(servidores(PROD)).toHaveLength(1)
    expect(TLS_SERVIDORES).toHaveLength(2)
    expect(TLS_80).toBeDefined()
    expect(TLS_443).toBeDefined()
  })

  it('o proxy do fastcgi é IDÊNTICO nos dois — é a razão de existir desta catraca', () => {
    expect(corpo(TLS_443, PROXY)).toBe(corpo(PROD_80, PROXY))
  })

  it('o cache dos assets com hash é idêntico', () => {
    expect(corpo(TLS_443, 'location /assets/')).toBe(corpo(PROD_80, 'location /assets/'))
  })

  it('o fallback do SPA é idêntico — inclusive o Cache-Control do index.html', () => {
    expect(corpo(TLS_443, 'location / {')).toBe(corpo(PROD_80, 'location / {'))
  })

  it('o teto de upload é idêntico — 12m nos dois, ou o 413 aparece só sob TLS', () => {
    const teto = (servidor: string) => servidor.match(/^client_max_body_size .*$/m)?.[0]
    expect(teto(TLS_443)).toBeDefined()
    expect(teto(TLS_443)).toBe(teto(PROD_80))
  })
})

describe('deploy/nginx/tls.conf — o servidor da porta 80', () => {
  it('isenta o /up do redirect, por match EXATO (Q-1: a sonda interna fala HTTP puro)', () => {
    expect(TLS_80).toContain('location = /up')
  })

  it('e o /up isento chega ao MESMO fastcgi do proxy — não a um stub que responde 200 vazio', () => {
    expect(corpo(TLS_80, 'location = /up')).toBe(corpo(PROD_80, PROXY))
  })

  it('continua redirecionando todo o resto para HTTPS — a isenção não abriu a porta', () => {
    expect(corpo(TLS_80, 'location / {')).toMatch(/^return 301 https:\/\/\$host\$request_uri;$/m)
  })

  it('serve o challenge do certbot por webroot — sem derrubar o nginx na renovação', () => {
    expect(corpo(TLS_80, 'location /.well-known/acme-challenge/')).toContain('root /var/www/certbot;')
  })
})
