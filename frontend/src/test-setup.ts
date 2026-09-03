import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

/**
 * O ÚNICO desmonte do repositório (P-69). Era escrito à mão em 62 dos 127
 * arquivos de teste e ausente nos outros 65 — quem escrevia teste novo copiava
 * o molde do vizinho, e o vizinho decidia se o componente vazava para o caso
 * seguinte.
 *
 * `tests/desmonte-global.test.ts` guarda o par: sem ele, apagar esta linha
 * deixaria a catraca `CLEANUP_A_MAO` do eslint de pé sobre nada.
 */
afterEach(cleanup)
