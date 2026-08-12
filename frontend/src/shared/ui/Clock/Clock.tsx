import { useTranslation } from 'react-i18next'
import { useClock } from '@shared/hooks/useClock'
import { formatDate, formatTime } from '@shared/lib'

/**
 * Relógio ao vivo (HH:MM + data) no idioma ativo. Presentational — o tick vive
 * no useClock e a formatação em shared/lib; aqui só renderiza.
 *
 * A cor NÃO se fixa aqui: o relógio herda de quem o posiciona. A mesma peça
 * serve superfície de tema e a barra navy fixa do shell, e um token de tema
 * cravado aqui pintaria cinza sobre a navy.
 */
export function Clock({ className = '' }: { className?: string }) {
  const now = useClock()

  // Inscrição no idioma, não tradução: `formatTime`/`formatDate` leem o idioma
  // ativo do i18n a cada render, e este componente não tem chave para traduzir.
  // Sem `useTranslation` ele não re-renderiza na troca de idioma e a data só
  // muda no reload. Isso funcionava por acaso até a UI-05: o Header tinha um
  // `t()` no título, e o re-render do pai arrastava o filho junto. Tirado o
  // título, caiu o empréstimo — e a inscrição passa a ser de quem depende
  // dela (D-P12).
  const { i18n } = useTranslation()

  return (
    <div
      lang={i18n.language}
      className={`text-right text-sm leading-tight tabular-nums ${className}`}
    >
      {/* `my-0`: o projeto não carrega o Preflight do Tailwind, então <p> ainda
        * traz a margem de 1em do user-agent — eram 42px de altura morta no
        * header (D-P13). */}
      <p className="my-0 font-semibold">{formatTime(now)}</p>
      <p className="my-0 opacity-75">{formatDate(now)}</p>
    </div>
  )
}
