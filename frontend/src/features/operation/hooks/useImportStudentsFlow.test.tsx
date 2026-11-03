import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { createWrapper } from '@shared/testing/providers'
import { api } from '@shared/api/axios'
import type { ImportPreviewData, ImportPreviewRowData, ImportResultData } from '@shared/types/generated'
import { enrollmentKeys } from '../api/useEnrollments'
import { useImportStudentsFlow } from './useImportStudentsFlow'

const download = vi.fn()

vi.mock('@shared/hooks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@shared/hooks')>()),
  useBlobDownload: () => download,
}))

vi.mock('@shared/api/axios', () => ({
  api: { post: vi.fn(), get: vi.fn() },
}))

const post = vi.mocked(api.post)
const get = vi.mocked(api.get)

function previewRow(over: Partial<ImportPreviewRowData>): ImportPreviewRowData {
  return {
    row: 2,
    rut: '11.111.111-1',
    name: 'Ana Pérez',
    email: 'ana@x.cl',
    phone: '+56 9 1111 1111',
    status: 'new',
    message: null,
    update_refusal: null,
    current_client: null,
    archived: false,
    divergent: [],
    registered_name: null,
    registered_email: null,
    registered_phone: null,
    ...over,
  }
}

const ROWS: ImportPreviewRowData[] = [
  previewRow({ row: 2, status: 'new' }),
  previewRow({ row: 3, rut: '22.222.222-2', name: 'Beto', status: 'registered', registered_name: 'Beto R.' }),
  previewRow({ row: 4, rut: '33.333.333-3', name: 'Caro', status: 'already_enrolled' }),
  previewRow({ row: 5, rut: 'xx', name: 'Dani', status: 'error', message: 'RUT inválido' }),
]

function result(over: Partial<ImportResultData> = {}): ImportResultData {
  return {
    created: 1,
    relinked: 0,
    already_enrolled: 0,
    moved: [],
    errors: [],
    enrolled_total: 1,
    contracted_count: 10,
    ...over,
  }
}

const file = new File(['x'], 'alunos.xlsx')

function mockPreview(rows: ImportPreviewRowData[], can = true) {
  const data: ImportPreviewData = { rows, can_update_registration: can }
  post.mockResolvedValueOnce({ data })
}

async function loaded(rows: ImportPreviewRowData[] = ROWS, can = true) {
  mockPreview(rows, can)
  const { wrapper, client } = createWrapper()
  const hook = renderHook(() => useImportStudentsFlow(7), { wrapper })
  act(() => hook.result.current.upload([file]))
  await waitFor(() => expect(hook.result.current.step).toBe('triage'))
  return { ...hook, client }
}

