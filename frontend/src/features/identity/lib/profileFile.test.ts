import { describe, expect, it } from 'vitest'
import type { RedatorProfileDocumentData } from '@shared/types/generated'
import { profileFile } from './profileFile'

const doc = (over: Partial<RedatorProfileDocumentData> = {}): RedatorProfileDocumentData => ({
  type: 'CV',
  status: 'vigente',
  self_service: true,
  valid_until: null,
  original_name: 'cv.pdf',
  size: 2048,
  created_at: '2026-10-01T10:00:00Z',
  download_url: 'https://minio.local/cv.pdf',
  ...over,
})

describe('profileFile', () => {
  it('slot preenchido vira o arquivo previsualizável, com a data de envio', () => {
    expect(profileFile(doc())).toEqual({
      original_name: 'cv.pdf',
      size: 2048,
      download_url: 'https://minio.local/cv.pdf',
      created_at: '2026-10-01T10:00:00Z',
    })
  })

  it('tamanho nulo vira ausente, como o PreviewableFile pede', () => {
    expect(profileFile(doc({ size: null }))?.size).toBeUndefined()
  })

  it.each([
    ['sem nome', { original_name: null }],
    ['sem URL', { download_url: null }],
  ])('slot ausente (%s) não vira arquivo', (_nome, over) => {
    expect(profileFile(doc(over))).toBeNull()
  })
})
