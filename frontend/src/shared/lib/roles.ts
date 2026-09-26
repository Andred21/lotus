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

/** Roles que têm rótulo em `roleName.*` nos três locales. */
const SYSTEM_ROLES = ['superadmin', 'admin', 'redator']

/** Rótulo de um role para a tela. Role de sistema sai pela chave `roleName.*`
 * — o slug `redator` é português e chegava cru à tela es-CL (UI-01 da run de
 * Administración, 2026-09-26). Role customizado não tem chave: o nome que o
 * admin digitou é o rótulo. Recebe `t` por parâmetro, como `loadMessage`. */
export function roleLabel(name: string, t: (key: string) => string): string {
  return SYSTEM_ROLES.includes(name) ? t(`roleName.${name}`) : name
}
