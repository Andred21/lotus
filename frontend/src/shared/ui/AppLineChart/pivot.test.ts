import { describe, expect, it } from 'vitest'
import { pivot } from './pivot'

describe('pivot', () => {
  it('junta séries pelo eixo x, na ordem em que os x aparecem', () => {
    const linhas = pivot([
      { key: 'a', label: 'A', points: [{ x: '2026-01', y: 1 }, { x: '2026-02', y: 2 }] },
      { key: 'b', label: 'B', points: [{ x: '2026-01', y: 10 }, { x: '2026-02', y: 20 }] },
    ])

    expect(linhas).toEqual([
      { x: '2026-01', a: 1, b: 10 },
      { x: '2026-02', a: 2, b: 20 },
    ])
  })

  // Buraco no MEIO da série é ausência de ponto, não zero: o backend só projeta
  // o mês que tem registro, e desenhar 0 ali afirmaria "aconteceu nada" onde a
  // verdade é "não se sabe". Mesma lei da D7 aplicada dentro da linha.
  it('mês sem registro numa série não vira zero — a chave simplesmente falta', () => {
    const linhas = pivot([
      { key: 'a', label: 'A', points: [{ x: '2026-01', y: 1 }, { x: '2026-03', y: 3 }] },
      { key: 'b', label: 'B', points: [{ x: '2026-02', y: 20 }] },
    ])

    // Ordem ordenada, não a de chegada das séries: o eixo é do gráfico, não da
    // lista. Quem prova a ordenação é o caso seguinte; aqui o que importa é
    // que `2026-02` não ganhou `a: 0` nem `2026-01` ganhou `b: 0`.
    expect(linhas).toEqual([
      { x: '2026-01', a: 1 },
      { x: '2026-02', b: 20 },
      { x: '2026-03', a: 3 },
    ])
  })

  it('ordena o eixo pelo x, não pela ordem de chegada das séries', () => {
    const linhas = pivot([
      { key: 'a', label: 'A', points: [{ x: '2026-03', y: 3 }] },
      { key: 'b', label: 'B', points: [{ x: '2026-01', y: 1 }] },
    ])

    expect(linhas.map((l) => l.x)).toEqual(['2026-01', '2026-03'])
  })

  it('série vazia não cria linha nenhuma', () => {
    expect(pivot([{ key: 'a', label: 'A', points: [] }])).toEqual([])
  })
})
