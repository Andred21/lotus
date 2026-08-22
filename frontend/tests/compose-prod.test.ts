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

describe('docker-compose.prod.yml', () => {
  it.each(SERVICOS_DE_DEV)('não declara o serviço de dev %s', (servico) => {
    expect(PROD).not.toMatch(new RegExp(`^\\s{2}${servico}:`, 'm'))
  })

  it('não monta o working tree em serviço nenhum', () => {
    expect(PROD).not.toMatch(/-\s*\.\/(backend|frontend)/)
  })

  it('lê os segredos de um env_file, nunca de valores inline', () => {
    expect(PROD).toMatch(/env_file:/)
  })

  it('deixa a imagem trocável por variável, que é o gancho da promoção por SHA', () => {
    expect(PROD).toMatch(/\$\{LOTUS_IMAGE/)
    expect(PROD).toMatch(/\$\{LOTUS_WEB_IMAGE/)
  })

  it('mantém o Gotenberg, que o ADR-12 exige', () => {
    expect(PROD).toMatch(/^\s{2}gotenberg:/m)
  })
})
