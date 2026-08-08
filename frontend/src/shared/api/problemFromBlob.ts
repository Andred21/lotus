import type { ProblemDetails } from '@shared/api/axios'

/** Com `responseType: 'blob'` o corpo de erro também chega como Blob, então o
 * interceptor do axios rejeita o próprio Blob no lugar do envelope RFC 7807 —
 * por isso o corpo é lido e reparseado aqui (D10). Compartilhado entre os
 * pontos que baixam arquivo (`useTurmaManual`, `useCertificatePdf`) para não
 * duplicar o parse (D-P4). */
export async function problemFromBlob(error: unknown): Promise<ProblemDetails> {
  if (error instanceof Blob) {
    try {
      return JSON.parse(await error.text()) as ProblemDetails
    } catch {
      // corpo não-JSON (HTML de erro, proxy truncado): o Blob é só o corpo da
      // resposta, não carrega status HTTP algum, então monta-se aqui um
      // envelope sintético legível — sem isso `useMutationErrors` recebe o
      // Blob crú, não acha `.detail` nem `.errors`, e a mensagem some para o
      // usuário (o botão só para de carregar, sem feedback nenhum).
      return {
        type: 'https://lotus.cl/errors/unknown',
        title: 'Erro inesperado',
        status: 0,
        detail: 'Não foi possível processar a resposta do servidor.',
        instance: '',
      }
    }
  }
  return error as ProblemDetails
}
