/**
 * D-71 / UI-04 (audits/2026-09-04-lotus-ui-review-administracion.md): os rótulos
 * `perm.*` aparecem na tela de papéis e permissões e não podem carregar
 * referência interna (Flujo N, RN-NN, soft delete). Lê as três locales do disco.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(__dirname, '..')

describe.each(['es-CL', 'pt-BR', 'en'])('rótulos perm.* em %s', (locale) => {
  const json = JSON.parse(
    readFileSync(resolve(root, `src/shared/config/locales/${locale}.json`), 'utf8'),
  ) as { perm: Record<string, string> }
  const entradas = Object.entries(json.perm ?? {})

  it('o bloco perm existe e não está vazio', () => {
    expect(entradas.length).toBeGreaterThan(30)
  })

  it.each(entradas)('%s não cita referência interna', (_chave, rotulo) => {
    expect(rotulo).not.toMatch(/Flujo|Fluxo|Flow|RN-\d|soft delete/)
  })
})
