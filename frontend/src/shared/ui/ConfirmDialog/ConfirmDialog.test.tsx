import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ConfirmDialog } from './ConfirmDialog'
import { confirmSeverityStyle } from './style'
import { severityTone } from '../AppTag/tones'
import { AppIcon, type IconName } from '../AppIcon'

/** O desenho de um ícone do registro, para comparar com o que o wrapper montou. */
function desenho(name: IconName) {
  return render(<AppIcon name={name} />).container.querySelector('svg')?.innerHTML
}

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

  it('cancelLabel troca o texto do Cancelar', () => {
    render(<ConfirmDialog {...base} cancelLabel="Seguir editando" />)

    expect(screen.getByRole('button', { name: /Seguir editando/ })).toBeTruthy()
  })

  it('confirmIcon troca o ícone do botão', () => {
    render(<ConfirmDialog {...base} confirmLabel="Revocar" confirmIcon="block" severity="danger" />)

    expect(screen.getByRole('button', { name: /Revocar/ }).querySelector('svg')?.innerHTML).toBe(desenho('block'))
  })
})

/** Bloco 43, spec J3: a severidade se lê antes do texto — faixa no topo e
 * ícone no header —, e a confirmação não se confunde com a moldura navy de
 * formulário (J4). */
describe('ConfirmDialog — confirmação compacta', () => {
  it.each(['confirm', 'warning', 'danger'] as const)('%s marca a severidade e pinta o ícone do header', (severity) => {
    render(<ConfirmDialog {...base} severity={severity} />)

    expect(document.querySelector('[data-severity]')?.getAttribute('data-severity')).toBe(severity)
    const icone = document.querySelector('[data-severity-icon] svg')
    expect(icone?.innerHTML).toBe(desenho(confirmSeverityStyle[severity].icon))
  })

  /** Com o SVG no lugar do `.pi` (CSS sem camada que vencia o Tailwind), o
   * `grid` comum já centra o glifo no círculo: o `!` saiu. */
  it('o círculo centra o glifo com `grid`, sem `!`', () => {
    render(<ConfirmDialog {...base} severity="danger" />)

    const circulo = document.querySelector('[data-severity-icon]')
    expect(circulo?.classList.contains('grid')).toBe(true)
    expect(circulo?.classList.contains('grid!')).toBe(false)
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

/** Descrição acessível de um nó: o texto dos elementos que o `aria-describedby`
 * aponta (o que o leitor de tela anuncia depois do nome). */
function descricao(el: Element): string {
  return (el.getAttribute('aria-describedby') ?? '')
    .split(' ')
    .map((id) => document.getElementById(id)?.textContent ?? '')
    .join(' ')
    .trim()
}

describe('ConfirmDialog — motivo do confirmar desabilitado', () => {
  it('com confirmDisabled e motivo, o motivo aparece e é a descrição do botão', () => {
    render(<ConfirmDialog {...base} confirmLabel="Revocar" confirmDisabled confirmDisabledReason="Escribe el motivo" />)

    const botao = screen.getByRole('button', { name: /Revocar/ }) as HTMLButtonElement
    expect(botao.disabled).toBe(true)
    expect(screen.getByText('Escribe el motivo').className).not.toContain('sr-only')
    expect(descricao(botao)).toBe('Escribe el motivo')
  })

  it('habilitado, o motivo some e o botão não aponta para descrição', () => {
    render(<ConfirmDialog {...base} confirmLabel="Revocar" confirmDisabledReason="Escribe el motivo" />)

    const botao = screen.getByRole('button', { name: /Revocar/ })
    expect(screen.queryByText('Escribe el motivo')).toBeNull()
    expect(botao.getAttribute('aria-describedby')).toBeNull()
  })

  it('sem motivo, o botão desabilitado não aponta para descrição', () => {
    render(<ConfirmDialog {...base} confirmLabel="Revocar" confirmDisabled />)

    expect(screen.getByRole('button', { name: /Revocar/ }).getAttribute('aria-describedby')).toBeNull()
  })
})
