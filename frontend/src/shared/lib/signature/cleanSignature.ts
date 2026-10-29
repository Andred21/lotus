/**
 * Limpeza da imagem de assinatura (spec D16 do bloco 40). Função PURA sobre
 * pixels RGBA: não toca canvas, DOM nem arquivo, e por isso roda no vitest sem
 * navegador. A ponte com o canvas é `canvasBridge.ts`.
 *
 * Etapas: (1) estima o papel pelo percentil alto da luminância; (2) converte a
 * distância até o papel em ALFA por uma rampa suave; (3) recorta rente à tinta;
 * (4) reduz para `maxWidth`, sem nunca ampliar.
 */

export interface Raster {
  width: number
  height: number
  /** RGBA, 4 bytes por pixel, linha a linha. */
  data: Uint8ClampedArray
}

/** Teto de largura do resultado. 1600 px numa caixa de 60 mm passam de 600 DPI. */
export const SIGNATURE_MAX_WIDTH = 1600

/** Espelha `ContentClass::LARGURA_MINIMA_ASSINATURA_PX`: o servidor recusa abaixo disso. */
export const SIGNATURE_MIN_WIDTH = 600

/** Espelha o teto de 1024 KB da `ContentClass::Assinatura`. */
export const SIGNATURE_MAX_BYTES = 1024 * 1024

export class EmptySignatureError extends Error {
  constructor() {
    super('A imagem não tem nenhum traço de assinatura.')
    this.name = 'EmptySignatureError'
  }
}

/** O navegador não decodifica o arquivo (ex.: PDF, GIF animado corrompido, HEIC). */
export class UnsupportedImageError extends Error {
  constructor() {
    super('O navegador não consegue ler este formato de imagem.')
    this.name = 'UnsupportedImageError'
  }
}

/**
 * Limiares. ATENÇÃO: calibrados SÓ com rasters sintéticos, não com assinatura
 * real. Os casos que os testes reproduzem são:
 *  - caneta preta em papel branco (distância ~255);
 *  - caneta fraca, luminância ~170 em papel 250 (distância ~80), que precisa
 *    ficar VISÍVEL (alfa ~165 com os defaults);
 *  - fundo cinza 180 com ruído de ±10 (distância máxima ~18 sobre o papel
 *    estimado), que precisa sumir por inteiro.
 * O piso fica em 28 (acima do ruído sintético, abaixo da caneta fraca) e o teto
 * da rampa em 120.
 * Falta a amostra real que a spec §8 pede (assinaturas do protótipo e foto de
 * celular): ela sai do smoke do bloco 40 (Task 14), onde foto de celular e scan
 * são subidos pelo navegador. O ajuste, se for preciso, é nestes defaults, em
 * `CleanSignatureOptions`, sem mexer no resto.
 */
export interface CleanSignatureOptions {
  /** Percentil da luminância que representa o papel (0..1). */
  paperPercentile: number
  /** Distância até o papel (0..255) abaixo da qual o pixel é fundo: alfa 0. */
  inkFloor: number
  /** Distância a partir da qual o pixel é tinta plena: alfa 255. */
  inkFull: number
  /** Alfa mínimo para o pixel contar como tinta no recorte (descarta poeira). */
  cropMinAlpha: number
  /**
   * Tamanho mínimo, em pixels, de uma mancha de tinta (componente conexo, vizinhança
   * 8) para entrar na caixa do recorte. Poeira, borda de foto e artefato de JPEG
   * são de 1 a 4 px e caem; um pingo de i tem dezenas de pixels em resolução de
   * foto (3x3 já dá ~9) e fica. Traço fino ligado ao corpo é parte do mesmo
   * componente, então nunca é cortado, por mais fino que seja.
   */
  cropMinComponentPx: number
  /** Margem, em px da imagem de origem, entre a tinta e a borda do recorte. */
  margin: number
  maxWidth: number
}

export const DEFAULT_CLEAN_OPTIONS: CleanSignatureOptions = {
  paperPercentile: 0.9,
  inkFloor: 28,
  inkFull: 120,
  cropMinAlpha: 32,
  cropMinComponentPx: 6,
  margin: 8,
  maxWidth: SIGNATURE_MAX_WIDTH,
}

/** Luminância (Rec. 601) com o alfa composto sobre branco: transparente = papel. */
function luminanceOnWhite(d: Uint8ClampedArray, i: number): number {
  const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
  const a = d[i + 3] / 255
  return lum * a + 255 * (1 - a)
}

function estimatePaper(lums: Float32Array, percentile: number): number {
  const histogram = new Uint32Array(256)
  for (const l of lums) histogram[Math.min(255, Math.round(l))]++
  const target = lums.length * percentile
  let acc = 0
  for (let v = 0; v < 256; v++) {
    acc += histogram[v]
    if (acc >= target) return v
  }
  return 255
}

/** Alfa por rampa linear entre `inkFloor` e `inkFull`: caneta fraca não some. */
function rampAlpha(distance: number, o: CleanSignatureOptions): number {
  if (distance <= o.inkFloor) return 0
  if (distance >= o.inkFull) return 255
  return Math.round(((distance - o.inkFloor) / (o.inkFull - o.inkFloor)) * 255)
}

