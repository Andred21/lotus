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
 * da rampa em 120. Desde o smoke da Task 14 o papel é um MAPA por blocos de 32
 * px (gradiente de luz e sombra de dedo), e as manchas pequenas são apagadas.
 * Validado nas três imagens SINTÉTICAS do smoke (foto com gradiente forte e
 * sombra no canto, foto com gradiente suave, scan): fundo transparente, sem
 * retângulo cinza e recorte rente. Segue faltando assinatura de papel real,
 * fotografada por celular; o ajuste, se for preciso, é nestes defaults, em
 * `CleanSignatureOptions`, sem mexer no resto.
 */
export interface CleanSignatureOptions {
  /** Percentil da luminância, dentro de cada bloco, que representa o papel (0..1). */
  paperPercentile: number
  /**
   * Lado mínimo, em px, do bloco em que o papel é estimado. O papel é um MAPA,
   * não um número: foto de celular tem gradiente de luz e sombra de dedo, e um
   * valor único deixava um retângulo cinza atrás da assinatura (smoke da Task
   * 14). Em imagem grande o bloco cresce para a grade não passar de 64 células
   * no lado maior.
   */
  paperBlock: number
  /**
   * Raio, em células, da vizinhança cuja mediana substitui um bloco inteiro
   * coberto de tinta (o percentil alto dele cai na própria tinta). Só vale para
   * o bloco que despenca mais de `inkFull` abaixo da mediana: sombra e gradiente
   * ficam como medidos. Raio 1 = janela 3x3: segura mancha de tinta de até ~2
   * células de lado (~64 px com blocos de 32).
   */
  paperMedianRadius: number
  /** Distância até o papel (0..255) abaixo da qual o pixel é fundo: alfa 0. */
  inkFloor: number
  /** Distância a partir da qual o pixel é tinta plena: alfa 255. */
  inkFull: number
  /** Alfa mínimo para o pixel contar como tinta no recorte (descarta poeira). */
  cropMinAlpha: number
  /**
   * Tamanho mínimo, em pixels, de uma mancha de tinta (componente conexo, vizinhança
   * 8). Piso absoluto: poeira de 1 a 4 px (e 5) cai; um pingo de i de 3x3 (~9 px)
   * fica. Traço fino ligado ao corpo é do mesmo componente e nunca é cortado.
   */
  cropMinComponentPx: number
  /**
   * Mínimo RELATIVO da mancha: fração da área da caixa da maior mancha (o corpo
   * da assinatura). Foto de celular tem pontinhos de 4 a 16 px de diâmetro (até
   * ~200 px de área em 3000 px de largura), que o piso absoluto não pega. O
   * limiar efetivo é max(`cropMinComponentPx`, razão x área da caixa do corpo):
   * em 600 px de largura dá o próprio piso, em 3000 px dá ~250 px de área (cai
   * mancha de até ~17 px de diâmetro). O custo é o pingo de i abaixo disso, que
   * também cai: a razão é o botão se o smoke mostrar pingo sumindo.
   */
  cropMinComponentRatio: number
  /** Margem, em px da imagem de origem, entre a tinta e a borda do recorte. */
  margin: number
  maxWidth: number
}

export const DEFAULT_CLEAN_OPTIONS: CleanSignatureOptions = {
  paperPercentile: 0.9,
  paperBlock: 32,
  paperMedianRadius: 1,
  inkFloor: 28,
  inkFull: 120,
  cropMinAlpha: 32,
  cropMinComponentPx: 6,
  cropMinComponentRatio: 2e-4,
  margin: 8,
  maxWidth: SIGNATURE_MAX_WIDTH,
}

/** Luminância (Rec. 601) com o alfa composto sobre branco: transparente = papel. */
function luminanceOnWhite(d: Uint8ClampedArray, i: number): number {
  const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
  const a = d[i + 3] / 255
  return lum * a + 255 * (1 - a)
}

interface PaperMap {
  /** Luminância estimada do papel no pixel (x, y), por interpolação bilinear. */
  at(x: number, y: number): number
}

function median(values: number[]): number {
  values.sort((a, b) => a - b)
  return values[values.length >> 1]
}

/**
 * Mapa do papel: percentil alto da luminância por bloco, mediana sobre a grade
 * de blocos (cobre o bloco todo de tinta) e interpolação bilinear entre os
 * centros dos blocos. O(pixels): um histograma de 256 posições por bloco.
 */
