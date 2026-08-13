import { useTranslation } from "react-i18next";
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

      <label className="flex flex-col gap-1">
        <span className="font-medium" style={{ color: 'var(--text-color)' }}>{t("login.email")}</span>
        <AppInputText
          leftIcon="pi pi-envelope"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("login.emailPlaceholder")}
          invalid={!!fieldErrors?.email}
        />
        {fieldErrors?.email && (
          <small style={{ color: dangerText }}>{fieldErrors.email[0]}</small>
        )}
      </label>

      <label className="flex flex-col gap-1">
        <span className="font-medium" style={{ color: 'var(--text-color)' }}>{t("login.password")}</span>
        <AppPassword
          leftIcon="pi pi-lock"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          invalid={!!fieldErrors?.password}
        />
        {fieldErrors?.password && (
          <small style={{ color: dangerText }}>{fieldErrors.password[0]}</small>
        )}
      </label>

      <AppButton type="submit" label={t("login.submit")} loading={isSubmitting} />

      {/* Texto de ajuda, não link: não existe endpoint de recuperação de senha,
          e uma <a> sem href fica fora da ordem de tabulação (UI-07). */}
      <p className="text-center text-sm" style={{ color: 'var(--text-color-secondary)' }}>
        {t("login.forgot")}
      </p>
    </form>
  );
}
