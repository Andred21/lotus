import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ProblemDetails } from '@shared/api/axios'
import { CertificateViewDialog } from './CertificateViewDialog'

/**
 * O outro lado da D-05: esta é a UNICA tela que imprime o `detail` cru do
 * servidor. Sem este caso, trocar a linha por `screenDetail` passaria verde e a
 * D8 morreria em silêncio — o suporte perderia o único lugar onde descobre QUAL
 * campo do snapshot está vazio. O par deste caso vive em
 * `ValidationPage.test.tsx`, que prova que a rota pública NÃO imprime.
 *
 * `t` devolve a própria chave; o texto traduzido é assunto do `parity.test.ts`.
 */
vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation(),
  }
})

const CORROMPIDO: ProblemDetails = {
  type: 'https://lotus.cl/errors/server',
  title: 'Erro interno',
  status: 500,
  detail:
    'El certificado LOT-2026-1001 no puede presentarse: su documento congelado no tiene los campos aluno.name, curso.name.',
  instance: '/api/certificates/1',
}

function renderizarComErro(error: ProblemDetails) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <CertificateViewDialog
        certificateId={1}
        certificate={null}
        loading={false}
        error={error}
        onRetry={() => {}}
        onHide={() => {}}
      />
    </QueryClientProvider>,
  )
}

describe('CertificateViewDialog é a exceção da D-05', () => {
  it('a excecao D8: o dialogo do suporte IMPRIME os campos que faltam', () => {
    renderizarComErro(CORROMPIDO)

    expect(screen.getByText(/aluno\.name/)).toBeTruthy()
  })
})
