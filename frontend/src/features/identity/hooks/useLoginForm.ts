import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useLogin } from "../api/authApi";

/**
 * Lógica do formulário de login: estado dos campos, mutation de login,
 * navegação pós-sucesso e derivação de erros. O componente LoginForm apenas
 * consome este hook e renderiza — nenhuma lógica vive no JSX.
 */
export function useLoginForm() {
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const login = useLogin();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: string } | null)?.from ?? "/";

  // 422 traz erros por campo; 401/inativo trazem só a mensagem geral.
  const fieldErrors = login.error?.errors;
  const generalError =
    login.error && !login.error.errors ? login.error.detail : null;

  function submit() {
    login.mutate(
      { email, password },
      { onSuccess: () => navigate(from, { replace: true }) },
    );
  }

  return {
    email,
    setEmail,
    password,
    setPassword,
    submit,
    isSubmitting: login.isPending,
    fieldErrors,
    generalError,
  };
}
