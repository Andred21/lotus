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
    retangulo(r, 0, 0, 3000, 500, 0)

    const saida = cleanSignature(r, { margin: 0 })

    expect(saida.width).toBe(SIGNATURE_MAX_WIDTH)
    expect(saida.height).toBe(Math.round((500 * 1600) / 3000))
    expect(saida.data.length).toBe(saida.width * saida.height * 4)
  })

  it('800 px de largura nao sao ampliados', () => {
    const r = papel(800, 200, 255)
    retangulo(r, 0, 0, 800, 100, 0)

    const saida = cleanSignature(r, { margin: 0 })

    expect(saida.width).toBe(800)
    expect(saida.height).toBe(100)
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
