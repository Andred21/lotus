import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ConfirmDialog } from './ConfirmDialog'
import { confirmSeverityStyle } from './style'
import { severityTone } from '../AppTag/tones'

const base = {
  visible: true,
  title: 'Confirmar',
  message: '¿Seguro?',
  onConfirm: () => {},
  onCancel: () => {},
}

/**
 * `CrudDialog` confirmava com a marca e `ConfirmDialog` com o `severity` cru do
 * Lara: dois diálogos do mesmo produto, dois botões de confirmar diferentes
 * (achado B3). Confirmar é a mesma ação nos dois; o que difere é a severidade.
 */
describe('ConfirmDialog — botão de confirmar', () => {
  it('sem severidade, confirma com a marca (igual ao CrudDialog)', () => {
    render(<ConfirmDialog {...base} confirmLabel="Aceptar" />)

    expect(screen.getByRole('button', { name: /Aceptar/ }).className)
      .toContain('border-[var(--brand-ink)]')
  })

  /** Ação destrutiva NÃO veste marca: o preenchido de severidade é o sinal, e
   * trocá-lo por marca apagaria a diferença entre confirmar e destruir. */
  it('com `severity="danger"`, mantém o preenchido de severidade', () => {
    render(<ConfirmDialog {...base} confirmLabel="Eliminar" severity="danger" />)

    const botao = screen.getByRole('button', { name: /Eliminar/ })
    expect(botao.className).toContain('p-button-danger')
    expect(botao.className).not.toContain('border-[var(--brand-ink)]')
  })

  it('com `severity="warning"`, veste o preenchido de aviso', () => {
    render(<ConfirmDialog {...base} confirmLabel="Mover" severity="warning" />)

    const botao = screen.getByRole('button', { name: /Mover/ })
    expect(botao.className).toContain('p-button-warning')
    expect(botao.className).not.toContain('border-[var(--brand-ink)]')
  })

  it('confirmDisabled desliga só o confirmar', () => {
    render(<ConfirmDialog {...base} confirmLabel="Revocar" confirmDisabled />)

    expect((screen.getByRole('button', { name: /Revocar/ }) as HTMLButtonElement).disabled).toBe(true)
    expect((document.querySelector('.p-dialog-footer .p-button-text') as HTMLButtonElement).disabled).toBe(false)
  })

  it('confirmIcon troca o ícone do botão', () => {
    render(<ConfirmDialog {...base} confirmLabel="Revocar" confirmIcon="pi pi-ban" severity="danger" />)

    expect(screen.getByRole('button', { name: /Revocar/ }).querySelector('.pi-ban')).toBeTruthy()
  })
})

/** Bloco 43, spec J3: a severidade se lê antes do texto — faixa no topo e
 * ícone no header —, e a confirmação não se confunde com a moldura navy de
 * formulário (J4). */
describe('ConfirmDialog — confirmação compacta', () => {
  it.each(['confirm', 'warning', 'danger'] as const)('%s marca a severidade e pinta o ícone do header', (severity) => {
    render(<ConfirmDialog {...base} severity={severity} />)

    expect(document.querySelector('[data-severity]')?.getAttribute('data-severity')).toBe(severity)
    const classeDoIcone = confirmSeverityStyle[severity].icon.split(' ')[1]
    expect(document.querySelector('[data-severity-icon]')?.className).toContain(classeDoIcone)
  })

  /** O `.pi` do primeicons é CSS sem camada e vence o `grid` do Tailwind; sem o
   * `!` o círculo vira bloco e o glifo cai no canto superior esquerdo. */
  it('o ícone força `grid!` para o glifo ficar centrado no círculo', () => {
    render(<ConfirmDialog {...base} severity="danger" />)

    expect(document.querySelector('[data-severity-icon]')?.classList.contains('grid!')).toBe(true)
  })

  it('não maximiza nem herda a moldura navy', () => {
    render(<ConfirmDialog {...base} />)

    expect(document.querySelector('.p-dialog-header-maximize')).toBeNull()
    const raiz = document.querySelector('.p-dialog')
    expect(raiz?.className).toContain('max-w-[28rem]')
    expect(raiz?.className).not.toContain('lotus-dialog')
  })

  it('com a requisição em voo, Cancelar trava e o X some', () => {
    render(<ConfirmDialog {...base} confirmLabel="Eliminar" severity="danger" pending />)

    expect((document.querySelector('.p-dialog-footer .p-button-text') as HTMLButtonElement).disabled).toBe(true)
    expect(document.querySelector('.p-dialog-header-close')).toBeNull()
  })

  it('o mapa de estilo lê os tons medidos do AppTag', () => {
    expect(confirmSeverityStyle.confirm).toMatchObject({ stripe: 'var(--green-500)', ...severityTone.success })
    expect(confirmSeverityStyle.warning).toMatchObject({ stripe: 'var(--yellow-500)', ...severityTone.warning })
    expect(confirmSeverityStyle.danger).toMatchObject({ stripe: 'var(--red-500)', ...severityTone.danger })
  })
})

describe('ConfirmDialog — children', () => {
  it('mostra o conteúdo extra no corpo, junto da mensagem', () => {
    render(
      <ConfirmDialog {...base}>
        <ul role="list"><li>Detalhe extra</li></ul>
      </ConfirmDialog>,
    )

    expect(screen.getByText('¿Seguro?')).toBeTruthy()
    expect(screen.getByText('Detalhe extra')).toBeTruthy()
  })
})
