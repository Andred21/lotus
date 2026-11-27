import { beforeAll, describe, expect, it, vi } from 'vitest'
import { useState } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useLocation, useNavigate } from 'react-router-dom'
import i18n from '@shared/config/i18n'
import { useCrudForm, type MutableResource } from '@shared/hooks/useCrudForm'
import { renderWithProviders } from '@shared/testing/providers'
import type { DialogMode } from '@shared/lib'
import { CrudDialog } from './CrudDialog'
import { NestedField, FormErrorSummary } from '../FormField'
import { useFieldProps } from '../FormField/fieldContext'

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

    await waitFor(() => expect(document.activeElement).toBe(screen.getByText('Sin controles').closest('[tabindex="-1"]')))
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

/**
 * Enter (A-10): o corpo é um `<form>` e o Salvar do footer, que mora fora dele
 * (o Prime renderiza header/corpo/footer irmãos), é o botão `submit` dele pelo
 * atributo `form`. O jsdom não faz envio implícito no Enter, então `enter()`
 * aplica a regra da especificação HTML: no `input`, aciona o botão de envio
 * PADRÃO do form (o primeiro `submit` de `form.elements`) se ele não estiver
 * desabilitado; no `textarea`, Enter é quebra de linha e nada envia.
 */
describe('CrudDialog — Enter envia', () => {
  const enter = (el: HTMLElement) => {
    const solto = fireEvent.keyDown(el, { key: 'Enter', code: 'Enter' })
    if (!solto || !(el instanceof HTMLInputElement) || !el.form) return
    const padrao = [...el.form.elements].find(
      (e): e is HTMLButtonElement => e instanceof HTMLButtonElement && e.type === 'submit',
    )
    if (padrao && !padrao.disabled) padrao.click()
  }

  function Envio({ onSubmit, pending = false }: { onSubmit: () => void; pending?: boolean }) {
    return (
      <CrudDialog size="md" visible mode="create" title="Curso" onHide={() => {}} onSubmit={onSubmit} pending={pending}>
        <input aria-label="Nombre" />
        <textarea aria-label="Notas" />
      </CrudDialog>
    )
  }

  it('Enter num input envia, uma vez', () => {
    const onSubmit = vi.fn()
    render(<Envio onSubmit={onSubmit} />)

    enter(screen.getByLabelText('Nombre'))

    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('o conteúdo de `afterForm` fica fora do form: Enter nele não envia', () => {
    const onSubmit = vi.fn()
    render(
      <CrudDialog
        size="md" visible mode="edit" title="Curso" onHide={() => {}} onSubmit={onSubmit}
        afterForm={<input aria-label="Buscar" />}
      >
        <input aria-label="Nombre" />
      </CrudDialog>,
    )
    const busca = screen.getByLabelText('Buscar') as HTMLInputElement

    enter(busca)

    expect(busca.form).toBeNull()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('o clique em Salvar também envia uma vez só, pelo mesmo caminho', () => {
    const onSubmit = vi.fn()
    render(<Envio onSubmit={onSubmit} />)

    fireEvent.click(screen.getByRole('button', { name: i18n.t('common.save') }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('Enter em textarea não envia e não perde a quebra de linha', () => {
    const onSubmit = vi.fn()
    render(<Envio onSubmit={onSubmit} />)
    const notas = screen.getByLabelText('Notas')

    expect(fireEvent.keyDown(notas, { key: 'Enter', code: 'Enter' })).toBe(true)
    enter(notas)

    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('Enter com o salvar em voo não reenvia', () => {
    const onSubmit = vi.fn()
    render(<Envio onSubmit={onSubmit} pending />)

    enter(screen.getByLabelText('Nombre'))

    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('enviar o form com `disabled` não chama o onSubmit', () => {
    const onSubmit = vi.fn()
    render(
      <CrudDialog size="md" visible mode="create" title="Curso" onHide={() => {}} onSubmit={onSubmit} disabled>
        <input aria-label="Nombre" />
      </CrudDialog>,
    )

    fireEvent.submit(screen.getByLabelText('Nombre').closest('form')!)

    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('o submit de um form do diálogo não sobe a um form ancestral na árvore React', () => {
    const externo = vi.fn((e: { preventDefault: () => void }) => e.preventDefault())
    render(
      <form onSubmit={externo}>
        <Envio onSubmit={() => {}} />
      </form>,
    )

    fireEvent.click(screen.getByRole('button', { name: i18n.t('common.save') }))

    expect(externo).not.toHaveBeenCalled()
  })

  /** O Editar da leitura e o Salvar da edição ocupam a mesma posição no
   * rodapé. Reaproveitado pelo React, o `<button>` do Editar virava
   * `type="submit"` dentro do próprio clique, e o navegador enviava o form:
   * clicar em Editar salvava sem mudança e voltava à leitura (PUT medido no
   * navegador). O jsdom não roda a ativação depois da troca de tipo, então o
   * teste prova a causa: o Salvar é um nó NOVO, não o Editar reaproveitado. */
  it('clicar em Editar abre a edição e não envia', () => {
    const onSubmit = vi.fn()
    function LeituraEditavel() {
      const [mode, setMode] = useState<DialogMode>('view')
      return (
        <CrudDialog
          size="md" visible mode={mode} title="Curso" onHide={() => {}}
          onEdit={() => setMode('edit')} onSubmit={onSubmit}
        >
          <input aria-label="Nombre" />
        </CrudDialog>
      )
    }
    render(<LeituraEditavel />)

    const editar = screen.getByRole('button', { name: i18n.t('common.edit') })
    fireEvent.click(editar)

    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: i18n.t('common.save') })).not.toBe(editar)
  })

  /** Revisão final do bloco 66, I-2: a `key` por modo desmonta o rodapé, e com ele
   * o Editar que tinha o foco; o navegador o solta no `<body>`. Quem clicou em
   * Editar por teclado recomeçava o Tab do início do documento. */
  it('depois de Editar, o foco vai ao primeiro campo do corpo e não ao body', () => {
    function LeituraEditavel() {
      const [mode, setMode] = useState<DialogMode>('view')
      return (
        <CrudDialog
          size="md" visible mode={mode} title="Curso" onHide={() => {}}
          onEdit={() => setMode('edit')} onSubmit={() => {}}
        >
          <input aria-label="Nombre" />
        </CrudDialog>
      )
    }
    render(<LeituraEditavel />)

    const editar = screen.getByRole('button', { name: i18n.t('common.edit') })
    editar.focus()
    fireEvent.click(editar)

    expect(document.activeElement).toBe(screen.getByLabelText('Nombre'))
  })

  it('o modo leitura não tem botão de envio', () => {
    render(
      <CrudDialog size="md" visible mode="view" title="Curso" onHide={() => {}} onSubmit={() => {}}>
        <p>Sin controles</p>
      </CrudDialog>,
    )

    expect(document.querySelector('button[type="submit"]')).toBeNull()
  })
})

/**
 * Erro de campo aninhado e resumo (C-7): ao reprovar, o foco vai ao primeiro
 * `aria-invalid` — que o `NestedField` passa a marcar — e, sem campo inválido,
 * ao resumo de erros, que é `alert` e focável.
 */
describe('CrudDialog — foco no erro após envio reprovado', () => {
  function Entrada() {
    return <input aria-label="Modulo" {...useFieldProps('id')} />
  }

  it('leva o foco ao campo aninhado inválido quando `pending` cai', () => {
    const arvore = (pending: boolean) => (
      <CrudDialog size="md" visible mode="create" title="Curso" onHide={() => {}} onSubmit={() => {}} pending={pending}>
        <NestedField error="Nombre requerido"><Entrada /></NestedField>
      </CrudDialog>
    )
    const { rerender } = render(arvore(true))
    ;(document.activeElement as HTMLElement | null)?.blur()

    rerender(arvore(false))

    expect(document.activeElement).toBe(screen.getByLabelText('Modulo'))
  })

  it('sem campo inválido, leva o foco ao resumo de erros', () => {
    const arvore = (pending: boolean) => (
      <CrudDialog size="md" visible mode="create" title="Curso" onHide={() => {}} onSubmit={() => {}} pending={pending}>
        <FormErrorSummary errors={{ phone: ['Teléfono inválido'] }} mapped={[]} />
        <input aria-label="Nombre" />
      </CrudDialog>
    )
    const { rerender } = render(arvore(true))
    ;(document.activeElement as HTMLElement | null)?.blur()

    rerender(arvore(false))

    expect(document.activeElement).toBe(screen.getByRole('alert'))
  })
})
