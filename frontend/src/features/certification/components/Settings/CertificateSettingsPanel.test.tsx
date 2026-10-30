import { useEffect } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@shared/testing/providers'
import { api } from '@shared/api/axios'
import type { CertificateSettingsData } from '@shared/types/generated'
import { CertificateSettingsPanel } from './CertificateSettingsPanel'

vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return { ...(await importOriginal<typeof import('react-i18next')>()), useTranslation: mockUseTranslation() }
})

const limpo = new File(['png'], 'firma.png', { type: 'image/png' })
const espia = vi.hoisted(() => ({ montagens: 0, toast: { success: vi.fn(), error: vi.fn() } }))

// O seletor real limpa pixels em canvas (sem jsdom): aqui só entrega o PNG ao confirmar.
vi.mock('@shared/ui', async (importOriginal) => {
  const real = await importOriginal<typeof import('@shared/ui')>()
  return {
    ...real,
    useToast: () => espia.toast,
    AppSignatureUpload: ({ onConfirm, label }: { onConfirm: (f: File) => void; label: string }) => {
      useEffect(() => { espia.montagens += 1 }, [])
      return <button type="button" onClick={() => onConfirm(limpo)}>{label}</button>
    },
  }
})

const semFirma: CertificateSettingsData = {
  manager_name: 'Marcia de Batalha',
  manager_title: 'Gerente OTEC',
  signature: null,
}

const comFirma: CertificateSettingsData = { ...semFirma, signature: { original_name: 'gerente.png', size: 2048, created_at: '2026-10-01T10:00:00Z', download_url: 'https://x/gerente.png' } }

function montar(settings: CertificateSettingsData) {
  vi.spyOn(api, 'get').mockResolvedValue({ data: settings })
  return renderWithProviders(<CertificateSettingsPanel />, { route: '/' })
}
beforeEach(() => {
  vi.restoreAllMocks()
  espia.montagens = 0
  espia.toast.success.mockClear()
})

describe('CertificateSettingsPanel', () => {
  it('carrega nome e cargo, salva por PUT e mostra a ajuda de todos os certificados', async () => {
    const put = vi.spyOn(api, 'put').mockResolvedValue({ data: { ...semFirma, manager_title: 'Gerenta' } })
    montar(semFirma)

    const nome = await screen.findByDisplayValue('Marcia de Batalha')
    expect(screen.getByDisplayValue('Gerente OTEC')).toBeTruthy()
    // A ajuda vale para os emitidos também (D5); o texto do protótipo dizia o contrário.
    expect(screen.getByText('certificateSettings.help')).toBeTruthy()

    fireEvent.change(nome, { target: { value: 'Nueva Gerente' } })
    fireEvent.click(screen.getByRole('button', { name: 'certificateSettings.save' }))

    await waitFor(() =>
      expect(put).toHaveBeenCalledWith('/api/certificate-settings', {
        manager_name: 'Nueva Gerente',
        manager_title: 'Gerente OTEC',
      }),
    )
  })

  it('trocar a firma sobe o PNG confirmado pelo multipart', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: comFirma })
    montar(semFirma)

    fireEvent.click(await screen.findByRole('button', { name: 'certificateSettings.sendSignature' }))

    await waitFor(() => expect(post).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(espia.toast.success).toHaveBeenCalledWith('certificateSettings.signatureSaved'))
    const [url, body] = post.mock.calls[0]
    expect(url).toBe('/api/certificate-settings/signature')
    expect(body).toBeInstanceOf(FormData)
    expect((body as FormData).get('file')).toBeInstanceOf(File)
  })

  it('remover a firma pede confirmação antes de chamar o DELETE', async () => {
    const del = vi.spyOn(api, 'delete').mockResolvedValue({ data: semFirma })
    montar(comFirma)

    fireEvent.click(await screen.findByRole('button', { name: 'certificateSettings.removeSignature' }))
    expect(del).not.toHaveBeenCalled()
    fireEvent.click(await screen.findByRole('button', { name: 'certificateSettings.removeConfirm' }))
    await waitFor(() => expect(del).toHaveBeenCalledWith('/api/certificate-settings/signature'))
    await waitFor(() => expect(espia.toast.success).toHaveBeenCalledWith('certificateSettings.signatureRemoved'))
  })

  it('cancelar a confirmação não remove a firma', async () => {
    const del = vi.spyOn(api, 'delete').mockResolvedValue({ data: semFirma })
    montar(comFirma)

    fireEvent.click(await screen.findByRole('button', { name: 'certificateSettings.removeSignature' }))
    fireEvent.click(await screen.findByRole('button', { name: 'common.cancel' }))

    expect(del).not.toHaveBeenCalled()
  })

  it('com firma vigente mostra a imagem dela com o download_url, e a linha de ajuda da firma', async () => {
    montar(comFirma)

    const img = await screen.findByRole('img', { name: 'gerente.png' })
    expect(img.getAttribute('src')).toBe('https://x/gerente.png')
    expect(screen.getByText('certificateSettings.signatureHelp')).toBeTruthy()
  })

  it('sem firma não mostra imagem', async () => {
    montar(semFirma)

    await screen.findByText('certificateSettings.noSignature')
    expect(screen.queryByRole('img')).toBeNull()
  })

  it('a falha do upload mantém o seletor montado e mostra o erro; o sucesso o remonta', async () => {
    const recusa = { status: 422, detail: 'x', errors: { file: ['La firma es muy angosta.'] } }
    const post = vi.spyOn(api, 'post').mockRejectedValueOnce(recusa).mockResolvedValueOnce({ data: comFirma })
    montar(semFirma)

    fireEvent.click(await screen.findByRole('button', { name: 'certificateSettings.sendSignature' }))

    expect((await screen.findByRole('alert')).textContent).toContain('La firma es muy angosta.')
    expect(espia.montagens).toBe(1)
    expect(espia.toast.success).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'certificateSettings.sendSignature' }))

    await waitFor(() => expect(espia.montagens).toBe(2))
    expect(post).toHaveBeenCalledTimes(2)
  })

  it('refetch falho com dado em cache avisa ao lado e mantém o form e o que foi digitado', async () => {
    const { client } = montar(semFirma)
    const nome = await screen.findByDisplayValue('Marcia de Batalha')
    fireEvent.change(nome, { target: { value: 'Nueva Gerente' } })

    vi.spyOn(api, 'get').mockRejectedValue({ status: 500, detail: 'Falla de red' })
    await client.refetchQueries({ queryKey: ['certificate-settings'] })

    expect((await screen.findByRole('alert')).textContent).toContain('common.loadErrorHint')
    expect(screen.getByDisplayValue('Nueva Gerente')).toBeTruthy()
  })
})
