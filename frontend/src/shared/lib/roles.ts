// Derivação de exibição de roles. Retorna CHAVES i18n (traduzidas no ponto de
// uso via t()), mantendo a função pura e sem dependência de UI.

/** Chave i18n do label da seção lateral conforme a role predominante. '' = sem role. */
export function roleSectionLabel(roles: string[]): string {
  if (roles.includes('superadmin') || roles.includes('admin')) return 'roleSection.admin'
  if (roles.includes('redator')) return 'roleSection.redator'
  return ''
}

/** Chave i18n do nome da role primária (ex.: "roleName.superadmin"). '' = sem role. */
export function displayRole(roles: string[]): string {
  const r = roles[0]
  return r ? `roleName.${r}` : ''
}
