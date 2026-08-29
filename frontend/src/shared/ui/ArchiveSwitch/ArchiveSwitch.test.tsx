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

  /**
   * f1 UI-01 (run de 2026-08-28): o lado selecionado era `AppButton` sem papel,
   * isto é, o `.p-button` preenchido do Lara — a MESMA tinta da CTA no escuro e
   * mais preenchido que ela no claro. Filtro não disputa com ação primária:
   * selecionado é contorno, não selecionado é texto, e o único de marca na
   * barra segue sendo a CTA.
   */
  it('o modo corrente é contornado e o outro é texto — nenhum preenchido', () => {
    render(<ArchiveSwitch value="active" onChange={() => {}} />)

    const ativos = screen.getByRole('button', { name: /^(archive\.active|Activos|Ativos|Active)$/i })
    const arquivados = screen.getByRole('button', { name: /^(archive\.archived|Archivados|Arquivados|Archived)$/i })
    expect(ativos.className).toContain('p-button-outlined')
    expect(ativos.className).not.toContain('p-button-text')
    expect(arquivados.className).toContain('p-button-text')
  })
})
