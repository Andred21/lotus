export interface NavModule {
  key: string
  label: string
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
  { key: 'dashboard',      label: 'Dashboard',      icon: 'pi pi-objects-column', path: '/' },
  { key: 'comercial',      label: 'Comercial',      icon: 'pi pi-file',           path: '/comercial',      permission: 'commercial.quote.view' },
  { key: 'operacion',      label: 'Operación',      icon: 'pi pi-briefcase',      path: '/operacion',      permission: 'operation.turma.view' },
  { key: 'cursos',         label: 'Cursos',         icon: 'pi pi-book',           path: '/cursos',         permission: 'catalog.course.view' },
  { key: 'certificados',   label: 'Certificados',   icon: 'pi pi-verified',       path: '/certificados',   permission: 'certification.certificate.view' },
  { key: 'personas',       label: 'Personas',       icon: 'pi pi-id-card',        path: '/personas',       permission: 'identity.user.view' },
  { key: 'administracion', label: 'Administración', icon: 'pi pi-cog',            path: '/administracion', permission: 'identity.access.manage' },
]
