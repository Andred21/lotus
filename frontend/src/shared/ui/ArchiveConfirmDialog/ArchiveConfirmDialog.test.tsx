import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { ArchiveConfirmDialog } from './ArchiveConfirmDialog'

vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation({
      t: (key, opts) => (opts ? `${key}|${JSON.stringify(opts)}` : key),
    }),
  }
})

const base = {
  target: { id: 7 },
  name: 'Eléctrica Norte SpA',
  pending: false,
  onArchive: () => {},
  onCancel: () => {},
}

describe('ArchiveConfirmDialog', () => {
  it('confirmação de arquivar nomeia o registro, no título e no corpo', () => {
    render(<ArchiveConfirmDialog {...base} />)

    const dialog = screen.getByRole('dialog')
    expect(dialog.textContent).toContain('archive.confirmArchiveTitle|{"name":"Eléctrica Norte SpA"}')
    expect(dialog.textContent).toContain('archive.confirmArchiveBody|{"name":"Eléctrica Norte SpA"}')
  })

  /** Arquivar tem volta (Restaurar): `danger` é de quem destrói ou não tem volta. */
  it('arquivar tem volta, então a severidade é de aviso e não de perigo', () => {
    render(<ArchiveConfirmDialog {...base} />)

    expect(document.querySelector('[data-severity]')?.getAttribute('data-severity')).toBe('warning')
  })

  it('erro do gate aparece no diálogo, que fica aberto', () => {
    const onCancel = vi.fn()
    render(<ArchiveConfirmDialog {...base} onCancel={onCancel} error="Turma concluida no se puede archivar" />)

    expect(screen.getByRole('dialog').textContent).toContain('Turma concluida no se puede archivar')
    expect(onCancel).not.toHaveBeenCalled()
  })

  it('confirmar manda o id e só fecha no sucesso', () => {
    const onArchive = vi.fn()
    const onCancel = vi.fn()
    render(<ArchiveConfirmDialog {...base} onArchive={onArchive} onCancel={onCancel} />)

    fireEvent.click(screen.getByRole('button', { name: /archive.archiveAction/ }))

    expect(onArchive).toHaveBeenCalledWith(7, { onSuccess: onCancel })
    expect(onCancel).not.toHaveBeenCalled()
  })

  it('sem alvo não desenha nada', () => {
    render(<ArchiveConfirmDialog {...base} target={null} />)

    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
