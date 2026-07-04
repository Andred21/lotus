import logo from '@/assets/Logo.png'
import { BRAND_COLOR, APP_VERSION } from '@shared/config/brand'
import { LoginForm } from './LoginForm'

export function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Painel esquerdo (marca) */}
      <aside
        className="relative flex flex-col items-center justify-center gap-4 p-10 text-white md:w-1/2 overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${BRAND_COLOR}, #1b7fb8)`,
        }}
      >
        <img src={logo} alt="Lotus" className="w-40" />
        <p className="text-center opacity-90">
          Plataforma de capacitación profesional
          <br />
          Sector eléctrico de alta tensión
        </p>
        <span className="absolute bottom-4 text-xs opacity-70">{APP_VERSION}</span>
      </aside>

      {/* Painel direito (form) */}
      <main className="flex items-center justify-center p-8 md:w-1/2">
        {/* stubs visuais: idioma (ADR-15) e dark mode (ADR-16) — sem ação */}
        <div className="absolute top-4 right-4 flex gap-2 text-gray-400 text-sm select-none">
          <span>🌐 PT</span>
          <span>☾</span>
        </div>
        <LoginForm />
      </main>
    </div>
  )
}
