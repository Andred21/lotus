import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react'
import { setViewportWidth } from '@shared/testing/viewport'
import { ArchiveRowActions } from '../ArchiveRowActions'
import { RowActions, type RowAction } from './RowActions'
import { useCollapsibleActionsColumn } from './useCollapsibleActionsColumn'

// `t` devolve a chave: o que estes casos medem é QUAL controle existe.
vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation(),
  }
})

/** O popup do Prime abre sob `CSSTransition`, e no jsdom o nó fica
 * `display: none` além do fim do teste: `getByRole` filtra por acessibilidade e
 * não acha os `<li role="menuitem">` que ESTÃO no DOM. Query direta, como o
 * `LanguageMenu.test.tsx` vizinho. */
const itensDoMenu = () => Array.from(document.querySelectorAll<HTMLElement>('li[role="menuitem"]'))
const itemDoMenu = (label: string) => itensDoMenu().find((item) => item.getAttribute('aria-label') === label)

const acao = (label: string, over: Partial<RowAction> = {}): RowAction => ({
  label,
  icon: 'pi pi-eye',
  onClick: vi.fn(),
  ...over,
})

describe('RowActions', () => {
  it('fora do colapso, cada ação é um botão de ícone nomeado pelo rótulo', () => {
    render(<RowActions collapsed={false} actions={[acao('Reenviar'), acao('Archivar'), acao('Ver')]} />)

    expect(screen.getAllByRole('button')).toHaveLength(3)
    expect(screen.getByRole('button', { name: 'Reenviar' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'common.moreActions' })).toBeNull()
  })

  it('colapsada com duas ou mais, a linha vira UM botão que abre o menu com as mesmas ações', () => {
    const arquivar = acao('Archivar')
    render(<RowActions collapsed actions={[acao('Reenviar'), arquivar, acao('Ver')]} />)

    const gatilho = screen.getByRole('button', { name: 'common.moreActions' })
    expect(screen.getAllByRole('button')).toEqual([gatilho])
    expect(gatilho.getAttribute('aria-haspopup')).toBe('true')

    expect(itensDoMenu()).toHaveLength(0)
    fireEvent.click(gatilho)
    expect(itensDoMenu().map((item) => item.getAttribute('aria-label'))).toEqual(['Reenviar', 'Archivar', 'Ver'])

    fireEvent.click(itemDoMenu('Archivar')!.querySelector('.p-menuitem-content')!)
    expect(arquivar.onClick).toHaveBeenCalledOnce()
  })

  it('o disabled da ação (busy, mutation em voo) chega ao item do menu', () => {
    render(<RowActions collapsed actions={[acao('Archivar', { disabled: true }), acao('Ver')]} />)

    fireEvent.click(screen.getByRole('button', { name: 'common.moreActions' }))
    expect(itemDoMenu('Archivar')?.getAttribute('data-p-disabled')).toBe('true')
    expect(itemDoMenu('Ver')?.getAttribute('data-p-disabled')).toBe('false')
  })

  it('colapsada com UMA ação, menu seria um clique a mais: fica o próprio botão', () => {
    render(<RowActions collapsed actions={[acao('Ver')]} />)

    expect(screen.getByRole('button', { name: 'Ver' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'common.moreActions' })).toBeNull()
  })

  it('ação destrutiva tinge o botão solto, e o describedBy aponta o motivo do disabled', () => {
    render(
      <RowActions
        collapsed={false}
        actions={[acao('Quitar', { severity: 'danger', disabled: true, describedBy: 'motivo' })]}
      />,
    )

    const botao = screen.getByRole('button', { name: 'Quitar' })
    expect(botao.className).toContain('p-button-danger')
    expect(botao.getAttribute('aria-describedby')).toBe('motivo')
  })

  it('os botões soltos ficam centralizados na coluna', () => {
    const { container } = render(<RowActions collapsed={false} actions={[acao('Ver'), acao('Archivar')]} />)

    const conteiner = container.firstElementChild!
    expect(conteiner.className).toContain('justify-center')
    expect(conteiner.className).not.toContain('justify-end')
  })

  it('o gatilho colapsado também fica centralizado na coluna', () => {
    const { container } = render(<RowActions collapsed actions={[acao('Ver'), acao('Archivar')]} />)

    const conteiner = container.firstElementChild!
    expect(conteiner.className).toContain('justify-center')
    expect(conteiner.className).not.toContain('justify-end')
  })

  it('todo botão mostra o rótulo como dica, sem precisar pedir', async () => {
    render(<RowActions collapsed={false} actions={[acao('Ver')]} />)

    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Ver' }))

    const dica = await waitFor(() => {
      const el = document.querySelector<HTMLElement>('.p-tooltip')
      expect(el).not.toBeNull()
      return el!
    })
    expect(dica.textContent).toBe('Ver')
    expect(dica.className).toContain('p-tooltip-left')
  })

  it('a dica abre à ESQUERDA do ícone: à direita ela passa da borda da tabela e cria rolagem na página', async () => {
    render(<RowActions collapsed={false} actions={[acao('Revocar')]} />)

    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Revocar' }))

    const dica = await waitFor(() => {
      const el = document.querySelector<HTMLElement>('.p-tooltip')
      expect(el).not.toBeNull()
      return el!
    })
    expect(dica.textContent).toBe('Revocar')
    expect(dica.className).toContain('p-tooltip-left')
  })

  it('o botão desabilitado também mostra a dica, à esquerda, pelo invólucro: o Prime não a abre em botão disabled', async () => {
    render(<RowActions collapsed={false} actions={[acao('Emitir', { disabled: true })]} />)

    const botao = screen.getByRole('button', { name: 'Emitir' })
    expect(botao.hasAttribute('disabled')).toBe(true)
    fireEvent.mouseEnter(botao.parentElement!)

    const dica = await waitFor(() => {
      const el = document.querySelector<HTMLElement>('.p-tooltip')
      expect(el).not.toBeNull()
      return el!
    })
    expect(dica.textContent).toBe('Emitir')
    expect(dica.className).toContain('p-tooltip-left')
  })
})

