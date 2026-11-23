import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { RutInput } from './RutInput'

function Harness({ initial = '' }: { initial?: string }) {
  const [value, setValue] = useState(initial)
  return <RutInput aria-label="rut" value={value} onChange={setValue} />
}

const paste = (text: string) =>
  fireEvent.paste(input(), { clipboardData: { getData: () => text } })

const input = () => screen.getByLabelText('rut') as HTMLInputElement

describe('RutInput', () => {
  it('formata enquanto digita', () => {
    render(<Harness />)
    for (const typed of ['1', '12', '123', '1234', '12345', '123456', '1234567', '12345678', '123456785']) {
      fireEvent.change(input(), { target: { value: typed } })
    }
    expect(input().value).toBe('12.345.678-5')
  })

  it('limita a 12 caracteres e ao modo texto (o DV pode ser K)', () => {
    render(<Harness />)
    expect(input().maxLength).toBe(12)
    expect(input().getAttribute('inputmode')).toBe('text')
  })

  it('cola um RUT com espaço, ponto a mais e k minúsculo sem perder o DV', () => {
    render(<Harness />)
    paste(' 12..345.678 - k ')
    expect(input().value).toBe('12.345.678-K')
  })

  it('cola um RUT de 7 dígitos sem ponto duplicado', () => {
    render(<Harness />)
    paste('1.234.567-8')
    expect(input().value).toBe('1.234.567-8')
  })

  it('só marca aria-invalid depois do blur, e só se o DV estiver errado', async () => {
    render(<Harness initial="12.345.678-4" />)
    expect(input().getAttribute('aria-invalid')).toBeNull()
    fireEvent.blur(input())
    expect(input().getAttribute('aria-invalid')).toBe('true')
  })

  it('não marca inválido um RUT correto nem um campo vazio', () => {
    const { rerender } = render(<RutInput aria-label="rut" value="12.345.678-5" onChange={() => {}} />)
    fireEvent.blur(input())
    expect(input().getAttribute('aria-invalid')).toBeNull()
    rerender(<RutInput aria-label="rut" value="" onChange={() => {}} />)
    expect(input().getAttribute('aria-invalid')).toBeNull()
  })
})
