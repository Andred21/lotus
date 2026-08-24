import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

/**
 * O compose de DESENVOLVIMENTO tem uma propriedade cuja violação é
 * silenciosa: uma porta host literal volta, o arquivo segue subindo na
 * máquina de quem a escreveu, e só a SEGUNDA árvore descobre — na hora em
 * que a segunda lane de backend precisa existir (P-03). Este arquivo prova
 * por texto que toda porta publicada vem de variável com default histórico,
 * e que toda variável lida tem linha declarada no `.env.example` da raiz.
 *
 * Mora em `frontend/tests/` pelo mesmo motivo medido de `compose-prod.test.ts`
 * e `repo-docs-refs.test.ts`: o container `app` monta só `./backend` e
 * `./frontend`, então PHPUnit não enxerga a raiz. O vitest roda nativo no WSL
 * e é o único runner do projeto com acesso a ela.
 */
const RAIZ = resolve(__dirname, '..', '..')
const DEV = readFileSync(join(RAIZ, 'docker-compose.yml'), 'utf8')
const EXEMPLO = readFileSync(join(RAIZ, '.env.example'), 'utf8')

/**
 * A porta histórica de cada serviço. É o valor que quem clona o repositório
 * SEM `.env` na raiz continua recebendo — a parametrização abre a segunda
 * árvore, não muda a primeira.
 */
const DEFAULTS: Record<string, string> = {
  LOTUS_DEV_HTTP_PORT: '8080',
  LOTUS_DEV_DB_PORT: '3307',
  LOTUS_DEV_MAILPIT_PORT: '8025',
  LOTUS_DEV_MINIO_PORT: '9000',
  LOTUS_DEV_MINIO_CONSOLE_PORT: '9001',
  LOTUS_DEV_VITE_PORT: '5173',
}

/** Recorta o bloco de um serviço, da linha "  <nome>:" até o próximo serviço no mesmo nível. */
function blocoDoServico(nome: string, texto: string = DEV): string {
  const inicio = new RegExp(`^ {2}${nome}:.*$`, 'm').exec(texto)
  if (!inicio) {
    throw new Error(`serviço "${nome}" não encontrado no texto informado`)
  }
  const resto = texto.slice(inicio.index + inicio[0].length)
  const fimRelativo = resto.slice(1).search(/^ {2}\S/m)
  return fimRelativo === -1 ? resto : resto.slice(0, fimRelativo + 1)
}

/** Recorta todas as regiões que uma chave de nível de serviço (4 espaços) abrange. */
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

describe('docker-compose.yml', () => {
  it('publica toda porta host por variável LOTUS_DEV_*, nunca literal', () => {
    const regioes = regioesDaChave(DEV, 'ports')
    expect(regioes.length).toBeGreaterThan(0)
    for (const regiao of regioes) {
      const mapeamentos = [...regiao.matchAll(/["']([^"']+)["']/g)].map((m) => m[1])
      expect(mapeamentos.length).toBeGreaterThan(0)
      for (const mapeamento of mapeamentos) {
        expect(mapeamento).toMatch(/^\$\{LOTUS_DEV_[A-Z_]+:-\d+\}:\d+$/)
      }
      // Uma entrada SEM aspas ("- 8080:80") escaparia do laço acima; o que
      // sobra depois de remover os mapeamentos citados não pode conter
      // nenhum par de porta.
      const semMapeamentosCitados = regiao.replace(/["'][^"']*["']/g, '')
      expect(semMapeamentosCitados).not.toMatch(/\d+\s*:\s*\d+/)
    }
  })

  it.each(Object.entries(DEFAULTS).filter(([nome]) => nome !== 'LOTUS_DEV_VITE_PORT'))(
    'usa a porta histórica como default de %s',
    (nome, porta) => {
      expect(DEV).toMatch(new RegExp(`\\$\\{${nome}:-${porta}\\}`))
    },
  )

  it('declara no .env.example da raiz toda variável LOTUS_DEV_* que lê', () => {
    const lidas = new Set([...DEV.matchAll(/\$\{(LOTUS_DEV_[A-Z_]+)/g)].map((m) => m[1]))
    expect(lidas.size).toBeGreaterThan(0)
    for (const nome of lidas) {
      expect(EXEMPLO).toMatch(new RegExp(`^\\s*#?\\s*${nome}=`, 'm'))
    }
  })

  it('injeta no app toda chave de URL que carrega porta, derivada da mesma variável', () => {
    // Sem isto, trocar o offset sobe a stack e derruba a sessão: o cookie do
    // Sanctum é emitido para o domínio de APP_URL e conferido contra
    // SANCTUM_STATEFUL_DOMAINS, e a URL pública de arquivo aponta para a
    // porta do MinIO da OUTRA árvore. Foi o passo manual de 2026-08-19.
    const CHAVES: Record<string, string> = {
      APP_URL: 'LOTUS_DEV_HTTP_PORT',
      FRONTEND_URL: 'LOTUS_DEV_VITE_PORT',
      SANCTUM_STATEFUL_DOMAINS: 'LOTUS_DEV_HTTP_PORT',
      AWS_ENDPOINT_PUBLIC: 'LOTUS_DEV_MINIO_PORT',
      AWS_URL: 'LOTUS_DEV_MINIO_PORT',
    }
    const [environmentDoApp] = regioesDaChave(blocoDoServico('app'), 'environment')
    expect(environmentDoApp).toBeDefined()
    for (const [chave, variavel] of Object.entries(CHAVES)) {
      const linha = new RegExp(`^\\s*${chave}:.*\\$\\{${variavel}:-\\d+\\}`, 'm')
      expect(environmentDoApp ?? '').toMatch(linha)
    }
  })
})
