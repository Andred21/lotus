import { AppProviders } from './providers/AppProviders'
import { SessionBootstrap } from './SessionBootstrap'
import { AppRouter } from './router/AppRouter'

export default function App() {
  return (
    <AppProviders>
      <SessionBootstrap>
        <AppRouter />
      </SessionBootstrap>
    </AppProviders>
  )
}
