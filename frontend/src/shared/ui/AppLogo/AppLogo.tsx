import { useUiStore } from '@shared/stores/uiStore'
import logoLight from '@/assets/LogoLight.png'
import logoDark from '@/assets/LogoDark.png'
import logoGlyph from '@/assets/LogoGlyph.png'

type AppLogoProps = {
  className?: string
  alt?: string
  /** `on-dark`: força o wordmark claro (o do tema dark) sobre fundo escuro
   * fixo, como a sidebar navy — que não acompanha o tema (spec §6).
   * `glyph`: só o símbolo, sem o wordmark, para espaço estreito — o rail da
   * sidebar colapsada (UI-06 do review de 2026-08-12). Serve nos dois temas:
   * o símbolo é celeste em ambos os assets. */
  variant?: 'auto' | 'on-dark' | 'glyph'
}

export function AppLogo({ className, alt = 'Lotus', variant = 'auto' }: AppLogoProps) {
  const theme = useUiStore((s) => s.theme)

  const currentLogo =
    variant === 'glyph'
      ? logoGlyph
      : variant === 'on-dark' || theme === 'dark'
        ? logoDark
        : logoLight

  return <img src={currentLogo} alt={alt} className={className} />
}
