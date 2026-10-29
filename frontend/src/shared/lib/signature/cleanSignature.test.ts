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

/** Disco de diametro `d` centrado em (cx, cy): o pixel entra se o centro dele cai dentro. */
function disco(r: Raster, cx: number, cy: number, d: number, cinza: number) {
  const raio = d / 2
  for (let y = Math.floor(cy - raio); y <= Math.ceil(cy + raio); y++) {
    for (let x = Math.floor(cx - raio); x <= Math.ceil(cx + raio); x++) {
      if ((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= raio * raio) {
        r.data.set([cinza, cinza, cinza, 255], (y * r.width + x) * 4)
      }
    }
  }
}

const alfaEm = (r: Raster, x: number, y: number) => r.data[(y * r.width + x) * 4 + 3]

/**
 * Foto de 3400 px com caneta de 11 px. Corpo em L com o pe dominante (caixa de
 * 3200 x 512, x 100..3299, y 199..710), pingo de i de 1,5 w de diametro (208
 * px, ~1,7 w2) 31 px acima da base, e manchas de 2, 3 e 4 px de lado (4, 9 e 16
 * px, todas abaixo de 0,5 w2 = 60). Sem margem, o recorte de 3200 px sai pela
 * METADE: o ponto (x, y) da foto vai a ((x - 100) / 2, (y - 199) / 2).
 */
function fotoComPingo(): Raster {
  const r = papel(3400, 800, 250)
  retangulo(r, 100, 700, 3200, 11, 20) // linha de base
  retangulo(r, 100, 199, 11, 501, 20) // haste, ligada a base
  disco(r, 1700, 661, 16.5, 20) // pingo: sai em (800, 231)
  retangulo(r, 900, 401, 2, 2, 20) // manchas: saem em (400, 101), (1100, 126) e (1400, 51)
  retangulo(r, 2300, 451, 3, 3, 20)
  retangulo(r, 2900, 301, 4, 4, 20)
  return r
}

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
    // Caneta de 4 px: o pingo 4x4 vale 1 w2. Com o corpo de 20 px de antes ele
    // seria 0,04 w2, poeira para a regra da rodada 4.
    const r = papel(300, 200, 255)
    retangulo(r, 50, 100, 100, 4, 0)
    retangulo(r, 230, 40, 4, 4, 0) // pingo longe do corpo

    const saida = cleanSignature(r, { margin: 0 })

    expect(saida.width).toBe(234 - 50)
    expect(saida.height).toBe(104 - 40)
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

  it('mancha do tamanho do traco (10x10 com caneta de 10 px) fica: por area e um pingo de i', () => {
    // A rodada 3 apagava esta mancha pela area da caixa do corpo. 1 w2 ja passa
    // do toque da caneta no papel (disco de diametro w, ~0,8 w2): perder tinta
    // e pior que deixar poeira (ruling da rodada 4).
    const r = papel(1600, 600, 255)
    retangulo(r, 50, 50, 1500, 10, 0) // corpo em L: caixa de 1500 x 500
    retangulo(r, 50, 50, 10, 500, 0)
    retangulo(r, 800, 300, 10, 10, 0) // 100 px = 1 w2, dentro da caixa

    const saida = cleanSignature(r, { margin: 0 })

    expect(saida.width).toBe(1500)
    expect(saida.height).toBe(500)
    expect(alfaEm(saida, 755, 255)).toBe(255) // a mancha
    expect(alfaEm(saida, 5, 250)).toBe(255) // o traco vertical
  })

  it('foto de 3400 px com caneta de 11 px: o pingo do i (1,5 w) continua, com alfa pleno', () => {
    // A rodada 3 apagava tudo abaixo de 2e-4 x a caixa do corpo (328 px aqui),
    // e o pingo de 208 px sumia. Agora o limiar e 0,5 x 11^2 = 60,5 px.
    const saida = cleanSignature(fotoComPingo(), { margin: 0 })

    expect(saida.width).toBe(1600)
    expect(saida.height).toBe(256)
    expect(alfaEm(saida, 800, 231)).toBe(255)
  })

  it('na mesma foto, as manchas de 2 a 4 px (menos de 0,5 w2) somem, sem resto visivel', () => {
    const saida = cleanSignature(fotoComPingo(), { margin: 0 })

    // Fora da haste (x < 6), da base (y >= 250) e do pingo nao sobra nada visivel.
    let sobra = 0
    for (let y = 0; y < 250; y++) {
      for (let x = 6; x < saida.width; x++) {
        const noPingo = x >= 795 && x < 806 && y >= 226 && y < 237
        if (!noPingo && alfaEm(saida, x, y) > 0) sobra++
      }
    }
    expect(sobra).toBe(0)
    expect(alfaEm(saida, 2, 120)).toBe(255) // a haste continua
  })

  it('traco fino de 2 px numa caixa grande: vale o piso, o pingo 4x4 fica e a poeira de 1 a 4 px some', () => {
    // Haste dominante (vertical) de 2 px: w = 2, k x w2 = 2 e o piso 6 decide.
    // A rodada 3 cobrava 2e-4 x a caixa de 200 x 600 (24 px) e apagava o pingo.
    const r = papel(400, 800, 255)
    retangulo(r, 100, 50, 2, 600, 0) // haste: x 100..101, y 50..649
    retangulo(r, 100, 648, 200, 2, 0) // pe: x 100..299, y 648..649
    retangulo(r, 200, 300, 4, 4, 0) // pingo 4x4 (16 px)
    retangulo(r, 150, 200, 1, 1, 0) // poeira de 1, 2 e 4 px
    retangulo(r, 250, 450, 2, 1, 0)
    retangulo(r, 180, 550, 2, 2, 0)

    const saida = cleanSignature(r, { margin: 0 })

    expect(saida.width).toBe(200)
    expect(saida.height).toBe(600)
    expect(alfaEm(saida, 101, 251)).toBe(255) // o pingo
    expect(alfaEm(saida, 50, 150)).toBe(0) // a poeira
    expect(alfaEm(saida, 150, 400)).toBe(0)
    expect(alfaEm(saida, 151, 400)).toBe(0)
    expect(alfaEm(saida, 81, 501)).toBe(0)
  })

  it('o corpo (a maior mancha) nunca e apagado, nem com o limiar relativo exagerado', () => {
    const r = papel(300, 200, 255)
    retangulo(r, 50, 100, 200, 10, 0) // corpo: 2000 px, caneta de 10 px
    retangulo(r, 50, 150, 100, 10, 0) // segunda peca: 1000 px

    // 100 w2 = 10000 px: as duas pecas ficam abaixo, mas so a segunda pode cair.
    const saida = cleanSignature(r, { margin: 0, cropMinComponentStrokeArea: 100 })

    expect(saida.width).toBe(200)
    expect(saida.height).toBe(10)
    expect(alfaEm(saida, 100, 5)).toBe(255)
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
