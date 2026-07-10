import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'light' | 'dark'

interface UiState {
  sidebarCollapsed: boolean
  theme: Theme
  toggleSidebar: () => void
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

/**
 * Zustand de estado de UI do shell (colapso da sidebar + tema), persistido em
 * localStorage. Vive em `shared` porque é consumido por `app` (Header, Sidebar)
 * e por `shared/ui` (AppearanceControls) — nenhum dos dois pode importar do outro.
 * NÃO guarda dados de sessão (isso é do sessionStore).
 */
export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      theme: 'light',
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((s) => ({ theme: s.theme === 'light' ? 'dark' : 'light' })),
    }),
    { name: 'lotus-ui' },
  ),
)
