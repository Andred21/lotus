import type { ComponentType } from 'react'
import type { RouteObject } from 'react-router-dom'

/** Marca de "já recarreguei uma vez por falha de chunk" (vive na aba). */
const CHUNK_RELOAD_KEY = 'lotus:chunk-reload'

// `sessionStorage` pode lançar (modo privado, dados de site bloqueados). A marca é a
// ÚNICA coisa que impede o laço "recarrega, falha de novo, recarrega": o reload zera
// o estado do React, então sem como gravar e ler a marca não há como saber que já
// se recarregou. Storage indisponível, portanto, conta como "já recarreguei": o erro
// vai para a tela, e só o botão de tentar de novo (ação do usuário) recarrega.
function readChunkMark(): boolean {
  try {
    return window.sessionStorage.getItem(CHUNK_RELOAD_KEY) !== null
  } catch {
    return true
  }
}

/** `true` só se a marca ficou gravada; sem ela, quem chama NÃO pode recarregar. */
function writeChunkMark(): boolean {
  try {
    window.sessionStorage.setItem(CHUNK_RELOAD_KEY, '1')
    return true
  } catch {
    return false
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

function isChunkLoadError(error: unknown): error is Error {
  if (!(error instanceof Error)) return false
  return error.name === 'ChunkLoadError' || CHUNK_ERROR.test(error.message)
}

// A decisão fica presa ao objeto do erro: o React pode renderizar a mesma tela duas
// vezes (StrictMode), e a segunda leitura já veria a marca que a primeira gravou.
const decisions = new WeakMap<Error, boolean>()

/**
 * `true` se ESTE erro de chunk deve disparar a recarga única: é erro de chunk, ainda
 * não houve recarga e a marca ficou gravada. Qualquer outro caso (erro comum, marca já
 * lá, storage que não lê ou não grava) devolve `false`: o erro vai para a tela.
 */
export function claimChunkReload(error: unknown): boolean {
  if (!isChunkLoadError(error)) return false
  let decision = decisions.get(error)
  if (decision === undefined) {
    decision = !readChunkMark() && writeChunkMark()
    decisions.set(error, decision)
  }
  return decision
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
