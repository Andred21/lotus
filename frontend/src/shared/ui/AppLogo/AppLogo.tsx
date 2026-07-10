import { useUiStore } from '@shared/stores/uiStore'
import logoLight from '@/assets/LogoLight.png'
import logoDark from '@/assets/LogoDark.png'

type AppLogoProps = {
  className?: string
  alt?: string
}

export function AppLogo({ className, alt = 'Lotus' }: AppLogoProps) {
    
  const theme = useUiStore((s) => s.theme)

  const currentLogo = theme === 'dark' ? logoDark : logoLight

  return <img src={currentLogo} alt={alt} className={className} />
}