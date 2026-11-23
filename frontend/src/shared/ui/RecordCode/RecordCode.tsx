import type { ReactNode } from 'react'

/**
 * Código de registro — `Scap 100` do presupuesto, `Scap 2 - R1` da cotización,
 * `C-7` do curso. É a grafia da coluna Código da tabela de presupuestos, que o
 * João fixou como a de todo código de registro (bloco 60, 2026-11-23): negrito,
 * no corpo da tabela, na cor primária do tema.
 *
 * Não é o `identifierClass`: RUT e folio seguem mono. O código de registro é o
 * nome curto do documento na conversa com a Lotus, e a cor o destaca na linha.
 */
export function RecordCode({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={`font-bold text-sm ${className ?? ''}`} style={{ color: 'var(--primary-color)' }}>
      {children}
    </span>
  )
}
