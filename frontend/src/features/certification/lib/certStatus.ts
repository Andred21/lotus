import type { EmissionPanelEnrollmentData } from '@shared/types/generated'

export type RowCertKind = 'sin_emitir' | 'emitido' | 'no_corresponde'

/** Que célula a linha do painel de emissão mostra na coluna Certificado:
 * já tem certificado emitido, está pendente de emissão (aprovado, sem
 * certificado ainda) ou não corresponde (reprovado/pendente — nunca vai
 * emitir enquanto o estado acadêmico não mudar).
 *
 * NÃO migrou para `display_status` junto com o resto: esta pergunta é sobre a
 * MATRÍCULA no painel de emissão, não sobre o estado de um certificado que
 * existe — outro DTO (`EmissionPanelEnrollmentData`) e outra pergunta.
 *
 * O `certStatus()` que morava aqui foi apagado, não movido: o estado derivado
 * agora vem do servidor em `display_status` (spec D4), porque duas
 * implementações de "vigente" num documento de peso legal são respostas
 * esperando para divergir. O mapa de severidade vive em
 * `shared/lib/certificateStatus.ts`. */
export function rowCertKind(e: EmissionPanelEnrollmentData): RowCertKind {
  if (e.certificate) return 'emitido'
  return e.approval_status === 'aprobado' ? 'sin_emitir' : 'no_corresponde'
}
