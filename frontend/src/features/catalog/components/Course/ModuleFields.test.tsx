import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import type { CourseModuleData } from '@shared/types/generated'
import { ModuleFields } from './ModuleFields'

vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation(),
  }
})

const modulo = (name: string): CourseModuleData => ({
  name, theory_hours: 1, practice_hours: 1, learnings: null, contents: null,
} as unknown as CourseModuleData)

/** O pai real (`useCourseForm`) é quem guarda o array; aqui o mesmo contrato:
 * mover troca com o vizinho, remover filtra, e o índice é a identidade. */
function Harness({ nomes }: { nomes: string[] }) {
  const [modules, setModules] = useState(() => nomes.map(modulo))

  return (
    <ModuleFields
      modules={modules}
      readOnly={false}
      workloadHours={0}
      modulesTotal={0}
      hoursMismatch={false}
      onAdd={() => setModules((m) => [...m, modulo('')])}
      onRemove={(i) => setModules((m) => m.filter((_, idx) => idx !== i))}
      onPatch={() => undefined}
      onMove={(i, dir) =>
        setModules((m) => {
          const j = i + dir
          if (j < 0 || j >= m.length) return m
          const next = [...m]
          ;[next[i], next[j]] = [next[j], next[i]]
          return next
        })
      }
    />
  )
}

const botao = (i: number, move: 'up' | 'down') =>
  document.querySelector<HTMLButtonElement>(`[data-move-index="${i}"][data-move="${move}"]`) as HTMLButtonElement

const nomes = () => screen.getAllByLabelText('courseModule.name').map((el) => (el as HTMLInputElement).value)

/** Enter num botão focado dispara o clique dele: é o que o navegador faz. */
const enterNoFoco = () => fireEvent.click(document.activeElement as HTMLElement)

describe('ModuleFields — foco ao reordenar', () => {
  it('mover para baixo mantém o foco no módulo movido', () => {
    render(<Harness nomes={['A', 'B', 'C']} />)

    botao(0, 'down').focus()
    enterNoFoco()

    expect(nomes()).toEqual(['B', 'A', 'C'])
    expect(document.activeElement).toBe(botao(1, 'down'))
  })

  it('dois Enter seguidos movem duas vezes o mesmo módulo', () => {
    render(<Harness nomes={['A', 'B', 'C']} />)

    botao(0, 'down').focus()
    enterNoFoco()
    enterNoFoco()

    expect(nomes()).toEqual(['B', 'C', 'A'])
    // Na ponta o "descer" fica desabilitado: o foco vai ao botão oposto do MESMO módulo.
    expect(document.activeElement).toBe(botao(2, 'up'))
  })

  it('curso com um módulo só tem as setas desabilitadas, e remover o último devolve o foco ao botão de adicionar', () => {
    render(<Harness nomes={['A']} />)

    expect(botao(0, 'up').disabled).toBe(true)
    expect(botao(0, 'down').disabled).toBe(true)

    screen.getByRole('button', { name: 'courseModule.remove' }).focus()
    enterNoFoco()

    expect(screen.queryAllByLabelText('courseModule.name')).toHaveLength(0)
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'courseModule.add' }))
  })

  it('remover o módulo do último índice, com outros sobrando, leva o foco ao novo último', () => {
    render(<Harness nomes={['A', 'B']} />)

    document.querySelector<HTMLButtonElement>('[data-move-index="1"][data-move="remove"]')?.focus()
    enterNoFoco()

    expect(nomes()).toEqual(['A'])
    expect(document.activeElement).toBe(document.querySelector('[data-move-index="0"][data-move="remove"]'))
  })
})
