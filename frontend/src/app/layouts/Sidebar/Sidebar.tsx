import { useUiStore } from "@app/stores/uiStore";
import { usePermissions } from "@features/identity/hooks/usePermissions";
import { NAV_MODULES } from "@app/config/navigation";
import { APP_VERSION } from "@shared/config/brand";
import { SidebarItem } from "./SidebarItem";
import logo from "@/assets/Logo.png";
import { AppButton } from "@/shared/ui";

/** Label da seção conforme a role predominante. */
function roleLabel(roles: string[]): string {
  if (roles.includes("superadmin") || roles.includes("admin"))
    return "ADMINISTRADOR";
  if (roles.includes("redator")) return "REDACTOR";
  return "";
}

export function Sidebar() {
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggle = useUiStore((s) => s.toggleSidebar);
  const { can, roles } = usePermissions();

  const modules = NAV_MODULES.filter((m) => !m.permission || can(m.permission));

  return (
    <aside
      className={`${collapsed ? "w-20" : "w-64"} flex h-screen flex-col border-r border-slate-200 bg-white transition-all dark:border-slate-800 dark:bg-slate-900`}
    >
      <div className="flex items-center justify-center px-4 py-5">
        <div className=" flex items-center">
          {!collapsed && <img src={logo} alt="Lotus" className="h-20 w-auto" />}
        </div>
          <AppButton
            onClick={toggle}
            aria-label="Alternar menu"
            className="text-slate-500
           bg-white border-gray-300 border-2 ring-0 
           dark:border-0 dark:border-blue-900 dark:bg-blue-900
            hover:text-slate-700 dark:hover:text-slate-300 dark:text-white"
          >
            <i
              className={`pi ${collapsed ? "pi-angle-right" : "pi-angle-left"}`}
            />
          </AppButton>
      </div>

      {!collapsed && (
        <p className="px-4 pb-2 text-xs font-semibold tracking-wider text-slate-400">
          {roleLabel(roles)}
        </p>
      )}

      <nav className="flex flex-1 flex-col gap-1 px-3">
        {modules.map((m) => (
          <SidebarItem key={m.key} module={m} collapsed={collapsed} />
        ))}
      </nav>

      {!collapsed && (
        <div className="px-4 py-3 text-xs text-slate-400">{APP_VERSION}</div>
      )}
    </aside>
  );
}
