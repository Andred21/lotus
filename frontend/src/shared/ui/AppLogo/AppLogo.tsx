import { useUiStore } from '@shared/stores/uiStore'
import logoLight from '@/assets/LogoLight.png'
import logoDark from '@/assets/LogoDark.png'
import logoGlyph from '@/assets/LogoGlyph.png'

/** Dimensões intrínsecas de cada PNG (D-10): reservam a caixa antes de o
 * arquivo chegar. O projeto NÃO tem Preflight, então nada zera o `height` do
 * atributo: quem passa só a largura leva o logo esticado. Todo call site
 * resolve a altura no `className` (`h-*`; `h-auto` quando só a largura manda),
 * e `tests/jsx-ratchets.test.ts` cobra isso. `tests/logo-dimensoes.test.ts`
 * confere os números contra o cabeçalho do PNG. */
const LOGOS = {
  light: { src: logoLight, width: 335, height: 466 },
  dark: { src: logoDark, width: 335, height: 466 },
  glyph: { src: logoGlyph, width: 224, height: 274 },
}

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

  const { src, width, height } =
    variant === 'glyph'
      ? LOGOS.glyph
      : variant === 'on-dark' || theme === 'dark'
        ? LOGOS.dark
        : LOGOS.light

  return <img src={src} width={width} height={height} alt={alt} className={className} />
}