describe('useImportStudentsFlow', () => {
  beforeEach(() => {
    post.mockReset()
    get.mockReset()
    download.mockReset()
  })

  it('upload leva a triage com as contagens', async () => {
    const { result: r } = await loaded()

    const body = post.mock.calls[0][1] as FormData
    expect(post.mock.calls[0][0]).toBe('/api/turmas/7/alunos/importar/previa')
    expect(body.get('file')).toBe(file)
    expect(r.current.rows.map((x) => x.row)).toEqual([2, 3, 4, 5])
    expect(r.current.counts).toEqual({ new: 1, registered: 1, moves: 0, already_enrolled: 1, error: 1 })
    expect(r.current.sendableCount).toBe(2)
    expect(r.current.canUpdateRegistration).toBe(true)
  })

  it('planilha vazia fica em triage com rows vazio e sendableCount 0', async () => {
    const { result: r } = await loaded([])

    expect(r.current.step).toBe('triage')
    expect(r.current.rows).toEqual([])
    expect(r.current.sendableCount).toBe(0)
  })

  it('editar linha registrada trava rut e liga update_registration', async () => {
    const { result: r } = await loaded()

    act(() => r.current.edit(3, { rut: '99.999.999-9', name: 'Beto Reyes', email: 'b@x.cl', phone: null }))

    const row = r.current.rows.find((x) => x.row === 3)!
    expect(row).toMatchObject({
      rut: '22.222.222-2',
      name: 'Beto Reyes',
      email: 'b@x.cl',
      phone: null,
      edited: true,
      update_registration: true,
    })
  })

  it('desligar update em linha editada restaura valores da prévia', async () => {
    const { result: r } = await loaded()
    const original = r.current.rows.find((x) => x.row === 3)!

    act(() => r.current.edit(3, { rut: original.rut, name: 'Outro', email: 'o@x.cl', phone: '1' }))
    act(() => r.current.setUpdate(3, false))

    expect(r.current.rows.find((x) => x.row === 3)).toMatchObject({
      name: original.name,
      email: original.email,
      phone: original.phone,
      edited: false,
      update_registration: false,
    })
  })

  it('linha error só é enviada depois de editada; already_enrolled nunca', async () => {
    const { result: r } = await loaded()
    expect(r.current.sendableCount).toBe(2)

    act(() => r.current.edit(5, { rut: '44.444.444-4', name: 'Dani', email: 'd@x.cl', phone: null }))
    expect(r.current.sendableCount).toBe(3)

    act(() => r.current.edit(4, { rut: '33.333.333-3', name: 'Caro 2', email: null, phone: null }))
    expect(r.current.sendableCount).toBe(3)

    act(() => r.current.remove(2))
    expect(r.current.sendableCount).toBe(2)
    expect(r.current.rows.map((x) => x.row)).toEqual([3, 4, 5])
  })

  it('confirm envia só os campos permitidos', async () => {
    const { result: r, client } = await loaded()
    const invalidate = vi.spyOn(client, 'invalidateQueries')
    act(() => r.current.edit(3, { rut: '22.222.222-2', name: 'Beto Reyes', email: 'b@x.cl', phone: null }))
    post.mockResolvedValueOnce({ data: result() })

    act(() => r.current.confirm())
    await waitFor(() => expect(r.current.step).toBe('result'))

    expect(post.mock.calls[1][0]).toBe('/api/turmas/7/alunos/importar')
    expect(post.mock.calls[1][1]).toEqual({
      rows: [
        { row: 2, rut: '11.111.111-1', name: 'Ana Pérez', email: 'ana@x.cl', phone: '+56 9 1111 1111', update_registration: false },
        { row: 3, rut: '22.222.222-2', name: 'Beto Reyes', email: 'b@x.cl', phone: null, update_registration: true },
      ],
    })
    expect(r.current.result?.created).toBe(1)
    expect(invalidate).toHaveBeenCalledWith({ queryKey: enrollmentKeys.list(7) })
  })

  it('recusada de linha cadastrada mantém status, flag e RUT travado; só segue depois de editada', async () => {
    const { result: r } = await loaded()
    act(() => r.current.edit(3, { rut: '22.222.222-2', name: 'Beto Reyes', email: 'b@x.cl', phone: null }))
    post.mockResolvedValueOnce({
      data: result({ errors: [{ row: 3, message: 'Sin permiso para actualizar' }] }),
    })

    act(() => r.current.confirm())
    await waitFor(() => expect(r.current.step).toBe('result'))

    expect(r.current.rows).toHaveLength(1)
    expect(r.current.rows[0]).toMatchObject({
      row: 3,
      status: 'registered',
      message: 'Sin permiso para actualizar',
      refused: true,
      edited: false,
      update_registration: true,
    })
    // a recusada conta como error até ser corrigida
    expect(r.current.counts).toEqual({ new: 0, registered: 0, moves: 0, already_enrolled: 0, error: 1 })

    // volta à triagem e reenvia só essa, depois de corrigida
    act(() => r.current.reviewRefused())
    expect(r.current.step).toBe('triage')
    expect(r.current.sendableCount).toBe(0)
    act(() => r.current.edit(3, { rut: '99.999.999-9', name: 'Beto', email: 'b@x.cl', phone: null }))
    expect(r.current.rows[0]).toMatchObject({ rut: '22.222.222-2', edited: true, update_registration: true })
    expect(r.current.sendableCount).toBe(1)
    expect(r.current.counts.registered).toBe(1)
    post.mockResolvedValueOnce({ data: result() })
    act(() => r.current.confirm())
    await waitFor(() => expect(post).toHaveBeenCalledTimes(3))
    expect((post.mock.calls[2][1] as { rows: unknown[] }).rows).toEqual([
      { row: 3, rut: '22.222.222-2', name: 'Beto', email: 'b@x.cl', phone: null, update_registration: true },
    ])
  })

  it('recusada de linha cadastrada com Mantener segue com a flag desligada', async () => {
    const { result: r } = await loaded([previewRow({ row: 3, status: 'moves', current_client: 'Enel' })])
    post.mockResolvedValueOnce({ data: result({ errors: [{ row: 3, message: 'Sin permiso' }] }) })

    act(() => r.current.confirm())
    await waitFor(() => expect(r.current.step).toBe('result'))

    expect(r.current.rows[0]).toMatchObject({
      status: 'moves', current_client: 'Enel', refused: true, update_registration: false,
    })
  })

  it('recusada de linha nova vira error e só segue depois de editada', async () => {
    const { result: r } = await loaded()
    post.mockResolvedValueOnce({ data: result({ errors: [{ row: 2, message: 'RUT duplicado' }] }) })

    act(() => r.current.confirm())
    await waitFor(() => expect(r.current.step).toBe('result'))

    expect(r.current.rows[0]).toMatchObject({
      row: 2, status: 'error', message: 'RUT duplicado', edited: false, update_registration: false,
    })
    act(() => r.current.reviewRefused())
    expect(r.current.sendableCount).toBe(0)
    act(() => r.current.edit(2, { rut: '55.555.555-5', name: 'Ana', email: null, phone: null }))
    expect(r.current.sendableCount).toBe(1)
  })

  describe('422 da confirmação', () => {
    const problem = (errors: Record<string, string[]>) => ({
      type: 'x', title: 'Unprocessable', status: 422, detail: 'Errores de validación', instance: '', errors,
    })

    it('import.<row>.update deixa a linha em triage, bloqueia o Actualizar e libera com Mantener', async () => {
      const { result: r } = await loaded()
      act(() => r.current.setUpdate(3, true))
      post.mockRejectedValueOnce(problem({ 'import.3.update': ['Sin permiso para actualizar'] }))

      act(() => r.current.confirm())
      await waitFor(() => expect(r.current.nothingImported).toBe(true))

      expect(r.current.step).toBe('triage')
      expect(r.current.result).toBeNull()
      expect(r.current.rows.map((x) => x.row)).toEqual([2, 3, 4, 5])
      expect(r.current.rows.find((x) => x.row === 3)).toMatchObject({
        update_blocked: 'Sin permiso para actualizar', update_registration: true, refused: false, edited: false,
      })
      expect(r.current.sendableCount).toBe(1)
      expect(r.current.message).toBeNull()

      act(() => r.current.setUpdate(3, false))
      expect(r.current.sendableCount).toBe(2)
    })

    it('import.<row> marca a linha nova como erro e a cadastrada como recusada, sem ir ao resultado', async () => {
      const { result: r } = await loaded()
      post.mockRejectedValueOnce(problem({ 'import.2': ['RUT duplicado'], 'import.3': ['Sin permiso'] }))

      act(() => r.current.confirm())
      await waitFor(() => expect(r.current.nothingImported).toBe(true))

      expect(r.current.step).toBe('triage')
      expect(r.current.rows.find((x) => x.row === 2)).toMatchObject({ status: 'error', message: 'RUT duplicado' })
      expect(r.current.rows.find((x) => x.row === 3)).toMatchObject({
        status: 'registered', refused: true, message: 'Sin permiso',
      })
      expect(r.current.sendableCount).toBe(0)
    })

    it('422 sem chave import.* segue o caminho genérico', async () => {
      const { result: r } = await loaded()
      post.mockRejectedValueOnce(problem({ 'rows.0.email': ['Correo inválido'] }))

      act(() => r.current.confirm())
      await waitFor(() => expect(r.current.message).toBe('Correo inválido'))

      expect(r.current.nothingImported).toBe(false)
      expect(r.current.step).toBe('triage')
    })
  })

  describe('update_refusal da prévia', () => {
    const blocked = previewRow({
      row: 3, status: 'registered', divergent: ['name'], registered_name: 'Beto R.', update_refusal: 'Aluno de otra empresa',
    })

    it('linha com Actualizar e update_blocked não é enviável', async () => {
      const { result: r } = await loaded([blocked])
      expect(r.current.sendableCount).toBe(1)

      act(() => r.current.setUpdate(3, true))
      expect(r.current.sendableCount).toBe(0)
      expect(r.current.rows[0].update_blocked).toBe('Aluno de otra empresa')
    })

    it('editar limpa o update_blocked e Mantener restaura o de origem', async () => {
      const { result: r } = await loaded([blocked])

      act(() => r.current.edit(3, { rut: blocked.rut, name: 'Novo', email: null, phone: null }))
      expect(r.current.rows[0].update_blocked).toBeNull()
      expect(r.current.sendableCount).toBe(1)

      act(() => r.current.setUpdate(3, false))
      expect(r.current.rows[0]).toMatchObject({ update_blocked: 'Aluno de otra empresa', name: blocked.name, edited: false })
    })
  })

  it('close no meio da triagem descarta sem chamar a API e volta a upload', async () => {
    const { result: r } = await loaded()
    post.mockClear()

    act(() => r.current.close())

    expect(post).not.toHaveBeenCalled()
    expect(r.current.step).toBe('upload')
    expect(r.current.rows).toEqual([])
    expect(r.current.result).toBeNull()
  })

  it('downloadTemplate salva o blob como plantilla-alumnos.xlsx', async () => {
    const blob = new Blob(['x'])
    get.mockResolvedValueOnce({ data: blob })
    const { wrapper } = createWrapper()
    const { result: r } = renderHook(() => useImportStudentsFlow(7), { wrapper })

    act(() => r.current.downloadTemplate())

    await waitFor(() => expect(download).toHaveBeenCalledWith(blob, 'plantilla-alumnos.xlsx'))
    expect(get).toHaveBeenCalledWith('/api/turmas/7/alunos/importar/plantilla', { responseType: 'blob' })
  })

  it('close em voo é inerte', async () => {
    const { result: r } = await loaded()
    let release!: (v: unknown) => void
    post.mockReturnValueOnce(new Promise((res) => { release = res }) as never)

    act(() => r.current.confirm())
    await waitFor(() => expect(r.current.pending).toBe(true))
    act(() => r.current.close())
    expect(r.current.step).toBe('triage')

    await act(async () => release({ data: result() }))
    await waitFor(() => expect(r.current.step).toBe('result'))
  })
})
