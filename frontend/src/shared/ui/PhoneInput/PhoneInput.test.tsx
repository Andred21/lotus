import { useState } from 'react'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import i18n from '@shared/config/i18n'
import { PhoneInput } from './PhoneInput'

beforeAll(async () => {
  await i18n.changeLanguage('es-CL')
})

function Harness({ initial = null, spy }: { initial?: string | null; spy?: (v: string | null) => void }) {
  const [value, setValue] = useState<string | null>(initial)
  return (
    <PhoneInput
      aria-label="phone"
      value={value}
      onChange={(v) => {
        spy?.(v)
        setValue(v)
      }}
    />
  )
}

const input = () => screen.getByLabelText('phone') as HTMLInputElement
const type = (text: string) => fireEvent.change(input(), { target: { value: text } })
const paste = (text: string) => fireEvent.paste(input(), { clipboardData: { getData: () => text } })
const label = (container: HTMLElement) => container.querySelector('.p-dropdown-label')?.textContent
const pickCountry = async (container: HTMLElement, name: string) => {
  fireEvent.click(container.querySelector('.p-dropdown') as HTMLElement)
  fireEvent.click(await screen.findByText(name, { selector: '.p-dropdown-item *' }))
}

describe('PhoneInput', () => {
  it('abre com o Chile pré-selecionado', () => {
    const { container } = render(<Harness />)
    expect(label(container)).toContain('+56')
  })

  it('digitar o número nacional emite E.164 com o código do país', () => {
    const spy = vi.fn()
    render(<Harness spy={spy} />)
    type('912345678')
    expect(spy).toHaveBeenLastCalledWith('+56912345678')
  })

  it('colar o número internacional com o Chile selecionado não duplica o código', () => {
    const spy = vi.fn()
    render(<Harness spy={spy} />)
    paste('+56 9 1234 5678')
    expect(spy).toHaveBeenLastCalledWith('+56912345678')
    expect(input().value).not.toContain('+56')
  })

  it('trocar o país reformata o número e emite com o código novo', async () => {
    const spy = vi.fn()
    const { container } = render(<Harness spy={spy} />)
    type('912345678')
    await pickCountry(container, 'Argentina')
    expect(spy).toHaveBeenLastCalledWith('+54912345678')
    expect(label(container)).toContain('+54')
  })

  it('um valor inicial argentino abre com a Argentina selecionada', () => {
    const { container } = render(<Harness initial="+5491123456789" />)
    expect(label(container)).toContain('+54')
    expect(input().value.replace(/\D/g, '')).toBe('91123456789')
  })

  it('texto que não é telefone sobe cru, para a API devolver o 422', () => {
    const spy = vi.fn()
    render(<Harness spy={spy} />)
    type('abc')
    expect(spy).toHaveBeenLastCalledWith('abc')
    expect(input().value).toBe('abc')
  })

  it('apagar o campo emite null', () => {
    const spy = vi.fn()
    render(<Harness initial="+56987654321" spy={spy} />)
    type('')
    expect(spy).toHaveBeenLastCalledWith(null)
  })
})
