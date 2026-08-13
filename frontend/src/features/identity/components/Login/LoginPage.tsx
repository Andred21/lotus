import { useTranslation } from "react-i18next";
import { APP_VERSION } from "@shared/config/brand";
import { LoginForm } from "./LoginForm";
import { AppearanceControls, AppLogo } from "@/shared/ui";

export function LoginPage() {

  const { t } = useTranslation();

  return (
    <div
      className="min-h-screen flex flex-col md:flex-row"
      style={{ background: 'var(--surface-ground)' }}
    >

      {/* Painel esquerdo (marca) */}
      <aside
        className="relative flex h-[250px] flex-col items-center justify-center gap-4 p-10 md:h-auto md:w-1/2 overflow-hidden"
        style={{ background: 'var(--brand-gradient)' }}
      >
        <AppLogo variant="on-dark" className="w-[150px] md:w-52" />

        <p className="text-center text-xl" style={{ color: 'var(--primary-200)' }}>
          {t("brand.tagline")}
        </p>

        <p
          className="text-center font-mono text-xs uppercase tracking-[0.14em]"
          style={{ color: 'var(--primary-400)' }}
        >
          {t("brand.sector")}
        </p>

        <span
          className="absolute bottom-4 font-mono text-[13px] tabular-nums"
          style={{ color: 'var(--primary-300)' }}
        >
          {APP_VERSION}
        </span>

      </aside>

      {/* Painel direito (form) */}

      <main
        className="relative flex flex-1 flex-col items-center justify-center gap-6 p-8 md:w-1/2 dark:border-t md:dark:border-t-0 md:dark:border-l"
        style={{ background: 'var(--surface-card)', borderColor: 'var(--surface-border)' }}
      >
        <AppearanceControls className="self-end md:absolute md:top-4 md:right-4 select-none" />

        <LoginForm />

      </main>
    </div>
  );
}
