import { describe, expect, it } from 'vitest'
import {
  cleanSignature,
  EmptySignatureError,
  SIGNATURE_MAX_WIDTH,
  SIGNATURE_MIN_WIDTH,
  type Raster,
} from './cleanSignature'

/** Raster sintetico: fundo de um cinza so, com ruido deterministico opcional. */
function papel(width: number, height: number, cinza: number, ruido = 0): Raster {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let i = 0; i < width * height; i++) {
    // Ruido pseudo-aleatorio mas reprodutivel: o teste nao pode flutuar.
    const delta = ruido ? ((i * 2654435761) % (2 * ruido + 1)) - ruido : 0
    data.set([cinza + delta, cinza + delta, cinza + delta, 255], i * 4)
  }
  return { width, height, data }
}

function retangulo(r: Raster, x0: number, y0: number, w: number, h: number, cinza: number) {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) r.data.set([cinza, cinza, cinza, 255], (y * r.width + x) * 4)
  }
}

const alfaEm = (r: Raster, x: number, y: number) => r.data[(y * r.width + x) * 4 + 3]

/** Papel com luz desigual: `de` num canto e `ate` no oposto, mais sombra opcional num canto. */
function papelComSombra(width: number, height: number, de: number, ate: number, sombra = 0): Raster {
  const r = papel(width, height, 0)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const d = Math.hypot(x, height - 1 - y) // distancia ao canto inferior esquerdo
      const v = de + ((ate - de) * (x / width + y / height)) / 2 - sombra * Math.exp(-((d / 90) ** 2))
      r.data.set([v, v, v, 255], (y * width + x) * 4)
    }
  }
  return r
}

/** Pixels com alfa > 0 FORA da caixa [x0,x1) x [y0,y1): o que sobrou de fundo. */
function tintaFora(r: Raster, x0: number, y0: number, x1: number, y1: number): number {
  let n = 0
  for (let y = 0; y < r.height; y++) {
    for (let x = 0; x < r.width; x++) {
      if (alfaEm(r, x, y) > 0 && (x < x0 || x >= x1 || y < y0 || y >= y1)) n++
    }
  }
  return n
}

