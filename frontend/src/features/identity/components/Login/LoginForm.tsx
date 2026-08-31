import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { AppInputText, AppPassword, AppButton, FormErrorBanner, FormField, pageTitleClass } from "@shared/ui";
import { useLoginForm } from "../../hooks/useLoginForm";

interface Props {
  email: string;
  onEmailChange: (value: string) => void;
  /** Só na TROCA de modo: abrir /login direto não rouba o foco. */
  autoFocusTitle: boolean;
}

export function LoginForm({ email, onEmailChange, autoFocusTitle }: Props) {
  const { t } = useTranslation();
  const {
    password,
    setPassword,
    submit,
    isSubmitting,
    fieldErrors,
    generalError,
  } = useLoginForm(email);
  const titulo = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (autoFocusTitle) titulo.current?.focus();
  }, [autoFocusTitle]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex flex-col gap-4 w-full max-w-sm mx-auto text-left"
    >
      <div>
        {/* `tabIndex={-1}` existe só para o foco programático da troca de modo:
            a URL muda sem trocar de página, e o React Router não move foco. */}
        <h1
          ref={titulo}
          tabIndex={-1}
          className={pageTitleClass}
          style={{ color: 'var(--text-color)' }}
        >
          {t("login.title")}
        </h1>
        <p style={{ color: 'var(--text-color-secondary)' }}>{t("login.subtitle")}</p>
      </div>

      <FormErrorBanner message={generalError} variant="inline" />

      {/* `FormField`: id por contexto, erro por prop, `invalid`/`aria-*` pelo
          contexto (Task 2). O molde da P-37 nasceu aqui à mão e hoje vive no
          `FormField` — dois recibos de rótulo (16px/500 aqui, 14px/400 lá) era
          o custo de não consumi-lo (f4 UI-06, run de 2026-08-28). */}
      <FormField label={t("login.email")} error={fieldErrors?.email?.[0]}>
        <AppInputText
          leftIcon="pi pi-envelope"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          placeholder={t("login.emailPlaceholder")}
        />
      </FormField>

      <FormField label={t("login.password")} error={fieldErrors?.password?.[0]}>
        <AppPassword
          leftIcon="pi pi-lock"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </FormField>

      <AppButton variant="primary" type="submit" label={t("login.submit")} loading={isSubmitting} />

      {/* Continua `<Link>` e não botão: o destino é URL de verdade, então href,
          botão do meio e menu de contexto seguem funcionando, e o back do
          navegador desfaz a troca de modo. */}
      <Link
        to="/recuperar-clave"
        className="text-center text-sm"
        style={{ color: 'var(--text-color-secondary)' }}
      >
        {t("login.forgotPassword")}
      </Link>
    </form>
  );
}
