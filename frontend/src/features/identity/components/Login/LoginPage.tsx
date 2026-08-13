import { useTranslation } from "react-i18next";
import { APP_VERSION } from "@shared/config/brand";
import { LoginForm } from "./LoginForm";
import { AppearanceControls, AppLogo } from "@/shared/ui";

export function LoginPage() {

  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col md:flex-row dark:bg-slate-900">

      {/* Painel esquerdo (marca) */}
      <aside
        className="relative flex flex-col items-center justify-center gap-4 p-10 text-white md:w-1/2 overflow-hidden"
        style={{ background: 'var(--brand-gradient)' }}
      >
        <AppLogo className="w-40" />

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
      
        {/* idioma (ADR-15) + dark mode (ADR-16): o par vem inteiro do
            AppearanceControls. Aqui fica só o que é contexto do login — a
            âncora no canto do painel e o `select-none` do rótulo. */}
        <AppearanceControls className="absolute top-4 right-4 select-none" />

        <LoginForm />

      </main>
    </div>
  );
}
