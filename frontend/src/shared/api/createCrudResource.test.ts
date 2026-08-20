import { describe, expect, it } from 'vitest'
import { createCrudResource } from './createCrudResource'

describe('createCrudResource keys', () => {
  it('keys.all é prefixo das duas listas, então invalidá-la alcança ambas', () => {
    // `invalidateQueries({ queryKey: keys.all })` casa por PREFIXO. Se a chave
    // de arquivados não começasse por `[resource]`, arquivar e restaurar
    // deixariam a outra visão obsoleta — e o defeito só apareceria na tela.
    const { keys } = createCrudResource<{ id: number }>('clients')

    expect(keys.all).toEqual(['clients'])
    expect(keys.lists().slice(0, keys.all.length)).toEqual([...keys.all])
    expect(keys.archived().slice(0, keys.all.length)).toEqual([...keys.all])
    expect(keys.archived()).not.toEqual(keys.lists())
  })
})
