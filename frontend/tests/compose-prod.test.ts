import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

/**
 * O compose de produção tem duas propriedades que build, lint e suíte não veem,
 * e cuja violação é silenciosa: um serviço de dev que reaparece e um volume de
 * código que volta. As duas negam a DoD do bloco ("sem MySQL/MinIO/Mailpit de
 * dev em produção", "não depende do working tree do servidor") sem quebrar
 * nada — o `docker compose up` fica verde dos dois jeitos.
 *
 * A conferência é TEXTUAL de propósito: o projeto não tem parser de YAML, e
 * acrescentar dependência de runtime ao frontend por causa de arquivo de infra
 * seria acoplamento na direção errada. O custo está declarado: um serviço
 * escrito em fluxo YAML (`{mysql: ...}`) escaparia. Ninguém escreve compose
 * assim aqui, e a alternativa custava uma dependência nova.
 */
const RAIZ = resolve(__dirname, '..', '..')
const PROD = readFileSync(join(RAIZ, 'docker-compose.prod.yml'), 'utf8')

const SERVICOS_DE_DEV = ['mysql', 'minio', 'createbuckets', 'mailpit']

/**
 * Recorta o bloco de um serviço (da linha "  <nome>:" até a próxima linha de
 * serviço no mesmo nível de indentação, ou o fim do arquivo). Usado só pela
 * asserção de depends_on, que precisa provar a dependência DENTRO do serviço
 * `nginx` — e não em qualquer lugar do arquivo.
 */
function blocoDoServico(nome: string): string {
  const inicio = new RegExp(`^ {2}${nome}:$`, 'm').exec(PROD)
  if (!inicio) return ''
  const resto = PROD.slice(inicio.index + inicio[0].length)
  const fimRelativo = resto.slice(1).search(/^ {2}\S/m)
  return fimRelativo === -1 ? resto : resto.slice(0, fimRelativo + 1)
}

describe('docker-compose.prod.yml', () => {
  it.each(SERVICOS_DE_DEV)('não declara o serviço de dev %s', (servico) => {
    expect(PROD).not.toMatch(new RegExp(`^\\s{2}${servico}:`, 'm'))
  })

  it('não declara `volumes:` em serviço nenhum — qualquer forma de bind mount do working tree entraria por aí', () => {
    // Ancorado na CHAVE, não na forma do mount: cobre "- .:/var/www",
    // "- ../backend", "${PWD}/backend" e a forma longa
    // "{type: bind, source: ...}" de uma vez só, porque todas elas só podem
    // existir sob uma chave `volumes:` de serviço (indentação de 4 espaços).
    expect(PROD).not.toMatch(/^ {4}volumes:/m)
  })

  it('lê os segredos de um env_file, nunca de valores inline', () => {
    expect(PROD).toMatch(/^ {4}env_file:/m)
    // Metade que faltava provar: nenhum serviço pode ter `environment:` — é
    // essa chave que permitiria segredo inline tipo DB_PASSWORD/APP_KEY.
    expect(PROD).not.toMatch(/^ {4}environment:/m)
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
    const blocoNginx = blocoDoServico('nginx')
    expect(blocoNginx).toMatch(/^ {4}depends_on:\s*(\[\s*app\s*\]|\r?\n(\s*- \S+\r?\n)*\s*- app\b)/m)
  })

  it('mantém o Gotenberg, que o ADR-12 exige', () => {
    expect(PROD).toMatch(/^\s{2}gotenberg:/m)
  })
})
