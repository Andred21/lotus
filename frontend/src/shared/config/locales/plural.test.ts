import { describe, expect, it } from 'vitest'
import i18n from '../i18n'

/**
 * A `parity.test.ts` prova ESTRUTURA: que as 3 locales têm as mesmas chaves.
 * Ela não prova PLURAL — copiar `"{{count}} clientes"` nas duas formas passa
 * verde lá. É isto que este arquivo mede.
 *
 * A comparação tira o número das duas saídas antes de comparar: com ele dentro,
 * "1 usuario" e "2 usuarios" diferem sempre, inclusive quando as duas formas
 * carregam o mesmo substantivo — que é exatamente o defeito que se quer pegar.
 */
const CHAVES = [
  'admin.count',
  'course.count',
  'courseModule.countShort',
  'role.count',
  'dashboard.compliance.count',
  'dashboard.redatorLoad.count',
  'client.count',
  'budget.count',
  'quote.studentsShort',
  'redator.count',
  'student.count',
  'operation.pending.students',
  'operation.table.count',
  'operation.enrollment.footerCount',
  'certificate.vigenciaMeses',
  'certificate.certCount',
  'certificate.validation.hours',
] as const

const IDIOMAS = ['es-CL', 'pt-BR', 'en'] as const

const semNumero = (texto: string, n: number) => texto.replace(String(n), '').trim()

describe('plural das chaves de contagem', () => {
  it.each(IDIOMAS)('%s: toda chave de contagem tem forma singular própria', (lng) => {
    const t = i18n.getFixedT(lng)

    const semSingular = CHAVES.filter(
      (k) => semNumero(t(k, { count: 1 }), 1) === semNumero(t(k, { count: 2 }), 2),
    )

    expect(
      semSingular,
      `Em ${lng} estas chaves usam o mesmo texto para 1 e para 2: ${semSingular.join(', ') || '—'}`,
    ).toEqual([])
  })

  it.each(IDIOMAS)('%s: a forma de 1 traz o número 1, não some com ele', (lng) => {
    const t = i18n.getFixedT(lng)

    for (const k of CHAVES) {
      expect(t(k, { count: 1 }), `${lng} / ${k}`).toContain('1')
    }
  })
})
