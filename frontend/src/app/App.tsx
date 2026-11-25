import { AppProviders } from './providers/AppProviders'
import { AppRouter } from './router/AppRouter'

// `SessionBootstrap` desceu para dentro do `AppRouter` (spec D14/D19 da
// certificação): a rota pública `/definir-clave/:token` não pode disparar `GET
// /api/me` — ela não tem cookie de sessão, é aberta por quem ainda não
// definiu a senha. Só `/login` e o ramo protegido continuam sob o bootstrap.
export default function App() {
  return (
    <AppProviders>
      <AppRouter />
    </AppProviders>
  )
}
