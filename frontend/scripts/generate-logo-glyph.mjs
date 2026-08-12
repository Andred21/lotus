// Gera o glifo isolado da marca a partir do wordmark versionado (UI-06 do
// review de 2026-08-12).
//
// Existe porque a sidebar colapsada não exibia marca nenhuma — e abaixo de
// 1024px ela é SEMPRE colapsada, então tablet e mobile nunca viam a identidade
// em rota nenhuma. O wordmark inteiro não cabe num rail de 80px: o asset é
// retrato 335x466 e, reduzido à largura do rail, o texto "LOTUS" fica ilegível
// (foi a mesma armadilha do achado nº 1 do checkpoint, no outro sentido).
//
// O recorte é MEDIDO, não cravado: o script acha a caixa dos pixels celestes e
// corta ali. Se o wordmark for trocado, o glifo sai do asset novo — e
// `tests/logo-glyph.test.ts` reprova enquanto ninguém rodar `pnpm logo-glyph`.
//
// O glifo é o mesmo nos dois temas (o celeste não muda entre LogoLight e
// LogoDark — conferido: a caixa azul é byte a byte a mesma nos dois), então há
// um arquivo só, e ele serve sobre a navy fixa da sidebar.
//
// Saída VERSIONADA em src/assets/LogoGlyph.png — não editar à mão.
import { readFileSync, writeFileSync } from 'node:fs'
import { deflateSync, inflateSync } from 'node:zlib'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

export const ORIGEM = 'src/assets/LogoDark.png'
export const DESTINO = 'src/assets/LogoGlyph.png'

const PNG_ASSINATURA = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

const tabelaCrc = (() => {
  const t = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()

const crc32 = (buf) => {
  let c = 0xffffffff
  for (const byte of buf) c = tabelaCrc[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(tipo, dados) {
  const cabecalho = Buffer.alloc(8)
  cabecalho.writeUInt32BE(dados.length, 0)
  cabecalho.write(tipo, 4, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([Buffer.from(tipo, 'ascii'), dados])), 0)
  return Buffer.concat([cabecalho, dados, crc])
}

/** Decodifica PNG RGBA de 8 bits sem entrelace — o formato dos assets do
 * projeto. Qualquer outro combinado explode aqui em vez de sair torto. */
function lerPng(buffer) {
  if (!buffer.subarray(0, 8).equals(PNG_ASSINATURA)) throw new Error('não é PNG')

  let pos = 8
  let ihdr = null
  const idat = []

  while (pos < buffer.length) {
    const tamanho = buffer.readUInt32BE(pos)
    const tipo = buffer.toString('ascii', pos + 4, pos + 8)
    const dados = buffer.subarray(pos + 8, pos + 8 + tamanho)
    pos += 12 + tamanho

    if (tipo === 'IHDR') {
      ihdr = {
        largura: dados.readUInt32BE(0),
        altura: dados.readUInt32BE(4),
        profundidade: dados[8],
        tipoCor: dados[9],
        entrelace: dados[12],
      }
    } else if (tipo === 'IDAT') idat.push(dados)
    else if (tipo === 'IEND') break
  }

  if (!ihdr || ihdr.profundidade !== 8 || ihdr.tipoCor !== 6 || ihdr.entrelace !== 0) {
    throw new Error(`PNG fora do combinado (8 bits, RGBA, sem entrelace): ${JSON.stringify(ihdr)}`)
  }

  const { largura, altura } = ihdr
  const bruto = inflateSync(Buffer.concat(idat))
  const linha = largura * 4
  const pixels = Buffer.alloc(altura * linha)

  // Desfaz os filtros por linha (PNG §9). `anterior` é a linha já reconstruída.
  for (let y = 0; y < altura; y++) {
    const filtro = bruto[y * (linha + 1)]
    const origem = bruto.subarray(y * (linha + 1) + 1, (y + 1) * (linha + 1))
    const destino = pixels.subarray(y * linha, (y + 1) * linha)
    const anterior = y > 0 ? pixels.subarray((y - 1) * linha, y * linha) : Buffer.alloc(linha)

    for (let i = 0; i < linha; i++) {
      const a = i >= 4 ? destino[i - 4] : 0
      const b = anterior[i]
      const c = i >= 4 ? anterior[i - 4] : 0
      let previsto = 0

      if (filtro === 1) previsto = a
      else if (filtro === 2) previsto = b
      else if (filtro === 3) previsto = (a + b) >> 1
      else if (filtro === 4) {
        const p = a + b - c
        const [pa, pb, pc] = [Math.abs(p - a), Math.abs(p - b), Math.abs(p - c)]
        previsto = pa <= pb && pa <= pc ? a : pb <= pc ? b : c
      } else if (filtro !== 0) throw new Error(`filtro PNG desconhecido: ${filtro}`)

      destino[i] = (origem[i] + previsto) & 0xff
    }
  }

  return { largura, altura, pixels }
}

function escreverPng({ largura, altura, pixels }) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(largura, 0)
  ihdr.writeUInt32BE(altura, 4)
  ihdr[8] = 8 // profundidade
  ihdr[9] = 6 // RGBA
  const linha = largura * 4
  const bruto = Buffer.alloc(altura * (linha + 1))

  for (let y = 0; y < altura; y++) {
    bruto[y * (linha + 1)] = 0 // filtro None — o recorte é pequeno
    pixels.copy(bruto, y * (linha + 1) + 1, y * linha, (y + 1) * linha)
  }

  return Buffer.concat([
    PNG_ASSINATURA,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(bruto, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/** Caixa dos pixels celestes visíveis. É o glifo: o wordmark abaixo dele é
 * branco/cinza, e o fundo é transparente. */
function caixaDoGlifo({ largura, altura, pixels }) {
  let [x0, y0, x1, y1] = [largura, altura, -1, -1]

  for (let y = 0; y < altura; y++) {
    for (let x = 0; x < largura; x++) {
      const i = (y * largura + x) * 4
      const [r, , b, a] = [pixels[i], pixels[i + 1], pixels[i + 2], pixels[i + 3]]
      if (a < 30 || b <= 140 || b <= r + 40) continue
      if (x < x0) x0 = x
      if (y < y0) y0 = y
      if (x > x1) x1 = x
      if (y > y1) y1 = y
    }
  }

  if (x1 < 0) throw new Error('nenhum pixel celeste encontrado no wordmark')
  return { x0, y0, largura: x1 - x0 + 1, altura: y1 - y0 + 1 }
}

export function gerarGlifo(pngOrigem) {
  const imagem = lerPng(pngOrigem)
  const caixa = caixaDoGlifo(imagem)
  const linha = caixa.largura * 4
  const recorte = Buffer.alloc(caixa.altura * linha)

  for (let y = 0; y < caixa.altura; y++) {
    const inicio = ((caixa.y0 + y) * imagem.largura + caixa.x0) * 4
    imagem.pixels.copy(recorte, y * linha, inicio, inicio + linha)
  }

  return escreverPng({ largura: caixa.largura, altura: caixa.altura, pixels: recorte })
}

const executadoDireto = process.argv[1] === fileURLToPath(import.meta.url)

if (executadoDireto) {
  const saida = gerarGlifo(readFileSync(resolve(root, ORIGEM)))
  writeFileSync(resolve(root, DESTINO), saida)
  console.log(`${DESTINO}: ${saida.length} bytes`)
}
