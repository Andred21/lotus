import { beforeAll, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import i18n from '@shared/config/i18n'
import { AppTextarea } from './AppTextarea'

beforeAll(async () => {
  await i18n.changeLanguage('es-CL')
})

describe('AppTextarea — contador de caracteres', () => {
  it('com maxLength e showCount mostra contagem e máximo', () => {
    render(<AppTextarea aria-label="Descripción" maxLength={620} showCount value="hola" onChange={() => {}} />)

    const contador = screen.getByText('4 / 620')
    expect(contador.getAttribute('aria-live')).toBe('polite')
  })

  it('sem showCount não mostra contador', () => {
    render(<AppTextarea aria-label="Descripción" maxLength={620} value="hola" onChange={() => {}} />)

    expect(screen.queryByText('4 / 620')).toBeNull()
  })

  it('sem maxLength, showCount não tem o que contar', () => {
    render(<AppTextarea aria-label="Descripción" showCount value="hola" onChange={() => {}} />)

    expect(screen.queryByText(/\//)).toBeNull()
  })

  it('não-controlado (sem value) começa em zero', () => {
    render(<AppTextarea aria-label="Descripción" maxLength={620} showCount />)

    expect(screen.getByText('0 / 620')).toBeTruthy()
  })
})
