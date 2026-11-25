import { fieldLabelClass, technicalDataClass } from '../typography'

export interface CertificateFolioProps {
  /** Legenda acima do folio, já traduzida por quem compõe. */
  label: string
  folio: string
}

/**
 * O folio tratado como ARTEFATO — a assinatura que o ADR-16 elegeu e que nunca
 * havia sido executada (achado D4 do audit de 2026-08-26).
 *
 * Mono e tabular porque é dado técnico: quem valida está com o papel impresso
 * na mão e compara caractere a caractere. O `tracking` aberto é o que separa
 * os grupos do código sem inventar separador que o backend não emite.
 *
 * O degrau (20px, tracking 0.1em) é ponto de partida DECLARADO, não medição:
 * a run de `/lotus-ui-review` pode movê-lo com screenshot, e mais que isso
 * volta para decisão do João — é o código de um documento com peso legal. O
 * único consumidor é o diálogo de emissão; a validação pública mora no site
 * desde o bloco 63.
 *
 * A legenda é rótulo de CAMPO, não heading: o bloco não encabeça grupo nenhum
 * (spec D5). Mas rótulo de campo pede o PAR `dt`/`dd`, e ele se perdeu quando o
 * folio saiu de um `<dl>` maior para virar assinatura própria (Q-4 do
 * review de 2026-08-29): sem o par, o leitor de tela lê duas caixas soltas e a
 * legenda deixa de nomear o código. A peça carrega o próprio `<dl>` para o par
 * viajar com ela — no diálogo de emissão não há lista de definição nenhuma.
 */
export function CertificateFolio({ label, folio }: CertificateFolioProps) {
  const grafia = `${technicalDataClass} text-xl tracking-[0.1em]`

  return (
    <dl className="flex flex-col items-center gap-1 text-center">
      <dt className={fieldLabelClass} style={{ color: 'var(--text-color-secondary)' }}>
        {label}
      </dt>
      <dd className={grafia} style={{ color: 'var(--text-color)' }}>{folio}</dd>
    </dl>
  )
}
