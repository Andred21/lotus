import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(__dirname, '..')
const fonte = (caminho: string) => readFileSync(resolve(root, caminho), 'utf8')

/**
 * O par que a `CLEANUP_A_MAO` pressupõe.
 *
 * A catraca do eslint proíbe `afterEach(cleanup)` escrito à mão em arquivo de
 * teste. Sozinha ela deixa o repositório PIOR na falha: apagado o `setupFiles`,
 * nenhum teste desmonta nada, a proibição segue de pé e NADA acusa — a suíte
 * fica verde com componente vazando entre casos, que é exatamente o defeito que
 * a P-69 fechou. Uma catraca que só faz sentido enquanto a outra existir precisa
 * que a outra seja verificada, e é isto aqui.
 *
 * Estático de propósito: um teste que RODASSE dentro do setup provaria que o
 * setup rodou naquele arquivo, não que ele está declarado para todos.
 */
describe('desmonte entre testes (P-69)', () => {
  it('o vite.config declara o arquivo de setup', () => {
    expect(fonte('vite.config.ts')).toMatch(/setupFiles:\s*\[\s*["']\.\/src\/test-setup\.ts["']\s*\]/)
  })

  it('o arquivo de setup registra o desmonte no `afterEach`', () => {
    const setup = fonte('src/test-setup.ts')
    expect(setup).toMatch(/from '@testing-library\/react'/)
    expect(setup).toMatch(/afterEach\(cleanup\)/)
  })
})

/** O recorte do config do Vite que este arquivo inspeciona. */
type ProjetoDeTeste = {
  test?: { name?: string; environment?: string; setupFiles?: string[]; include?: string[] }
}
type ConfigDeTeste = { test?: { projects?: ProjetoDeTeste[] } }

/**
 * O par que a guarda acima pressupõe, depois que a suíte passou a rodar em
 * dois projetos (item 27).
 *
 * A asserção de texto do `setupFiles` casa a linha em QUALQUER lugar do
 * arquivo. Com `projects`, isso deixou de provar o que provava: um
 * `setupFiles` declarado no projeto `repo` passaria a régua e deixaria todo o
 * `src/**` sem desmonte — que é exatamente o buraco que a P-69 fechou. Estas
 * asserções ligam o setup ao projeto CERTO.
 *
 * O molde de carregar a fábrica é o do `compose-dev.test.ts`, que já a chama
 * para inspecionar `server.port` e `define`.
 */
describe('separação de ambientes por projeto (item 27)', () => {
  async function projetos(): Promise<ProjetoDeTeste[]> {
    const { default: fabrica } = await import('../vite.config')
    expect(typeof fabrica).toBe('function')
    const config = (await fabrica({ command: 'serve', mode: 'development' })) as ConfigDeTeste
    const lista = config.test?.projects
    expect(Array.isArray(lista)).toBe(true)
    return lista as ProjetoDeTeste[]
  }

  const acharProjeto = (lista: ProjetoDeTeste[], nome: string) =>
    lista.find((projeto) => projeto.test?.name === nome)

  it('o projeto que cobre `src/**` roda em jsdom e é quem declara o setup', async () => {
    const unit = acharProjeto(await projetos(), 'unit')
    expect(unit).toBeDefined()
    expect(unit?.test?.environment).toBe('jsdom')
    expect(unit?.test?.setupFiles).toEqual(['./src/test-setup.ts'])
    expect(unit?.test?.include).toEqual(['src/**/*.test.{ts,tsx}'])
  })

  it('o projeto que cobre `tests/**` roda em node e NÃO declara setup', async () => {
    const repo = acharProjeto(await projetos(), 'repo')
    expect(repo).toBeDefined()
    expect(repo?.test?.environment).toBe('node')
    expect(repo?.test?.setupFiles).toBeUndefined()
    expect(repo?.test?.include).toEqual(['tests/**/*.test.{ts,tsx}'])
  })

  it('este arquivo está de fato rodando sem DOM', () => {
    // A prova de comportamento, e não de declaração: se `tests/` voltar para
    // jsdom, `document` existe e este caso reprova. É o par de runtime das
    // duas asserções estruturais acima.
    expect(typeof document).toBe('undefined')
  })
})
