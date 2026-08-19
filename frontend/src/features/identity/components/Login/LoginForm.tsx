import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { AppInputText, AppPassword, AppButton, FormErrorBanner } from "@shared/ui";
import { dangerText } from "@shared/styles/tokens";
import { useLoginForm } from "../../hooks/useLoginForm";

export function LoginForm() {
  const { t } = useTranslation();
  const {
    email,
    setEmail,
    password,
    setPassword,
    submit,
    isSubmitting,
    fieldErrors,
    generalError,
  } = useLoginForm();

  return (

    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex flex-col gap-4 w-full max-w-sm mx-auto text-left"
    >
      <div>
        <h1
          className="font-display text-2xl font-semibold tracking-tight"
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
          onChange={(e) => setEmail(e.target.value)}
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

      {/* Virou link de verdade: a recuperação existe desde este bloco, então o
          texto de ajuda ("peça ao administrador") passaria a mentir. Link com
          `to` entra na ordem de tabulação — a razão de o antigo ser <p> era
          justamente não haver destino (UI-07). */}
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
