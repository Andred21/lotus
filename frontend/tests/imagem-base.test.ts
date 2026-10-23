import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

/**
 * Piso de segurança das imagens base da produção. PHP2Shell (CVE-2026-109618 e
 * CVE-2026-109619, RCE sem autenticação no core do PHP) foi corrigido em 8.3.36,
 * e a produção rodava 8.3.33 — medido em 2026-10-23 no host. A release de
 * segurança do Node de 2026-10-21 (CVE-2026-111497, Brotli) foi corrigida em
 * 22.23.4.
 *
 * A tag ao lado do digest é o único lugar onde se lê a versão, então ela tem de
 * trazer a versão exata: `php:8.3-fpm-alpine@sha256:…` não diz se a base é
 * anterior ou posterior à correção, e é por isso que este teste a recusa.
 *
 * Mora em `frontend/tests/` pelo mesmo motivo de `compose-dev.test.ts`: o
 * container `app` não enxerga a raiz do repositório.
 */
const RAIZ = resolve(__dirname, '..', '..')
const DOCKERFILE = readFileSync(join(RAIZ, 'docker', 'Dockerfile.prod'), 'utf8')
const INI = readFileSync(join(RAIZ, 'docker', 'php', 'seguranca.ini'), 'utf8')

const COPY_DO_INI = 'COPY docker/php/seguranca.ini /usr/local/etc/php/conf.d/zz-seguranca.ini'

const versao = (texto: string) => texto.split('.').map(Number)
const naoMenorQue = (atual: number[], piso: number[]) => {
  for (let i = 0; i < piso.length; i++) {
    if (atual[i] !== piso[i]) return atual[i] > piso[i]
  }
  return true
}

describe('imagem de produção: piso de segurança das bases', () => {
  it('o php do estágio app tem versão exata ≥ 8.3.36 e digest fixado', () => {
    const from = DOCKERFILE.match(/^FROM php:(8\.3\.\d+)-fpm-alpine@sha256:[0-9a-f]{64} AS app$/m)
    expect(from, 'FROM php sem versão exata ou sem digest').not.toBeNull()
    expect(naoMenorQue(versao(from![1]), [8, 3, 36]), `php ${from![1]} < 8.3.36`).toBe(true)
  })

  it('o node do estágio spa tem versão exata ≥ 22.23.4 e digest fixado', () => {
    const from = DOCKERFILE.match(
      /^FROM --platform=\$BUILDPLATFORM node:(22\.\d+\.\d+)-alpine@sha256:[0-9a-f]{64} AS spa$/m,
    )
    expect(from, 'FROM node sem versão exata ou sem digest').not.toBeNull()
    expect(naoMenorQue(versao(from![1]), [22, 23, 4]), `node ${from![1]} < 22.23.4`).toBe(true)
  })

  it('seguranca.ini desliga o upload progress da sessão', () => {
    expect(INI).toMatch(/^session\.upload_progress\.enabled\s*=\s*Off$/m)
  })

  it('o estágio app do Dockerfile.prod copia o ini para conf.d', () => {
    const estagio = DOCKERFILE.match(/ AS app\n([\s\S]*?)(?=^FROM )/m)
    expect(estagio, 'estágio app não encontrado').not.toBeNull()
    expect(estagio?.[1].split(/\r?\n/)).toContain(COPY_DO_INI)
  })
})
