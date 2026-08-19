import { useTranslation } from "react-i18next";
import { APP_VERSION } from "@shared/config/brand";
import { AuthPanel } from "./AuthPanel";
import { AppearanceControls, AppLogo } from "@/shared/ui";

export function LoginPage() {

  const { t } = useTranslation();

  return (
    <div
      className="min-h-screen flex flex-col md:flex-row"
      style={{ background: 'var(--surface-ground)' }}
    >

      {/* Painel esquerdo (marca)
          `min-h`, não `h`: o Preflight do Tailwind está desligado neste projeto
          (index.css:7,10), então cada <p> carrega a margem de 1em do user-agent
          e o conteúdo do painel é mais alto do que as classes `gap-*` sugerem.
          Com altura fixa + `overflow-hidden` o excedente era cortado em silêncio
          (o defeito que a Task 7 mediu) e a correção de então comprou espaço
          encolhendo o wordmark para 68px — 11px de altura na palavra "LOTUS".
          Aqui a margem do UA é zerada na fonte (`my-0`), o painel cresce em vez
          de cortar e a marca volta a 150px. Sem `overflow-hidden`: se algum dia
          voltar a estourar (zoom de texto, tradução mais longa), tem que
          aparecer, não ser mascarado. */}
      <aside
        className="relative flex min-h-67.5 flex-col items-center justify-center gap-1 p-6 md:h-auto md:w-1/2 md:gap-4 md:p-10"
        style={{ background: 'var(--brand-gradient)' }}
      >
        <AppLogo variant="on-dark" className="w-37.5 md:w-52" />

        <p className="my-0 text-center text-xl" style={{ color: 'var(--primary-200)' }}>
          {t("brand.tagline")}
        </p>

        <p
          className="my-0 text-center font-mono text-xs uppercase tracking-[0.14em]"
          style={{ color: 'var(--primary-400)' }}
        >
          {t("brand.sector")}
        </p>

        {/* No fluxo no mobile, fixado no rodapé só a partir de md: com o painel
            crescendo por conteúdo, um badge absoluto colidia com a legenda de
            setor em vez de ficar abaixo dela. */}
        <span
          className="mt-2 font-mono text-[13px] tabular-nums md:absolute md:bottom-4 md:mt-0"
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

        <AuthPanel />

      </main>
    </div>
  );
}
