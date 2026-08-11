import { useUiStore } from '@shared/stores/uiStore'
import logoLight from '@/assets/LogoLight.png'
import logoDark from '@/assets/LogoDark.png'

type AppLogoProps = {
  className?: string
  alt?: string
  /** `on-dark`: força o wordmark claro (o do tema dark) sobre fundo escuro
   * fixo, como a sidebar navy — que não acompanha o tema (spec §6). */
  variant?: 'auto' | 'on-dark'
}

export function AppLogo({ className, alt = 'Lotus', variant = 'auto' }: AppLogoProps) {
  const theme = useUiStore((s) => s.theme)

  const currentLogo = variant === 'on-dark' || theme === 'dark' ? logoDark : logoLight

  return <img src={currentLogo} alt={alt} className={className} />
}
