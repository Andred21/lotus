import { describe, expect, it } from 'vitest'
import { secoesVisiveis } from './secoes'
import type { DashboardVisibilityData } from '@shared/types/generated'

const tudo: DashboardVisibilityData = { operation: true, commercial: true, certification: true, identity: true }
const nada: DashboardVisibilityData = { operation: false, commercial: false, certification: false, identity: false }

describe('secoesVisiveis', () => {
  it('com os quatro módulos visíveis, toda seção é visível', () => {
    expect(Object.values(secoesVisiveis(tudo)).every(Boolean)).toBe(true)
  })

  it('sem nenhum módulo visível, nenhuma seção é visível', () => {
    expect(Object.values(secoesVisiveis(nada)).some(Boolean)).toBe(false)
  })

  // Seção que lê de dois módulos pede os dois (spec D8): quem combina é este
  // lugar só, não cada painel.
  it('só operação: as seções que pedem outro módulo ficam fechadas e a série segue aberta', () => {
    const s = secoesVisiveis({ ...nada, operation: true })

    expect(s.pipeline).toBe(false)
    expect(s.rankings).toBe(false)
    expect(s.redatores).toBe(false)
    expect(s.cotacoes).toBe(false)
    expect(s.ufMetrica).toBe(false)
    expect(s.certificadosAEmitir).toBe(false)

    expect(s.series).toBe(true)
    expect(s.turmas).toBe(true)
    expect(s.agenda).toBe(true)
    expect(s.compliance).toBe(true)
  })

  it('só comercial: a série e a métrica de UF abrem, a operação não', () => {
    const s = secoesVisiveis({ ...nada, commercial: true })

    expect(s.series).toBe(true)
    expect(s.ufMetrica).toBe(true)
    expect(s.cotacoes).toBe(true)
    expect(s.agenda).toBe(false)
    expect(s.turmas).toBe(false)
  })

  it('funil e rankings pedem operação E certificação', () => {
    expect(secoesVisiveis({ ...nada, operation: true, certification: true }).pipeline).toBe(true)
    expect(secoesVisiveis({ ...nada, operation: true, certification: true }).rankings).toBe(true)
    expect(secoesVisiveis({ ...nada, certification: true }).pipeline).toBe(false)
  })

  it('carga de relatores pede identidade E operação', () => {
    expect(secoesVisiveis({ ...nada, identity: true, operation: true }).redatores).toBe(true)
    expect(secoesVisiveis({ ...nada, identity: true }).redatores).toBe(false)
    expect(secoesVisiveis({ ...nada, operation: true }).redatores).toBe(false)
  })

  it('só identidade não abre seção nenhuma', () => {
    expect(Object.values(secoesVisiveis({ ...nada, identity: true })).some(Boolean)).toBe(false)
  })
})