describe('cleanSignature', () => {
  it('traco preto em papel branco: fundo vira alfa 0 e traco alfa 255', () => {
    const r = papel(200, 100, 255)
    retangulo(r, 80, 40, 40, 20, 0)

    const saida = cleanSignature(r, { margin: 5 })

    expect(alfaEm(saida, 0, 0)).toBe(0)
    expect(alfaEm(saida, saida.width - 1, saida.height - 1)).toBe(0)
    expect(alfaEm(saida, 5 + 20, 5 + 10)).toBe(255)
  })

  it('recorta rente ao traco com a margem', () => {
    const r = papel(200, 100, 255)
    retangulo(r, 80, 40, 40, 20, 0)

    const saida = cleanSignature(r, { margin: 5 })

    expect(saida.width).toBe(40 + 2 * 5)
    expect(saida.height).toBe(20 + 2 * 5)
  })

  it('caneta fraca (luminancia ~170 em papel 250) continua visivel', () => {
    const r = papel(200, 100, 250)
    retangulo(r, 80, 40, 40, 20, 170)

    const saida = cleanSignature(r, { margin: 0 })

    expect(saida.width).toBe(40)
    expect(alfaEm(saida, 20, 10)).toBeGreaterThan(100)
  })

  it('foto com fundo cinza ruidoso (180 +- 10) perde o fundo inteiro', () => {
    const r = papel(300, 150, 180, 10)
    retangulo(r, 100, 60, 100, 30, 20)

    const saida = cleanSignature(r, { margin: 4 })

    // O recorte so e rente ao traco se NENHUM pixel do ruido virou tinta.
    expect(saida.width).toBe(100 + 2 * 4)
    expect(saida.height).toBe(30 + 2 * 4)
    expect(alfaEm(saida, 1, 1)).toBe(0)
    expect(alfaEm(saida, saida.width - 2, 2)).toBe(0)
  })

  it('3000 px de largura saem com 1600, na mesma proporcao', () => {
    const r = papel(3000, 1000, 255)
    retangulo(r, 0, 0, 3000, 30, 0) // faixa fina: traco, nao metade da foto de tinta

    const saida = cleanSignature(r, { margin: 0 })

    expect(saida.width).toBe(SIGNATURE_MAX_WIDTH)
    expect(saida.height).toBe(Math.round((30 * 1600) / 3000))
    expect(saida.data.length).toBe(saida.width * saida.height * 4)
  })

  it('800 px de largura nao sao ampliados', () => {
    const r = papel(800, 200, 255)
    retangulo(r, 0, 0, 800, 20, 0)

    const saida = cleanSignature(r, { margin: 0 })

    expect(saida.width).toBe(800)
    expect(saida.height).toBe(20)
  })

  it('pixels pretos isolados longe da assinatura nao esticam o recorte', () => {
    // Poeira, borda de foto, sombra de dedo, artefato de JPEG: um ou dois pixels
    // de tinta num canto nao podem arrastar a caixa ate la.
    const r = papel(200, 100, 255)
    retangulo(r, 80, 40, 40, 20, 0)
    retangulo(r, 2, 2, 2, 1, 0) // dois pixels lado a lado
    retangulo(r, 197, 97, 1, 1, 0) // um pixel so

    const saida = cleanSignature(r, { margin: 5 })

    expect(saida.width).toBe(40 + 2 * 5)
    expect(saida.height).toBe(20 + 2 * 5)
  })

  it.each([
    ['horizontal de 1 px', 'h', 1],
    ['horizontal de 2 px', 'h', 2],
    ['vertical de 1 px', 'v', 1],
    ['vertical de 2 px', 'v', 2],
  ])('traco %s ligado ao corpo sai inteiro', (_nome, eixo, espessura) => {
    // Regressao da rodada 1: o minimo por linha/coluna cortava o traco fino que
    // sai de um corpo grande, e o pedaco fora da caixa sumia do PNG.
    const r = papel(500, 300, 255)
    retangulo(r, 50, 100, 100, 40, 0) // corpo: x 50..149, y 100..139
    if (eixo === 'h') retangulo(r, 150, 100, 200, espessura as number, 0) // +200 px para a direita
    else retangulo(r, 100, 140, espessura as number, 80, 0) // +80 px para baixo

    const saida = cleanSignature(r, { margin: 0 })

    expect(saida.width).toBe(eixo === 'h' ? 300 : 100)
    expect(saida.height).toBe(eixo === 'h' ? 40 : 120)
  })

  it('parte desconexa pequena (pingo de i, 4x4) fica dentro da caixa', () => {
    const r = papel(300, 200, 255)
    retangulo(r, 50, 100, 100, 20, 0)
    retangulo(r, 230, 40, 4, 4, 0) // pingo longe do corpo

    const saida = cleanSignature(r, { margin: 0 })

    expect(saida.width).toBe(234 - 50)
    expect(saida.height).toBe(120 - 40)
  })

  it('gradiente forte de sombra (250 a 150): fundo inteiro some e o recorte fica rente', () => {
    // Regressao do smoke da Task 14: com UM papel so, o canto escuro virava tinta.
    const r = papelComSombra(600, 400, 250, 150)
    retangulo(r, 200, 150, 200, 12, 20)

    const saida = cleanSignature(r, { margin: 4 })

    expect(saida.width).toBe(200 + 8)
    expect(saida.height).toBe(12 + 8)
    expect(tintaFora(saida, 4, 4, 204, 16)).toBe(0)
    expect(alfaEm(saida, 100, 10)).toBe(255)
  })

  it('sombra de dedo escura no canto nao vira tinta nem estica o recorte', () => {
    const r = papelComSombra(600, 400, 250, 150, 130)
    retangulo(r, 200, 150, 200, 12, 20)

    const saida = cleanSignature(r, { margin: 4 })

    expect(saida.width).toBe(200 + 8)
    expect(saida.height).toBe(12 + 8)
    expect(tintaFora(saida, 4, 4, 204, 16)).toBe(0)
  })

  it('bloco de papel todo coberto de tinta continua tinta', () => {
    // O percentil alto de um bloco 100% de tinta cai na propria tinta; a mediana
    // da vizinhanca devolve o papel e o miolo nao vira buraco.
    const r = papelComSombra(400, 300, 250, 200)
    retangulo(r, 90, 90, 60, 60, 10)

    const saida = cleanSignature(r, { margin: 0 })

    expect(saida.width).toBe(60)
    expect(saida.height).toBe(60)
    expect(alfaEm(saida, 30, 30)).toBe(255)
    expect(alfaEm(saida, 0, 0)).toBe(255)
  })

  it('manchas pequenas dentro do recorte somem do resultado, com alfa 0', () => {
    // Antes elas so saiam da CAIXA; entre dois tracos, dentro do recorte,
    // apareciam como pontinhos.
    const r = papel(300, 200, 255)
    retangulo(r, 50, 100, 200, 12, 0) // traco de cima
    retangulo(r, 50, 160, 200, 12, 0) // traco de baixo
    retangulo(r, 100, 130, 2, 2, 0) // poeira entre os dois
    retangulo(r, 200, 140, 1, 1, 0)
    retangulo(r, 150, 125, 3, 1, 0)

    const saida = cleanSignature(r, { margin: 0 })

    expect(saida.width).toBe(200)
    expect(saida.height).toBe(72)
    expect(alfaEm(saida, 100 - 50, 130 - 100)).toBe(0)
    // Entre os tracos (linhas 12..59 do recorte) nao sobra nenhum pixel visivel.
    let sobra = 0
    for (let y = 12; y < 60; y++) for (let x = 0; x < 200; x++) if (alfaEm(saida, x, y) > 0) sobra++
    expect(sobra).toBe(0)
  })

  it('numa foto grande a mancha de ate ~100 px de area tambem some, o traco nao', () => {
    const r = papel(1600, 600, 255)
    retangulo(r, 50, 50, 1500, 10, 0) // corpo em L: caixa de 1500 x 500
    retangulo(r, 50, 50, 10, 500, 0)
    retangulo(r, 800, 300, 10, 10, 0) // mancha de 100 px dentro da caixa

    const saida = cleanSignature(r, { margin: 0 })

    expect(saida.width).toBe(1500)
    expect(saida.height).toBe(500)
    expect(alfaEm(saida, 750, 250)).toBe(0) // a mancha
    expect(alfaEm(saida, 5, 250)).toBe(255) // o traco vertical
  })

  it('o pingo 4x4 de um i continua la, com alfa pleno', () => {
    const r = papel(300, 200, 255)
    retangulo(r, 50, 100, 100, 20, 0)
    retangulo(r, 230, 40, 4, 4, 0)

    const saida = cleanSignature(r, { margin: 0 })

    expect(alfaEm(saida, 232 - 50, 42 - 40)).toBe(255)
  })

  it('so poeira, sem traco, lanca EmptySignatureError', () => {
    const r = papel(100, 100, 255)
    retangulo(r, 10, 10, 2, 1, 0)

    expect(() => cleanSignature(r)).toThrow(EmptySignatureError)
  })

  it('caneta fraca e fina (3 px de espessura) nao e tratada como poeira', () => {
    const r = papel(300, 100, 250)
    retangulo(r, 50, 50, 200, 3, 170)

    const saida = cleanSignature(r, { margin: 0 })

    expect(saida.width).toBe(200)
    expect(saida.height).toBe(3)
  })

  it('o minimo do servidor e a largura maxima sao os do contrato', () => {
    expect(SIGNATURE_MIN_WIDTH).toBe(600)
    expect(SIGNATURE_MAX_WIDTH).toBe(1600)
  })

  it('imagem em branco lanca EmptySignatureError', () => {
    expect(() => cleanSignature(papel(100, 100, 255))).toThrow(EmptySignatureError)
  })

  it('foto so de fundo ruidoso tambem lanca EmptySignatureError', () => {
    expect(() => cleanSignature(papel(100, 100, 180, 10))).toThrow(EmptySignatureError)
  })

  it('PNG que ja tem fundo transparente conta como papel branco', () => {
    const r = papel(100, 50, 0)
    r.data.fill(0) // tudo transparente
    retangulo(r, 40, 20, 20, 10, 0)

    const saida = cleanSignature(r, { margin: 0 })

    expect(saida.width).toBe(20)
  })

  it('nao altera o raster de entrada', () => {
    const r = papel(100, 50, 255)
    retangulo(r, 40, 20, 20, 10, 0)
    const copia = new Uint8ClampedArray(r.data)

    cleanSignature(r)

    expect(r.data).toEqual(copia)
  })
})
