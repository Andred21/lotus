import { beforeAll, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useLocation, useNavigate } from 'react-router-dom'
import i18n from '@shared/config/i18n'
import { useCrudForm, type MutableResource } from '@shared/hooks/useCrudForm'
import { renderWithProviders } from '@shared/testing/providers'
import type { DialogMode } from '@shared/lib'
import { CrudDialog } from './CrudDialog'

beforeAll(async () => {
  await i18n.changeLanguage('es-CL')
})

function Harness({ pending, invalido }: { pending: boolean; invalido: boolean }) {
  return (
    <CrudDialog size="md" visible mode="create" title="Curso" onHide={() => {}} onSubmit={() => {}} pending={pending}>
      <input aria-label="Nombre" aria-invalid={invalido || undefined} />
    </CrudDialog>
  )
}

/**
 * Medido no CourseDialog em 422 (f4 UI-03, run de 2026-08-28): o Prime
 * desabilita o botão de salvar enquanto `loading`, o navegador solta o foco
 * de um elemento `disabled` para o `<body>`, e quando o botão reabilita
 * ninguém o traz de volta. Quem opera por teclado recomeça o Tab do início do
 * documento sem saber o que houve.
 */
describe('CrudDialog — foco após envio reprovado', () => {
  it('leva o foco ao primeiro campo inválido quando `pending` cai', () => {
    const { rerender } = render(<Harness pending invalido />)
    ;(document.activeElement as HTMLElement | null)?.blur()
    expect(document.activeElement).toBe(document.body)

    rerender(<Harness pending={false} invalido />)

    expect(document.activeElement).toBe(screen.getByLabelText('Nombre'))
  })

  it('sem campo inválido, devolve o foco ao botão de salvar se ele caiu no body', () => {
    const { rerender } = render(<Harness pending invalido={false} />)
    ;(document.activeElement as HTMLElement | null)?.blur()

    rerender(<Harness pending={false} invalido={false} />)

    expect(document.activeElement).toBe(screen.getByRole('button', { name: /Guardar/ }))
  })
})

/**
 * Medido na run 5 (2026-08-30): ao ABRIR, o foco caía no primeiro focável do
 * header — o botão "Maximizar diálogo" do Prime —, não no conteúdo. Quem opera
 * por teclado ou leitor de tela começa por um controle de janela e gasta um Tab
 * para chegar ao formulário.
 */
describe('CrudDialog — foco na abertura', () => {
  // O foco entra no `onShow` do Dialog, que o PrimeReact dispara no fim da
  // transição de entrada (`onEntered`) — por isso `waitFor`, não asserção seca.
  it('leva o foco ao primeiro controle do corpo, não ao botão de maximizar', async () => {
    render(<Harness pending={false} invalido={false} />)

    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText('Nombre')))
  })

  it('corpo sem controle recebe o foco no próprio container, nunca no <body>', async () => {
    render(
      <CrudDialog size="md" visible mode="view" title="Curso" onHide={() => {}}>
        <p>Sin controles</p>
      </CrudDialog>,
    )

    await waitFor(() => expect(document.activeElement).toBe(screen.getByText('Sin controles').parentElement))
  })
})

/**
 * Guarda de rascunho (C-2): Cancelar, Fechar, X e Esc passam pela confirmação
 * quando o form está sujo, e só então. O harness usa o `useCrudForm` de verdade
 * — a guarda nasce lá — e um router de dados, que o blocker exige.
 */
type Fields = { id?: number; name: string }
type Salvo = { id?: number }

const recurso = (): MutableResource<Salvo> => ({
  useCreate: () => ({
    mutate: (_p, opts) => opts?.onSuccess?.({ id: 5 }),
    isPending: false,
    error: null,
  }),
  useUpdate: () => ({
    mutate: (_v, opts) => opts?.onSuccess?.({ id: 5 }),
    isPending: false,
    error: null,
  }),
})
const RECURSO = recurso()

function Onde() {
  return <p data-testid="onde">{useLocation().pathname}</p>
}

function Rascunho({ onHide, mode = 'create', irParaAoSalvar, falhaAoSalvar }: {
  onHide: () => void
  mode?: DialogMode
  irParaAoSalvar?: string
  /** O pós-salvar reprova (como o sync de redatores do curso). */
  falhaAoSalvar?: boolean
}) {
  const navigate = useNavigate()
  const { crud } = useCrudForm<Fields, Salvo>(RECURSO, {
    entity: mode === 'create' ? null : { id: 5, name: 'Original' },
    mode,
    empty: { id: undefined, name: '' },
    toPayload: (f) => ({ name: f.name }),
    mapped: ['name'],
    summaryOnly: [],
    onDone: onHide,
    afterCreate: falhaAoSalvar
      ? () => { throw new Error('segunda etapa reprovou') }
      : irParaAoSalvar ? () => { void navigate(irParaAoSalvar) } : undefined,
  })
  return (
    <>
      <Onde />
      <button onClick={() => void navigate('/otra')}>ir</button>
      <CrudDialog size="md" visible mode={mode} title="Curso" onHide={onHide} onSubmit={crud.submit} guard={crud.guard}>
        <input aria-label="Nombre" value={crud.form.name} onChange={(e) => crud.set('name', e.target.value)} />
      </CrudDialog>
    </>
  )
}

