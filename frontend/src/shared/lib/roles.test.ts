import { describe, expect, it } from 'vitest'
import { roleLabel } from './roles'

// `t` devolve a chave, como o `mockUseTranslation`: o caso mede QUAL texto a
// tela escolhe, não a tradução dele.
const t = (key: string) => key

describe('roleLabel', () => {
  it('role de sistema sai pela chave roleName — "redator" não chega cru à tela', () => {
    expect(roleLabel('superadmin', t)).toBe('roleName.superadmin')
    expect(roleLabel('admin', t)).toBe('roleName.admin')
    expect(roleLabel('redator', t)).toBe('roleName.redator')
  })

  it('role customizado não tem chave: o nome digitado é o rótulo', () => {
    expect(roleLabel('auditor', t)).toBe('auditor')
  })
})
