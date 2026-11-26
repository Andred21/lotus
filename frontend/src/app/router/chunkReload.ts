import type { ComponentType } from 'react'
import type { RouteObject } from 'react-router-dom'

/** Marca de "já recarreguei uma vez por falha de chunk" (vive na aba). */
const CHUNK_RELOAD_KEY = 'lotus:chunk-reload'

// `sessionStorage` pode lançar (modo privado, dados de site bloqueados). Sem ele a
// marca não existe: a página recarrega no máximo uma vez por montagem do erro,
// e nunca fica em laço, porque o recarregamento zera o estado do React.
export function readChunkMark(): boolean {
  try {
    return window.sessionStorage.getItem(CHUNK_RELOAD_KEY) !== null
  } catch {
    return false
  }
}

export function writeChunkMark() {
  try {
    window.sessionStorage.setItem(CHUNK_RELOAD_KEY, '1')
  } catch {
    // sem storage, sem marca
  }
}

function clearChunkMark() {
  try {
    window.sessionStorage.removeItem(CHUNK_RELOAD_KEY)
  } catch {
    // sem storage, sem marca
  }
}

// Mensagens que cada navegador dá a um `import()` que não achou o arquivo: Chromium,
// Safari e Firefox, mais o `ChunkLoadError` de bundlers que o nomeiam.
const CHUNK_ERROR =
  /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|ChunkLoadError/i

export function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  return error.name === 'ChunkLoadError' || CHUNK_ERROR.test(error.message)
}

/**
 * `lazy` de uma rota de página. Carregar com sucesso apaga a marca de recarga:
 * um deploy futuro, na mesma aba, tem direito à sua própria recarga.
 */
export function lazyPage(load: () => Promise<ComponentType>): NonNullable<RouteObject['lazy']> {
  return async () => {
    const Component = await load()
    clearChunkMark()
    return { Component }
  }
}
