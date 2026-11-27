import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { ArchiveSwitch } from './ArchiveSwitch'

// Sem `globals` no vitest, a limpeza do RTL não é automática — sem ela o
// segundo `render` acha os botões do primeiro.

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
  it('switch selecionado é secondary outlined, e o outro é text plain', () => {
    render(<ArchiveSwitch value="archived" onChange={() => {}} />)

    const ativos = screen.getByRole('button', { name: /^(archive\.active|Activos|Ativos|Active)$/i })
    const arquivados = screen.getByRole('button', { name: /^(archive\.archived|Archivados|Arquivados|Archived)$/i })
    expect(arquivados.className).toContain('p-button-outlined')
    expect(arquivados.className).toContain('p-button-secondary')
    expect(ativos.className).toContain('p-button-text')
    expect(ativos.className).toContain('p-button-plain')
    expect(ativos.className).not.toContain('p-button-secondary')
  })

  /** O `plain` do tema pinta o rótulo em `--text-color-secondary`: no claro
   * #64748b mede 4,34:1 no hover (#f1f5f9) e 3,86:1 no active (#e2e8f0); no
   * escuro, branco a 60% mede 4,36:1 no active. O lado não selecionado crava
   * `--text-color` (≥ 6:1 nos dois temas, nos três estados). */
  it('o lado não selecionado crava --text-color: o plain do tema não chega a 4,5:1 no hover/active', () => {
    render(<ArchiveSwitch value="active" onChange={() => {}} />)

    const arquivados = screen.getByRole('button', { name: /^(archive\.archived|Archivados|Arquivados|Archived)$/i })
    expect(arquivados.className).toContain('text-[var(--text-color)]')
  })

  it('o modo corrente é contornado e o outro é texto — nenhum preenchido', () => {
    render(<ArchiveSwitch value="active" onChange={() => {}} />)

    const ativos = screen.getByRole('button', { name: /^(archive\.active|Activos|Ativos|Active)$/i })
    const arquivados = screen.getByRole('button', { name: /^(archive\.archived|Archivados|Arquivados|Archived)$/i })
    expect(ativos.className).toContain('p-button-outlined')
    expect(ativos.className).not.toContain('p-button-text')
    expect(arquivados.className).toContain('p-button-text')
  })
})
