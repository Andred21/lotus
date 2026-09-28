import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

/**
 * `deploy/aws/env.prod.example` é duas coisas: a referência de NOMES de chave do botão (a
 * conferência de alinhamento do item 31 lê os nomes do host e os compara com o molde) e a
 * referência de VALORES do humano que instala pelo runbook §7/§11. O botão fecha a primeira; nada
 * fechava a segunda — e foi assim que `APP_URL` e `FRONTEND_URL` ficaram em `http://` enquanto o
 * §11 e o resto do molde já diziam https (achado do item 32).
 *
 * Os seis campos abaixo são os do §11: os que viram quando o TLS entra.
 */
const RAIZ = resolve(__dirname, '..', '..')
const MOLDE = readFileSync(join(RAIZ, 'deploy', 'aws', 'env.prod.example'), 'utf8')
const LINHAS = MOLDE.split(/\r?\n/)
const ATRIBUICAO = /^[A-Za-z_][A-Za-z0-9_]*=/
const ATRIBUICOES = LINHAS.filter((linha) => ATRIBUICAO.test(linha))

function valorDe(chave: string): string {
  const linha = ATRIBUICOES.find((l) => l.startsWith(`${chave}=`))
  if (linha === undefined) throw new Error(`chave ausente no molde: ${chave}`)
  // Template uses `valor   # nota` on some lines; docker compose env_file treats whitespace+# as comment
  return linha.slice(chave.length + 1).replace(/\s+#.*$/, '')
}

const DOMINIO = 'app.lotusotec.cl'

describe('deploy/aws/env.prod.example — os seis campos do runbook §11', () => {
  it.each([
    ['APP_URL', `https://${DOMINIO}`],
    ['FRONTEND_URL', `https://${DOMINIO}`],
    ['CERTIFICATE_VALIDATION_URL', `https://${DOMINIO}`],
    ['SANCTUM_STATEFUL_DOMAINS', DOMINIO],
    ['SESSION_DOMAIN', DOMINIO],
    ['SESSION_SECURE_COOKIE', 'true'],
  ])('%s=%s', (chave, esperado) => {
    expect(valorDe(chave)).toBe(esperado)
  })

  it('nenhuma chave duplicada — o botão lê nomes, e no container a segunda ocorrência venceria em silêncio', () => {
    const nomes = ATRIBUICOES.map((l) => l.slice(0, l.indexOf('=')))
    expect(new Set(nomes).size).toBe(nomes.length)
  })

  it('nenhum valor continua na linha seguinte — o corte por `=` do botão é linha a linha (§7)', () => {
    const soltas = LINHAS.filter((l) => l !== '' && !/^\s*#/.test(l) && !ATRIBUICAO.test(l))
    expect(soltas).toEqual([])
  })
})
