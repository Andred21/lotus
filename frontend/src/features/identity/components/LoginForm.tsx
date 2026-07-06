import { AppInputText, AppPassword, AppButton } from "@shared/ui";
import { useLoginForm } from "../hooks/useLoginForm";

export function LoginForm() {
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
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Iniciar sesión</h1>
        <p className="text-gray-500 dark:text-slate-400">Ingresa con tus credenciales</p>
      </div>

      {generalError && (
        <div role="alert" className="text-red-600 dark:text-red-400 text-sm">
          {generalError}
        </div>
      )}

      <label className="flex flex-col gap-1">
        <span className="text-md font-medium dark:text-slate-200">Correo electrónico</span>
        <AppInputText
          leftIcon="pi pi-envelope"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="correo@empresa.cl"
          invalid={!!fieldErrors?.email}
        />
        {fieldErrors?.email && (
          <small className="text-red-600 dark:text-red-400">{fieldErrors.email[0]}</small>
        )}
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-md font-medium dark:text-slate-200">Contraseña</span>
        <AppPassword
          leftIcon="pi pi-lock"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          invalid={!!fieldErrors?.password}
        />
        {fieldErrors?.password && (
          <small className="text-red-600 dark:text-red-400">{fieldErrors.password[0]}</small>
        )}
      </label>

      <AppButton type="submit" label="Iniciar sesión" loading={isSubmitting} />

      {/* stub: fluxo de senha (task futura, sem endpoint) */}
      <a className="text-center text-sm text-gray-400 dark:text-slate-500 cursor-default">
        ¿Olvidaste tu contraseña?
      </a>
    </form>
  );
}