function estimatePaper(lums: Float32Array, width: number, height: number, o: CleanSignatureOptions): PaperMap {
  const cell = Math.max(o.paperBlock, Math.ceil(Math.max(width, height) / 256))
  const cols = Math.ceil(width / cell)
  const rows = Math.ceil(height / cell)
  const histograms = new Uint32Array(cols * rows * 256)
  const counts = new Uint32Array(cols * rows)
  for (let y = 0; y < height; y++) {
    const rowBase = Math.floor(y / cell) * cols
    for (let x = 0; x < width; x++) {
      const c = rowBase + Math.floor(x / cell)
      histograms[c * 256 + Math.min(255, Math.round(lums[y * width + x]))]++
      counts[c]++
    }
  }
  const raw = new Float32Array(cols * rows)
  for (let c = 0; c < raw.length; c++) {
    const target = counts[c] * o.paperPercentile
    let acc = 0
    let v = 0
    for (; v < 255; v++) {
      acc += histograms[c * 256 + v]
      if (acc >= target) break
    }
    raw[c] = v
  }
  const r = o.paperMedianRadius
  const grid = new Float32Array(raw.length)
  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      const window: number[] = []
      for (let yy = Math.max(0, cy - r); yy <= Math.min(rows - 1, cy + r); yy++) {
        for (let xx = Math.max(0, cx - r); xx <= Math.min(cols - 1, cx + r); xx++) window.push(raw[yy * cols + xx])
      }
      // A mediana só TROCA o bloco quando ele despenca abaixo da vizinhança por uma
      // distância de tinta plena: é bloco coberto de tinta. Sombra e gradiente não
      // caem tanto entre blocos vizinhos, e a mediana de janela cortada na borda
      // da imagem é enviesada, então não pode mexer neles.
      const around = median(window)
      grid[cy * cols + cx] = raw[cy * cols + cx] < around - o.inkFull ? around : raw[cy * cols + cx]
    }
  }
  return {
    at(x, y) {
      const gx = Math.min(cols - 1, Math.max(0, (x + 0.5) / cell - 0.5))
      const gy = Math.min(rows - 1, Math.max(0, (y + 0.5) / cell - 0.5))
      const x0 = Math.floor(gx)
      const y0 = Math.floor(gy)
      const x1 = Math.min(cols - 1, x0 + 1)
      const y1 = Math.min(rows - 1, y0 + 1)
      const fx = gx - x0
      const fy = gy - y0
      const top = grid[y0 * cols + x0] * (1 - fx) + grid[y0 * cols + x1] * fx
      const bottom = grid[y1 * cols + x0] * (1 - fx) + grid[y1 * cols + x1] * fx
      return top * (1 - fy) + bottom * fy
    },
  }
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

interface InkBlob {
  start: number
  count: number
  x0: number
  y0: number
  x1: number
  y1: number
}

/**
 * Caixa da união das manchas de tinta, ou null. Descarta a poeira e as manchas
 * pequenas APAGANDO-AS de `alpha` (com o halo de borda): o que fica dentro do
 * recorte aparece no PNG, então só tirá-las da caixa não bastava.
 * Rotulagem por inundação ITERATIVA (pilha em Int32Array, sem recursão: imagem
 * de 12 MP estouraria a pilha de chamadas), O(pixels): cada pixel entra na pilha
 * uma só vez, marcado ao empilhar. Memória: 1 byte por pixel de `visited` e 8
 * por pixel de tinta (pilha e lista de membros).
 */
function inkBox(alpha: Uint8Array, width: number, height: number, o: CleanSignatureOptions) {
  const minAlpha = o.cropMinAlpha
  let inkPixels = 0
  for (let p = 0; p < alpha.length; p++) if (alpha[p] >= minAlpha) inkPixels++
  const visited = new Uint8Array(alpha.length)
  const stack = new Int32Array(inkPixels)
  const members = new Int32Array(inkPixels)
  const blobs: InkBlob[] = []
  let used = 0

  for (let seed = 0; seed < alpha.length; seed++) {
    if (alpha[seed] < minAlpha || visited[seed]) continue
    const blob: InkBlob = { start: used, count: 0, x0: width, y0: height, x1: -1, y1: -1 }
    let top = 0
    stack[top++] = seed
    visited[seed] = 1
    while (top > 0) {
      const p = stack[--top]
      members[used++] = p
      const x = p % width
      const y = (p - x) / width
      if (x < blob.x0) blob.x0 = x
      if (x > blob.x1) blob.x1 = x
      if (y < blob.y0) blob.y0 = y
      if (y > blob.y1) blob.y1 = y
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
    blob.count = used - blob.start
    blobs.push(blob)
  }
  if (!blobs.length) return null

  const body = blobs.reduce((a, b) => (b.count > a.count ? b : a))
  const bodyArea = (body.x1 - body.x0 + 1) * (body.y1 - body.y0 + 1)
  const minPx = Math.max(o.cropMinComponentPx, Math.round(o.cropMinComponentRatio * bodyArea))

  let minX = width, minY = height, maxX = -1, maxY = -1
  for (const blob of blobs) {
    if (blob.count >= minPx) {
      minX = Math.min(minX, blob.x0)
      maxX = Math.max(maxX, blob.x1)
      minY = Math.min(minY, blob.y0)
      maxY = Math.max(maxY, blob.y1)
      continue
    }
    for (let k = blob.start; k < blob.start + blob.count; k++) {
      const p = members[k]
      const x = p % width
      const y = (p - x) / width
      for (let yy = Math.max(0, y - 1); yy <= Math.min(height - 1, y + 1); yy++) {
        for (let xx = Math.max(0, x - 1); xx <= Math.min(width - 1, x + 1); xx++) {
          // Só o halo fraco (abaixo de minAlpha) vai junto: tinta forte vizinha é de outra mancha.
          if (alpha[yy * width + xx] < minAlpha) alpha[yy * width + xx] = 0
        }
      }
      alpha[p] = 0
    }
  }
  return { minX, minY, maxX, maxY }
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
  const paper = estimatePaper(lums, width, height, o)

  const alpha = new Uint8Array(pixels)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = y * width + x
      alpha[p] = rampAlpha(paper.at(x, y) - lums[p], o)
    }
  }
  const box = inkBox(alpha, width, height, o)
  if (!box || box.maxX < 0) throw new EmptySignatureError()
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
      const local = paper.at(x, y)
      for (let c = 0; c < 3; c++) {
        cropped.data[o4 + c] = (data[p * 4 + c] - local * keep) / (a / 255)
      }
      cropped.data[o4 + 3] = a
    }
  }

  return cropped.width > o.maxWidth ? downscale(cropped, o.maxWidth) : cropped
}
