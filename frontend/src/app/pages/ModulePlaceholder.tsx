/** Stand-in para módulos ainda não implementados; mantém a nav clicável. */
export function ModulePlaceholder({ title }: { title: string }) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">Módulo en construcción.</p>
    </div>
  )
}
