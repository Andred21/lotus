import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { AppInputText, AppPassword, AppButton } from '@shared/ui'
import { useLogin } from '../api/useLogin'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const login = useLogin()
  const navigate = useNavigate()
  const location = useLocation()

  const from = (location.state as { from?: string } | null)?.from ?? '/'
  const fieldErrors = login.error?.errors
  const generalError =
    login.error && !login.error.errors ? login.error.detail : null

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    login.mutate(
      { email, password },
      { onSuccess: () => navigate(from, { replace: true }) },
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-sm mx-auto text-center">
      <div>
        <h1 className="text-2xl font-bold">Iniciar sesión</h1>
        <p className="text-gray-500">Ingresa con tus credenciales</p>
      </div>

      {generalError && (
        <div role="alert" className="text-red-600 text-sm">
          {generalError}
        </div>
      )}

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Correo electrónico</span>
        <AppInputText
          leftIcon="pi pi-envelope"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="correo@empresa.cl"
          invalid={!!fieldErrors?.email}
        />
        {fieldErrors?.email && (
          <small className="text-red-600">{fieldErrors.email[0]}</small>
        )}
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Contraseña</span>
        <AppPassword
          leftIcon="pi pi-lock"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          invalid={!!fieldErrors?.password}
          inputStyle={{ width: '100%' }}
          style={{ width: '100%' }}
        />
        {fieldErrors?.password && (
          <small className="text-red-600">{fieldErrors.password[0]}</small>
        )}
      </label>

      <AppButton
        type="submit"
        label="Iniciar sesión"
        loading={login.isPending}
      />

      {/* stub: fluxo de senha (task futura, sem endpoint) */}
      <a className="text-center text-sm text-gray-400 cursor-default">
        ¿Olvidaste tu contraseña?
      </a>
    </form>
  )
}
