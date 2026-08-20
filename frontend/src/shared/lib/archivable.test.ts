import { describe, expect, it } from 'vitest'
import { archivableSource, type ArchivedListSource, type ListSource } from './archivable'

interface Curso {
  id: number
  name: string
}

const ativa: ListSource<Curso> = {
  items: [{ id: 1, name: 'ativo' }],
  loading: false,
  error: null,
  refetch: () => Promise.resolve('ativa'),
}

function arquivada(mode: 'active' | 'archived'): ArchivedListSource<Curso> {
  return {
    mode,
    items: [{ id: 2, name: 'arquivado' }],
    loading: true,
    error: { detail: 'falhou', localDetail: true },
    refetch: () => Promise.resolve('arquivada'),
  }
}

describe('archivableSource', () => {
  it('devolve a fonte ATIVA inteira quando o modo e active', () => {
    // Inteira, e nao campo a campo: era o quarteto de ternarios sobre a mesma
    // condicao que as 6 paginas repetiam dentro das props (D-52).
    const fonte = archivableSource(ativa, arquivada('active'))

    expect(fonte.items).toEqual([{ id: 1, name: 'ativo' }])
    expect(fonte.loading).toBe(false)
    expect(fonte.error).toBeNull()
  })

  it('devolve a fonte ARQUIVADA inteira quando o modo e archived', () => {
    const fonte = archivableSource(ativa, arquivada('archived'))

    expect(fonte.items).toEqual([{ id: 2, name: 'arquivado' }])
    expect(fonte.loading).toBe(true)
    expect(fonte.error).toEqual({ detail: 'falhou', localDetail: true })
  })

  it('le o modo de DENTRO do lado arquivado, nao de um argumento solto', () => {
    // D5: assim e impossivel passar o modo de uma tabela e as fontes de outra.
    expect(archivableSource(ativa, arquivada('archived')).items[0].name).toBe('arquivado')
    expect(archivableSource(ativa, arquivada('active')).items[0].name).toBe('ativo')
  })

  it('PRESERVA a promise do refetch nos dois modos', async () => {
    // A guarda do D4: e a promise que mantem o Reintentar do AppErrorState em
    // `loading` enquanto o GET esta em voo (Q-14). Uma versao que chamasse
    // `void refetch()` compilaria e passaria por todos os testes acima.
    await expect(archivableSource(ativa, arquivada('active')).refetch()).resolves.toBe('ativa')
    await expect(archivableSource(ativa, arquivada('archived')).refetch()).resolves.toBe('arquivada')
  })
})
