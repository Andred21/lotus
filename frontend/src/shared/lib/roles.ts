// Derivação de exibição de roles. Puro, sem dependência de UI.

/** Label da seção lateral conforme a role predominante. */
export function roleSectionLabel(roles: string[]): string {
  if (roles.includes('superadmin') || roles.includes('admin')) return 'ADMINISTRADOR'
  if (roles.includes('redator')) return 'REDACTOR'
  return ''
}

/** Nome de exibição da role primária (ex.: superadmin → SuperAdmin). */
export function displayRole(roles: string[]): string {
  const r = roles[0]
  if (!r) return ''
  if (r === 'superadmin') return 'SuperAdmin'
  return r.charAt(0).toUpperCase() + r.slice(1)
}
