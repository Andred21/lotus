import { useEffect, type ReactNode } from 'react'
import { useMe } from '@features/identity/api/useMe'
import { useSessionStore } from '@features/identity/stores/sessionStore'

export function SessionBootstrap({ children }: { children: ReactNode }) {
  const { data, isError, isSuccess } = useMe()
  const setUser = useSessionStore((s) => s.setUser)
  const clear = useSessionStore((s) => s.clear)
  const status = useSessionStore((s) => s.status)

  useEffect(() => {
    if (isSuccess && data) setUser(data)
    else if (isError) clear()
  }, [isSuccess, isError, data, setUser, clear])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <i className="pi pi-spin pi-spinner text-3xl" />
      </div>
    )
  }
  return <>{children}</>
}
