import { RouterProvider, createBrowserRouter } from 'react-router-dom'
import { routes } from './routes'

// O router nasce UMA vez, fora do render: recriá-lo a cada render derrubaria o
// estado de navegação (e o `RouterProvider` não aceita a troca de instância).
const router = createBrowserRouter(routes)

export function AppRouter() {
  return <RouterProvider router={router} />
}
