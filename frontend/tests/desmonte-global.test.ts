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
