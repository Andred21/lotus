export interface NavModule {
  key: string
  /** Chave i18n do rótulo (ex.: "nav.dashboard"). Traduzido no ponto de uso. */
  labelKey: string
  icon: string // classe primeicons, ex.: "pi pi-book"
  path: string
  /** Permissão exigida para exibir. undefined = sempre visível. */
  permission?: string
}

/**
 * Módulos do menu lateral. Mapeamento módulo → permissão bate com o
 * RolePermissionSeeder (backend). Ícones são aproximações primeicons;
 * ajustar para casar 100% com o Figma é cosmético.
 */
export const NAV_MODULES: NavModule[] = [
  { key: 'dashboard',      labelKey: 'nav.dashboard',      icon: 'pi pi-objects-column', path: '/' },
  { key: 'comercial',      labelKey: 'nav.comercial',      icon: 'pi pi-file',           path: '/comercial',      permission: 'commercial.quote.view' },
  { key: 'operacion',      labelKey: 'nav.operacion',      icon: 'pi pi-briefcase',      path: '/operacion',      permission: 'operation.turma.view' },
  { key: 'cursos',         labelKey: 'nav.cursos',         icon: 'pi pi-book',           path: '/cursos',         permission: 'catalog.course.view' },
  { key: 'certificados',   labelKey: 'nav.certificados',   icon: 'pi pi-verified',       path: '/certificados',   permission: 'certification.certificate.view' },
  { key: 'personas',       labelKey: 'nav.personas',       icon: 'pi pi-id-card',        path: '/personas',       permission: 'identity.user.view' },
  { key: 'administracion', labelKey: 'nav.administracion', icon: 'pi pi-cog',            path: '/administracion', permission: 'identity.access.manage' },
]
