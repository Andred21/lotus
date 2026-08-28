import { fieldLabelClass } from '../typography'

export interface CertificateFolioProps {
  /** Legenda acima do folio, já traduzida por quem compõe. */
  label: string
  folio: string
  /** `page`: a faixa da validação pública. `dialog`: o mesmo desenho um degrau
   * abaixo, dentro do diálogo de emissão. */
  size: 'page' | 'dialog'
}

/**
 * O folio tratado como ARTEFATO — a assinatura que o ADR-16 elegeu e que nunca
 * havia sido executada (achado D4 do audit de 2026-08-26).
 *
 * Mono e tabular porque é dado técnico: quem valida está com o papel impresso
 * na mão e compara caractere a caractere. O `tracking` aberto é o que separa
 * os grupos do código sem inventar separador que o backend não emite.
 *
 * Os dois degraus são ponto de partida DECLARADO, não medição: a run de
 * `/lotus-ui-review` pode mover um degrau em cada eixo com screenshot, e mais
 * que isso volta para decisão do João — é a tela pública de um documento com
 * peso legal (spec §4.3).
 *
 * A legenda é rótulo de CAMPO, não heading: o bloco não encabeça grupo nenhum
 * (spec D5).
 */
export function CertificateFolio({ label, folio, size }: CertificateFolioProps) {
  const grafia =
    size === 'page'
      ? 'font-mono tabular-nums text-3xl tracking-[0.15em]'
      : 'font-mono tabular-nums text-xl tracking-[0.1em]'

  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <span className={fieldLabelClass} style={{ color: 'var(--text-color-secondary)' }}>
        {label}
      </span>
      <span className={grafia} style={{ color: 'var(--text-color)' }}>{folio}</span>
    </div>
  )
}
