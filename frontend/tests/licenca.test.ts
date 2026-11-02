import { describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const raiz = resolve(__dirname, '..', '..')
const ler = (caminho: string) => readFileSync(resolve(raiz, caminho), 'utf8')

describe('licença proprietária (bloco 45)', () => {
  it('LICENSE existe, reserva os direitos em pt-BR e es e não concede nada', () => {
    expect(existsSync(resolve(raiz, 'LICENSE'))).toBe(true)
    const licenca = ler('LICENSE')
    expect(licenca).toContain('Todos os direitos reservados')
    expect(licenca).toContain('Todos los derechos reservados')
    expect(licenca).toContain('João Victor Andreoli')
    expect(licenca).not.toContain('Permission is hereby granted')
    expect(licenca).not.toMatch(/\bMIT\b/)
  })

  it('composer.json é proprietary e não carrega a chave version', () => {
    const composer = JSON.parse(ler('backend/composer.json'))
    expect(composer.license).toBe('proprietary')
    expect(composer).not.toHaveProperty('version')
  })

  it('package.json do frontend é UNLICENSED e private', () => {
    const pacote = JSON.parse(ler('frontend/package.json'))
    expect(pacote.license).toBe('UNLICENSED')
    expect(pacote.private).toBe(true)
  })

  it('nenhum manifest versionado declara MIT', () => {
    const versionados = execFileSync('git', ['ls-files'], { cwd: raiz, encoding: 'utf8' })
      .split('\n')
      .filter((f) => /(^|\/)(package|composer)\.json$/.test(f))
      .filter((f) => !/(^|\/)(vendor|node_modules)\//.test(f))
    expect(versionados.length).toBeGreaterThan(0)
    for (const arquivo of versionados) {
      expect(ler(arquivo), arquivo).not.toMatch(/"license"\s*:\s*"MIT"/)
    }
  })
})
