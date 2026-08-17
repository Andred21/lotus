import { describe, expect, it } from 'vitest'
import { historicoCards, resumoCards } from './resumoCards'

describe('resumoCards', () => {
  // As 4 chaves de `RedatorResumoData` são NÃO-anuláveis (`generated.ts:433-438`):
  // não há gate a esconder, então nenhum card some. É a diferença estrutural
  // para `kpiCards`, e é o que faz o Redator não ter estado `unauthorized`.
  it('os 4 contadores viram 4 cards, na ordem do contrato', () => {
    expect(
      resumoCards({
        turmas_em_andamento: 2,
        proximas_turmas: 1,
        pendencias_documentais: 3,
        documentos_vencendo: 0,
      }).map((c) => c.key),
    ).toEqual([
      'dashboard.redator.kpi.turmasEmAndamento',
      'dashboard.redator.kpi.proximasTurmas',
      'dashboard.redator.kpi.pendenciasDocumentais',
      'dashboard.redator.kpi.documentosVencendo',
    ])
  })

  it('zero vira card — não há null a esconder neste contrato', () => {
    const cards = resumoCards({
      turmas_em_andamento: 0,
      proximas_turmas: 0,
      pendencias_documentais: 0,
      documentos_vencendo: 0,
    })
    expect(cards).toHaveLength(4)
    expect(cards.every((c) => c.value === '0')).toBe(true)
  })

  // Pendência e vencimento levam tom; turma em curso e próxima, não: tom é
  // severidade, e "tenho 2 turmas" não é aviso de nada.
  it('só pendência e vencimento carregam tom de severidade', () => {
    const porChave = Object.fromEntries(
      resumoCards({
        turmas_em_andamento: 2,
        proximas_turmas: 1,
        pendencias_documentais: 3,
        documentos_vencendo: 1,
      }).map((c) => [c.key, c.tone]),
    )
    expect(porChave).toEqual({
      'dashboard.redator.kpi.turmasEmAndamento': 'info',
      'dashboard.redator.kpi.proximasTurmas': 'neutral',
      'dashboard.redator.kpi.pendenciasDocumentais': 'warning',
      'dashboard.redator.kpi.documentosVencendo': 'warning',
    })
  })
})

describe('historicoCards', () => {
  // Instância SEPARADA de KpiRow, e não seis cards numa fileira: resumo e
  // histórico respondem perguntas diferentes — "o que tenho agora" e "o que já
  // fiz" — e o Drive as separa. Cada uma leva sua faixa de seção.
  it('os 2 contadores do histórico viram 2 cards neutros', () => {
    const cards = historicoCards({ turmas_concluidas: 9, certificados_emitidos: 41 })
    expect(cards.map((c) => c.key)).toEqual([
      'dashboard.redator.kpi.turmasConcluidas',
      'dashboard.redator.kpi.certificadosEmitidos',
    ])
    expect(cards.map((c) => c.value)).toEqual(['9', '41'])
    expect(cards.every((c) => c.tone === 'neutral')).toBe(true)
  })
})
