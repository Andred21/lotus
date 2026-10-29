import { UnsupportedImageError } from './cleanSignature'
import type { Raster } from './cleanSignature'

/**
 * A ÚNICA ponte com o canvas: tudo o que `cleanSignature` não pode saber do
 * navegador (decodificar arquivo, ler pixel, codificar PNG) fica aqui. Sem teste
 * unitário de propósito — o jsdom não tem canvas, e o que importa aqui é o
 * navegador de verdade (ver o gate visual do bloco).
 */

async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
  try {
    // `from-image` aplica a rotação EXIF: foto de celular em pé não pode virar deitada.
    return await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    // Fallback para navegador sem `createImageBitmap` com opções.
  }
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    return img
  } finally {
    URL.revokeObjectURL(url)
  }
}

function context2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new UnsupportedImageError()
  return ctx
}

export async function fileToRaster(file: File): Promise<Raster> {
  let image: ImageBitmap | HTMLImageElement
  try {
    image = await decode(file)
  } catch {
    throw new UnsupportedImageError()
  }
  const width = 'naturalWidth' in image ? image.naturalWidth : image.width
  const height = 'naturalHeight' in image ? image.naturalHeight : image.height
  if (!width || !height) throw new UnsupportedImageError()

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = context2d(canvas)
  ctx.drawImage(image, 0, 0)
  if ('close' in image) image.close()
  const { data } = ctx.getImageData(0, 0, width, height)
  return { width, height, data }
}

export async function rasterToPngFile(raster: Raster, name: string): Promise<File> {
  const canvas = document.createElement('canvas')
  canvas.width = raster.width
  canvas.height = raster.height
  const ctx = context2d(canvas)
  // Cópia para ArrayBuffer próprio: `ImageData` não aceita buffer compartilhado.
  ctx.putImageData(new ImageData(new Uint8ClampedArray(raster.data), raster.width, raster.height), 0, 0)
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error('Não foi possível codificar o PNG.')
  return new File([blob], name, { type: 'image/png' })
}
