import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { AppInputText, AppPassword, AppButton, FormErrorBanner, pageTitleClass } from "@shared/ui";
import { dangerText } from "@shared/styles/tokens";
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

      {/* O rótulo NÃO embrulha o campo: o olho da senha vive dentro do
          AppPassword e tem nome acessível próprio, então um <label> por fora
          somava os dois e o campo passava a se chamar "Contraseña Mostrar
          contraseña" (UI-03 do review de 2026-08-13). Com htmlFor/id o rótulo
          nomeia só o input.
          O preço do htmlFor é que o erro do campo deixa de estar dentro do
          rótulo, e aí só existe para quem vê a tela: `aria-describedby` o
          reassocia e `aria-invalid` marca o estado, que o PrimeReact não
          escreve (o `invalid` dele só pinta `.p-invalid`). Este par é o molde
          que a P-37 manda copiar para o FormField — o `describedby` faz parte
          do molde, não é acabamento. */}
      <div className="flex flex-col gap-1">
        <label htmlFor="login-email" className="font-medium" style={{ color: 'var(--text-color)' }}>{t("login.email")}</label>
        <AppInputText
          id="login-email"
          leftIcon="pi pi-envelope"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          placeholder={t("login.emailPlaceholder")}
          invalid={!!fieldErrors?.email}
          aria-invalid={!!fieldErrors?.email}
          aria-describedby={fieldErrors?.email ? "login-email-error" : undefined}
        />
        {fieldErrors?.email && (
          <small id="login-email-error" style={{ color: dangerText }}>{fieldErrors.email[0]}</small>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="login-password" className="font-medium" style={{ color: 'var(--text-color)' }}>{t("login.password")}</label>
        <AppPassword
          inputId="login-password"
          leftIcon="pi pi-lock"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          invalid={!!fieldErrors?.password}
          aria-invalid={!!fieldErrors?.password}
          aria-describedby={fieldErrors?.password ? "login-password-error" : undefined}
        />
        {fieldErrors?.password && (
          <small id="login-password-error" style={{ color: dangerText }}>{fieldErrors.password[0]}</small>
        )}
      </div>

      <AppButton type="submit" label={t("login.submit")} loading={isSubmitting} />

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
