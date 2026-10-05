import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

/**
 * O log da aplicação sai do host para o CloudWatch por 30 dias (ADR-21). Sem
 * `zend.exception_ignore_args`, o stack trace grava cada argumento string com
 * até 15 caracteres, e um RUT cabe nisso. A imagem `php:8.3-fpm-alpine` não traz
 * `php.ini`, então a diretiva só liga se a imagem de produção copiar o ini.
 *
 * Mora em `frontend/tests/` pelo mesmo motivo de `compose-dev.test.ts`: o
 * container `app` não enxerga a raiz do repositório.
 */
const RAIZ = resolve(__dirname, '..', '..')
const INI = readFileSync(join(RAIZ, 'docker', 'php', 'excecoes.ini'), 'utf8')
const DOCKERFILE = readFileSync(join(RAIZ, 'docker', 'Dockerfile.prod'), 'utf8')

const COPY_DO_INI = 'COPY docker/php/excecoes.ini /usr/local/etc/php/conf.d/zz-excecoes.ini'

describe('imagem de produção: stack trace sem argumentos', () => {
  it('excecoes.ini liga zend.exception_ignore_args', () => {
    expect(INI).toMatch(/^zend\.exception_ignore_args\s*=\s*On$/m)
  })

  it('o estágio app do Dockerfile.prod copia o ini para conf.d', () => {
    const estagio = DOCKERFILE.match(/ AS app\n([\s\S]*?)(?=^FROM )/m)
    expect(estagio, 'estágio app não encontrado').not.toBeNull()
    expect(estagio?.[1].split(/\r?\n/)).toContain(COPY_DO_INI)
  })
})
