import type { IconName } from '@shared/ui'

export interface NavModule {
  key: string
  /** Chave i18n do rótulo (ex.: "nav.dashboard"). Traduzido no ponto de uso. */
  labelKey: string
  /** Rótulo curto (`nav.short.<key>`, até 9 caracteres) do rail colapsado de 80px, onde o integral não cabe a 12px. */
  shortLabelKey: string
  icon: IconName
  path: string
  /** Permissão exigida para exibir. undefined = sempre visível. */
  permission?: string
}

/**
 * Módulos do menu lateral. Mapeamento módulo → permissão bate com o
 * RolePermissionSeeder (backend). Ícones são nomes do registro `IconName` (`AppIcon`).
 */
export const NAV_MODULES: NavModule[] = [
  { key: 'dashboard',      labelKey: 'nav.dashboard',      shortLabelKey: 'nav.short.dashboard',      icon: 'dashboard',   path: '/' },
  { key: 'comercial',      labelKey: 'nav.comercial',      shortLabelKey: 'nav.short.comercial',      icon: 'file',        path: '/comercial',      permission: 'commercial.quote.view' },
  { key: 'operacion',      labelKey: 'nav.operacion',      shortLabelKey: 'nav.short.operacion',      icon: 'briefcase',   path: '/operacion',      permission: 'operation.turma.view' },
  { key: 'cursos',         labelKey: 'nav.cursos',         shortLabelKey: 'nav.short.cursos',         icon: 'book',        path: '/cursos',         permission: 'catalog.course.view' },
  { key: 'certificados',   labelKey: 'nav.certificados',   shortLabelKey: 'nav.short.certificados',   icon: 'certificate', path: '/certificados',   permission: 'certification.certificate.view' },
  { key: 'personas',       labelKey: 'nav.personas',       shortLabelKey: 'nav.short.personas',       icon: 'idCard',      path: '/personas',       permission: 'identity.user.view' },
  { key: 'administracion', labelKey: 'nav.administracion', shortLabelKey: 'nav.short.administracion', icon: 'settings',    path: '/administracion', permission: 'identity.user.view' },
]
