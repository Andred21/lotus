// Derivação de exibição de roles, pura e sem dependência de UI. `roleSectionLabel`
// devolve CHAVE i18n (traduzida no ponto de uso); `roleLabel` devolve o RÓTULO,
// recebendo `t` por parâmetro, porque role customizado não tem chave.

/** Chave i18n do label da seção lateral conforme a role predominante. '' = sem role. */
export function roleSectionLabel(roles: string[]): string {
  if (roles.includes('superadmin') || roles.includes('admin')) return 'roleSection.admin'
  if (roles.includes('redator')) return 'roleSection.redator'
  return ''
}

/** Roles que têm rótulo em `roleName.*` nos três locales. */
const SYSTEM_ROLES = ['superadmin', 'admin', 'redator']

/** Rótulo de um role para a tela — o ÚNICO caminho, da lista de Administración
 * ao cabeçalho do app. Role de sistema sai pela chave `roleName.*` — o slug
 * `redator` é português e chegava cru à tela es-CL (UI-01 da run de
 * Administración de `2026-09-04-lotus-ui-review-administracion.md`). Role
 * customizado não tem chave: o nome que o admin digitou é o rótulo. Recebe `t`
 * por parâmetro, como `loadMessage`.
 *
 * Substituiu o `displayRole`, que montava `roleName.<slug>` para QUALQUER role
 * e punha a chave crua no cabeçalho de quem tivesse role customizado (Q-4 do
 * review de 2026-09-26). */
export function roleLabel(name: string, t: (key: string) => string): string {
  return SYSTEM_ROLES.includes(name) ? t(`roleName.${name}`) : name
}