describe('ArchiveRowActions colapsada', () => {
  it('as ações próprias (extra) entram no mesmo menu, entre ver e arquivar', () => {
    render(
      <ArchiveRowActions
        collapsed
        archived={false}
        busy={false}
        canRestore
        canArchive
        onRestore={() => {}}
        onArchive={() => {}}
        onView={() => {}}
        extra={[acao('redator.resendInvitation', { icon: 'pi pi-envelope' })]}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'common.moreActions' }))
    const itens = itensDoMenu().map((item) => item.getAttribute('aria-label'))
    expect(itens).toEqual(['common.view', 'redator.resendInvitation', 'archive.archiveAction'])
  })

  it('fora do colapso, as ações próprias vêm entre ver e arquivar, na mesma linha', () => {
    render(
      <ArchiveRowActions
        archived={false}
        busy={false}
        canRestore
        canArchive
        onRestore={() => {}}
        onArchive={() => {}}
        onView={() => {}}
        extra={[acao('redator.resendInvitation', { icon: 'pi pi-envelope' })]}
      />,
    )

    const nomes = screen.getAllByRole('button').map((botao) => botao.getAttribute('aria-label'))
    expect(nomes).toEqual(['common.view', 'redator.resendInvitation', 'archive.archiveAction'])
  })

  it('na visão de arquivados, restaurar perde o rótulo visível e fica só ícone, com nome acessível', () => {
    render(
      <ArchiveRowActions collapsed archived busy={false} canRestore onRestore={() => {}} />,
    )

    const restaurar = screen.getByRole('button', { name: 'archive.restoreAction' })
    expect(restaurar.textContent?.trim()).toBe('')
  })

  it('o restaurar só-ícone mostra a dica', async () => {
    render(<ArchiveRowActions collapsed archived busy={false} canRestore onRestore={() => {}} />)

    fireEvent.mouseEnter(screen.getByRole('button', { name: 'archive.restoreAction' }))

    const dica = await waitFor(() => {
      const el = document.querySelector<HTMLElement>('.p-tooltip')
      expect(el).not.toBeNull()
      return el!
    })
    expect(dica.textContent).toBe('archive.restoreAction')
    expect(dica.className).toContain('p-tooltip-left')
  })

  it('o restaurar fica centralizado na célula', () => {
    const { container } = render(<ArchiveRowActions archived busy={false} canRestore onRestore={() => {}} />)

    expect(container.firstElementChild!.className).toContain('justify-center')
  })

  it('fora do colapso, restaurar segue rotulado', () => {
    render(<ArchiveRowActions archived busy={false} canRestore onRestore={() => {}} />)

    expect(screen.getByRole('button', { name: 'archive.restoreAction' }).textContent).toContain(
      'archive.restoreAction',
    )
  })
})

describe('useCollapsibleActionsColumn', () => {
  it('no desktop, a coluna presa mantém a largura que a tabela declarou', () => {
    const { result } = renderHook(() => useCollapsibleActionsColumn('12rem'))

    expect(result.current).toEqual({ width: '12rem', collapsed: false })
  })

  it('no telefone (390px), colapsa e encolhe para um botão só', () => {
    setViewportWidth(390)
    const { result } = renderHook(() => useCollapsibleActionsColumn('12rem'))

    expect(result.current).toEqual({ width: '4.5rem', collapsed: true })
  })

  it('em 640px (o sm do Tailwind) ainda não colapsa', () => {
    setViewportWidth(640)
    const { result } = renderHook(() => useCollapsibleActionsColumn('9rem'))

    expect(result.current.collapsed).toBe(false)
  })
})
