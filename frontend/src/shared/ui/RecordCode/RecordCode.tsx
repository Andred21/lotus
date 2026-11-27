import type { ReactNode } from 'react'

/**
 * Código de registro — `Scap 100` do presupuesto, `Scap 2 - R1` da cotización,
 * `C-7` do curso. É a grafia da coluna Código da tabela de presupuestos, que o
 * João fixou como a de todo código de registro (bloco 60, 2026-11-23): no corpo
 * da tabela, na cor primária do tema e, desde o bloco 65 (B-8), em 600 — o mesmo
 * peso da tag.
 *
 * Não é o `identifierClass`: RUT e folio seguem mono. O código de registro é o
 * nome curto do documento na conversa com a Lotus, e a cor o destaca na linha.
 */
export function RecordCode({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={`font-semibold text-sm ${className ?? ''}`} style={{ color: 'var(--primary-color)' }}>
      {children}
    </span>
  )
}
