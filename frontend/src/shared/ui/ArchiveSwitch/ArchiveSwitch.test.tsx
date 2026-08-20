import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ArchiveSwitch } from './ArchiveSwitch'

// Sem `globals` no vitest, a limpeza do RTL não é automática — sem ela o
// segundo `render` acha os botões do primeiro.
afterEach(cleanup)

describe('ArchiveSwitch', () => {
  it('marca o modo corrente e avisa a troca', () => {
    const onChange = vi.fn()
    render(<ArchiveSwitch value="active" onChange={onChange} />)

    const arquivados = screen.getByRole('button', {
      name: /^(archive\.archived|Archivados|Arquivados|Archived)$/i,
    })
    fireEvent.click(arquivados)

    expect(onChange).toHaveBeenCalledWith('archived')
  })

  it('não avisa quando clicam no modo que já está ativo', () => {
    const onChange = vi.fn()
    render(<ArchiveSwitch value="active" onChange={onChange} />)

    const ativos = screen.getByRole('button', {
      name: /^(archive\.active|Activos|Ativos|Active)$/i,
    })
    fireEvent.click(ativos)

    expect(onChange).not.toHaveBeenCalled()
  })
})