const montar = (props: Parameters<typeof Rascunho>[0]) =>
  renderWithProviders(<Rascunho {...props} />, { route: '/lista' })

const digitar = (valor: string) => fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: valor } })
const perguntou = () => screen.queryByText(i18n.t('common.discardTitle')) !== null
const cancelar = () => fireEvent.click(screen.getByRole('button', { name: i18n.t('common.cancel') }))
const fecharNoX = () => fireEvent.click(screen.getByRole('button', { name: i18n.t('common.close') }))
const esc = () => fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' })

describe('CrudDialog — guarda de rascunho', () => {
  it.each([
    ['Cancelar', cancelar],
    ['o X', fecharNoX],
    ['Esc', esc],
  ])('fechar por %s sem mudança não pergunta', async (_nome, sair) => {
    const onHide = vi.fn()
    montar({ onHide })

    sair()

    await waitFor(() => expect(onHide).toHaveBeenCalledTimes(1))
    expect(perguntou()).toBe(false)
  })

  it('o Fechar do modo leitura não pergunta', () => {
    const onHide = vi.fn()
    montar({ onHide, mode: 'view' })

    fireEvent.click(screen.getAllByRole('button', { name: i18n.t('common.close') }).at(-1)!)

    expect(onHide).toHaveBeenCalledTimes(1)
    expect(perguntou()).toBe(false)
  })

  it.each([
    ['Cancelar', cancelar],
    ['o X', fecharNoX],
    ['Esc', esc],
  ])('fechar por %s com mudança pergunta, sem fechar ainda', async (_nome, sair) => {
    const onHide = vi.fn()
    montar({ onHide })
    digitar('Lotus')

    sair()

    await waitFor(() => expect(perguntou()).toBe(true))
    expect(onHide).not.toHaveBeenCalled()
  })

  it('Descartar fecha; Seguir editando mantém o rascunho', async () => {
    const onHide = vi.fn()
    montar({ onHide })
    digitar('Lotus')

    cancelar()
    await waitFor(() => expect(perguntou()).toBe(true))
    fireEvent.click(screen.getByRole('button', { name: i18n.t('common.keepEditing') }))
    await waitFor(() => expect(perguntou()).toBe(false))
    expect(onHide).not.toHaveBeenCalled()
    expect((screen.getByLabelText('Nombre') as HTMLInputElement).value).toBe('Lotus')

    cancelar()
    await waitFor(() => expect(perguntou()).toBe(true))
    fireEvent.click(screen.getByRole('button', { name: i18n.t('common.discardConfirm') }))
    expect(onHide).toHaveBeenCalledTimes(1)
  })

  it('desfazer a mudança à mão volta a não perguntar', () => {
    const onHide = vi.fn()
    montar({ onHide })

    digitar('Lotus')
    digitar('')
    cancelar()

    expect(onHide).toHaveBeenCalledTimes(1)
    expect(perguntou()).toBe(false)
  })

  it('o blocker do router está montado com rascunho: navegar para fora pergunta', async () => {
    montar({ onHide: vi.fn() })
    digitar('Lotus')

    fireEvent.click(screen.getByText('ir'))

    await waitFor(() => expect(perguntou()).toBe(true))
    expect(screen.getByTestId('onde').textContent).toBe('/lista')
  })

  it('sem rascunho, navegar para fora não pergunta', async () => {
    montar({ onHide: vi.fn() })

    fireEvent.click(screen.getByText('ir'))

    await waitFor(() => expect(screen.getByTestId('onde').textContent).toBe('/otra'))
    expect(perguntou()).toBe(false)
  })

  it('salvar com sucesso fecha sem perguntar', async () => {
    const onHide = vi.fn()
    montar({ onHide })
    digitar('Lotus')

    fireEvent.click(screen.getByRole('button', { name: i18n.t('common.save') }))

    // O `onDone` espera o `afterCreate` (uma microtarefa), por isso `waitFor`.
    await waitFor(() => expect(onHide).toHaveBeenCalledTimes(1))
    expect(perguntou()).toBe(false)
  })

  it('salvar e ser levado a outra rota não pergunta', async () => {
    const onHide = vi.fn()
    montar({ onHide, irParaAoSalvar: '/detalle/5' })
    digitar('Lotus')

    fireEvent.click(screen.getByRole('button', { name: i18n.t('common.save') }))

    await waitFor(() => expect(screen.getByTestId('onde').textContent).toBe('/detalle/5'))
    expect(perguntou()).toBe(false)
  })

  it('pós-salvar que falha: o diálogo fica aberto e a próxima navegação suja ainda pergunta', async () => {
    const erro = vi.spyOn(console, 'error').mockImplementation(() => {})
    const onHide = vi.fn()
    montar({ onHide, falhaAoSalvar: true })
    digitar('Lotus')

    fireEvent.click(screen.getByRole('button', { name: i18n.t('common.save') }))
    await waitFor(() => expect(erro).toHaveBeenCalled())
    expect(onHide).not.toHaveBeenCalled()

    fireEvent.click(screen.getByText('ir'))

    await waitFor(() => expect(perguntou()).toBe(true))
    expect(screen.getByTestId('onde').textContent).toBe('/lista')
    erro.mockRestore()
  })
})
