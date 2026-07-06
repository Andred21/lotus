import { useTranslation } from "react-i18next";
import logo from "@/assets/Logo.png";
import { BRAND_COLOR, APP_VERSION } from "@shared/config/brand";
import { LoginForm } from "./LoginForm";
import { AppButton, LanguageMenu } from "@/shared/ui";
import { useUiStore } from "@/app/providers/uiStore";

export function LoginPage() {
  const { t } = useTranslation();
  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);
  return (
    <div className="min-h-screen flex flex-col md:flex-row dark:bg-slate-900">
      {/* Painel esquerdo (marca) */}
      <aside
        className="relative flex flex-col items-center justify-center gap-4 p-10 text-white md:w-1/2 overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${BRAND_COLOR}, #1b7fb8)`,
        }}
      >
        <img src={logo} alt="Lotus" className="w-40" />
        <p className="text-center opacity-90">
          {t("brand.tagline")}
          <br />
          {t("brand.sector")}
        </p>
        <span className="absolute bottom-4 text-xs opacity-70">
          {APP_VERSION}
        </span>
      </aside>

      {/* Painel direito (form) */}

      <main className="relative flex items-center justify-center p-8 md:w-1/2 dark:bg-slate-900">
      
        {/* idioma (ADR-15) + dark mode (ADR-16) */}
        <div className="absolute top-4 right-4 flex gap-2 text-gray-400 text-sm select-none">
          <LanguageMenu />
          <AppButton
            variant="brandIcon"
            onClick={toggleTheme}
            aria-label="Alternar tema"
          >
            <i className={`pi ${theme === "dark" ? "pi-sun" : "pi-moon"}`} />
          </AppButton>
        </div>
        <LoginForm />
      </main>
    </div>
  );
}
