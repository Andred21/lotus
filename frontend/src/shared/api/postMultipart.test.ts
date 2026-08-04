import { beforeEach, describe, expect, it, vi } from 'vitest'
import { postMultipart } from './postMultipart'
import { api } from './axios'

vi.mock('./axios', () => ({
  api: { post: vi.fn(() => Promise.resolve({ data: { ok: true } })) },
}))

const post = vi.mocked(api.post)

describe('postMultipart', () => {
  beforeEach(() => post.mockClear())

  it('envia FormData, nunca um objeto serializado', async () => {
    // A lição 6 em forma de teste: se o corpo deixar de ser FormData, o axios
    // serializa como JSON, cada File vira {} e o upload chega VAZIO com 201.
    await postMultipart('/api/turmas/1/documents', { type: 'lista', file: new File(['x'], 'a.pdf') })

    expect(post).toHaveBeenCalledTimes(1)
    expect(post.mock.calls[0][1]).toBeInstanceOf(FormData)
  })

  it('não passa config de request — nada pode fixar Content-Type', () => {
    // O boundary do multipart é derivado pelo axios. Um terceiro argumento
    // abriria a porta para `headers: { 'Content-Type': ... }`, que é o bug.
    void postMultipart('/api/x', { file: new File(['x'], 'a.pdf') })

    expect(post.mock.calls[0]).toHaveLength(2)
  })

  it('omite chave undefined em vez de mandar a string "undefined"', async () => {
    // `valid_until` opcional do documento de redator: mandar "undefined" para
    // uma coluna de data grava lixo.
    await postMultipart('/api/redatores/1/documents', {
      type: 'CV',
      file: new File(['x'], 'cv.pdf'),
      valid_until: undefined,
    })

    const body = post.mock.calls[0][1] as FormData
    expect(body.has('valid_until')).toBe(false)
    expect(body.get('type')).toBe('CV')
  })

  it('devolve o corpo da resposta, não o envelope do axios', async () => {
    const result = await postMultipart<{ ok: boolean }>('/api/x', { file: new File(['x'], 'a.pdf') })

    expect(result).toEqual({ ok: true })
  })
})