/** Reduz por média de área em alfa pré-multiplicado (sem halo escuro nas bordas). */
function downscale(src: Raster, width: number): Raster {
  const height = Math.max(1, Math.round((src.height * width) / src.width))
  const sx = src.width / width
  const sy = src.height / height
  const out = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) {
    const y0 = Math.floor(y * sy)
    const y1 = Math.min(src.height, Math.max(y0 + 1, Math.ceil((y + 1) * sy)))
    for (let x = 0; x < width; x++) {
      const x0 = Math.floor(x * sx)
      const x1 = Math.min(src.width, Math.max(x0 + 1, Math.ceil((x + 1) * sx)))
      let r = 0, g = 0, b = 0, a = 0
      for (let yy = y0; yy < y1; yy++) {
        for (let xx = x0; xx < x1; xx++) {
          const i = (yy * src.width + xx) * 4
          const w = src.data[i + 3]
          r += src.data[i] * w
          g += src.data[i + 1] * w
          b += src.data[i + 2] * w
          a += w
        }
      }
      const n = (y1 - y0) * (x1 - x0)
      const o = (y * width + x) * 4
      if (a > 0) {
        out[o] = r / a
        out[o + 1] = g / a
        out[o + 2] = b / a
      }
      out[o + 3] = a / n
    }
  }
  return { width, height, data: out }
}

/**
 * Caixa da união das manchas de tinta com pelo menos `minPx` pixels, ou null.
 * Rotulagem por inundação ITERATIVA (pilha em Int32Array, sem recursão: imagem
 * de 12 MP estouraria a pilha de chamadas), O(pixels): cada pixel entra na pilha
 * uma só vez, marcado ao empilhar. Memória: 1 byte por pixel de `visited` e 4
 * por pixel de tinta da pilha.
 */
function inkBox(alpha: Uint8Array, width: number, height: number, minAlpha: number, minPx: number) {
  let inkPixels = 0
  for (let p = 0; p < alpha.length; p++) if (alpha[p] >= minAlpha) inkPixels++
  const visited = new Uint8Array(alpha.length)
  const stack = new Int32Array(inkPixels)
  let minX = width, minY = height, maxX = -1, maxY = -1

  for (let seed = 0; seed < alpha.length; seed++) {
    if (alpha[seed] < minAlpha || visited[seed]) continue
    let top = 0
    stack[top++] = seed
    visited[seed] = 1
    let count = 0
    let cx0 = width, cy0 = height, cx1 = -1, cy1 = -1
    while (top > 0) {
      const p = stack[--top]
      const x = p % width
      const y = (p - x) / width
      count++
      if (x < cx0) cx0 = x
      if (x > cx1) cx1 = x
      if (y < cy0) cy0 = y
      if (y > cy1) cy1 = y
      for (let dy = -1; dy <= 1; dy++) {
        const ny = y + dy
        if (ny < 0 || ny >= height) continue
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx
          if (nx < 0 || nx >= width) continue
          const n = ny * width + nx
          if (visited[n] || alpha[n] < minAlpha) continue
          visited[n] = 1
          stack[top++] = n
        }
      }
    }
    if (count < minPx) continue
    if (cx0 < minX) minX = cx0
    if (cx1 > maxX) maxX = cx1
    if (cy0 < minY) minY = cy0
    if (cy1 > maxY) maxY = cy1
  }
  return maxX < 0 ? null : { minX, minY, maxX, maxY }
}

export function cleanSignature(
  input: Raster,
  options: Partial<CleanSignatureOptions> = {},
): Raster {
  const o = { ...DEFAULT_CLEAN_OPTIONS, ...options }
  const { width, height, data } = input
  const pixels = width * height

  const lums = new Float32Array(pixels)
  for (let p = 0; p < pixels; p++) lums[p] = luminanceOnWhite(data, p * 4)
  const paper = estimatePaper(lums, o.paperPercentile)

  const alpha = new Uint8Array(pixels)
  for (let p = 0; p < pixels; p++) alpha[p] = rampAlpha(paper - lums[p], o)
  const box = inkBox(alpha, width, height, o.cropMinAlpha, o.cropMinComponentPx)
  if (!box) throw new EmptySignatureError()
  const { minX, minY, maxX, maxY } = box

  const x0 = Math.max(0, minX - o.margin)
  const y0 = Math.max(0, minY - o.margin)
  const x1 = Math.min(width - 1, maxX + o.margin)
  const y1 = Math.min(height - 1, maxY + o.margin)
  const cropped: Raster = {
    width: x1 - x0 + 1,
    height: y1 - y0 + 1,
    data: new Uint8ClampedArray((x1 - x0 + 1) * (y1 - y0 + 1) * 4),
  }
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const p = y * width + x
      const a = alpha[p]
      const o4 = ((y - y0) * cropped.width + (x - x0)) * 4
      if (a === 0) continue
      // Desfaz a mistura com o papel nas bordas: sem isto o traço semitransparente
      // ficaria com um contorno claro sobre o certificado.
      const keep = 1 - a / 255
      for (let c = 0; c < 3; c++) {
        cropped.data[o4 + c] = (data[p * 4 + c] - paper * keep) / (a / 255)
      }
      cropped.data[o4 + 3] = a
    }
  }

  return cropped.width > o.maxWidth ? downscale(cropped, o.maxWidth) : cropped
}
