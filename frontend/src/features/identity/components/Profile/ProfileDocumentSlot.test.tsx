import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import i18n from '@shared/config/i18n'
import { formatDate } from '@shared/lib'
import type { RedatorProfileDocumentData } from '@shared/types/generated'
import { ProfileDocumentSlot } from './ProfileDocumentSlot'

// O `t` devolve a chave, mas ECOA a interpolação: sem isso a data formatada —
// que é o que o UI-01 mede — não chegaria ao DOM em teste nenhum.
vi.mock('react-i18next', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-i18next')>()),
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts?.date === undefined ? key : `${key}:${String(opts.date)}`,
  }),
}))

// O idioma da INTERFACE, não o do runtime: em jsdom o detector resolve pelo
// `navigator.language` (en-US), e é justamente a divergência entre os dois que
// o UI-01 relatou. Pinado aqui, a guarda vale com qualquer TZ da máquina.
beforeAll(async () => {
  await i18n.changeLanguage('es-CL')
})

afterEach(cleanup)

function doc(over: Partial<RedatorProfileDocumentData> = {}): RedatorProfileDocumentData {
  return {
    type: 'CV',
    status: 'vigente',
    self_service: true,
    valid_until: null,
    original_name: 'cv.pdf',
    size: 1024,
    created_at: '2026-08-01T10:00:00Z',
    download_url: 'https://minio/cv.pdf',
    ...over,
  }
}

function montar(over: Partial<RedatorProfileDocumentData> = {}) {
  return render(
    <ProfileDocumentSlot
      doc={doc(over)}
      uploading={false}
      onUpload={() => {}}
      onSizeReject={() => {}}
      onPreview={() => {}}
    />,
  )
}

describe('ProfileDocumentSlot', () => {
  it('exibe o status do BACKEND, sem recalcular por valid_until', () => {
    montar({ status: 'vence_em_breve', valid_until: '2099-01-01' })

    expect(screen.getByText('profile.docStatus.vence_em_breve')).toBeTruthy()
  })

  it('slot ausente oferece ENVIO, e o que ja tem documento oferece SUBSTITUIR', () => {
    const { unmount } = montar({
      status: 'ausente',
      original_name: null,
      download_url: null,
      size: null,
    })

    expect(screen.getByText('profile.docStatus.ausente')).toBeTruthy()
    expect(screen.getByText('profile.documents.send')).toBeTruthy()
    expect(screen.queryByText('profile.documents.replace')).toBeNull()
    expect(screen.queryByText('profile.documents.managedByAdmin')).toBeNull()
    unmount()

    // O rótulo é o único aviso de que substituir apaga o anterior.
    montar()
    expect(screen.getByText('profile.documents.replace')).toBeTruthy()
  })

  it('formata a validade no idioma da interface, sem voltar um dia (UI-01)', () => {
    montar({ valid_until: '2028-08-10' })

    // `new Date(2028, 7, 10)` é a MEIA-NOITE LOCAL de 10/08 — o mesmo instante
    // que a âncora `T00:00:00` produz. Um `new Date('2028-08-10')` cru cai em
    // meia-noite UTC e reprova aqui em todo fuso a oeste de Greenwich, que é o
    // do cliente.
    expect(screen.getByText(/profile\.documents\.validUntil/).textContent).toBe(
      `profile.documents.validUntil:${formatDate(new Date(2028, 7, 10))}`,
    )
  })

  it('sem self_service NAO ha envio, e a gestao e nomeada', () => {
    montar({ type: 'REUF', self_service: false, status: 'vigente' })

    expect(screen.getByText('profile.documents.managedByAdmin')).toBeTruthy()
    expect(document.querySelector('input[type="file"]')).toBeNull()
  })
  it('a validade sobe para a linha do STATUS, que e derivado dela', () => {
    // D-21: `Vence el 10-08-2028` saia text-xs secundario como ULTIMA linha do
    // slot, abaixo da nota administrativa, enquanto o `Vigente` -- que o backend
    // calcula A PARTIR dessa data -- era a pilula do topo. Enquanto o status e
    // `vigente` isso nao custa nada; quando vira `vence_em_breve`, a data e o
    // texto mais dificil de ler do cartao.
    montar({ valid_until: '2028-08-10', status: 'vence_em_breve' })

    const status = screen.getByText('profile.docStatus.vence_em_breve')
    const validade = screen.getByText(/profile\.documents\.validUntil/)

    // Mesma linha: o status e a validade compartilham o conteiner.
    expect(status.closest('div')).toBe(validade.closest('div'))
  })

  it('o caso SEM validade nao imprime linha nenhuma', () => {
    // Tres dos quatro slots tem valid_until null e imprimiam
    // `Sin fecha de vencimiento` -- uma linha que so diz que nao ha informacao,
    // e que e ela quem rebaixou a que importa. A chave `documents.noValidity`
    // foi APAGADA dos 3 locales na D-31 (2026-08-18) por nao ter consumidor; a
    // assercao segue valendo porque o `t` mockado devolve a chave (nao depende
    // do dicionario) -- e continua guardando a decisao de nao imprimir a linha.
    montar({ valid_until: null })

    expect(screen.queryByText(/profile\.documents\.noValidity/)).toBeNull()
  })

  it('o upload vem ANTES do par Ver/Descargar, para o par ancorar sempre igual', () => {
    // D-22: `Ver` ficava em x=1132 nos slots com tres acoes e x=1275 no que tem
    // duas -- 143px entre linhas equivalentes separadas por 16px. Reservar
    // largura falharia com o idioma (o rotulo do upload e texto traduzido); com
    // o upload ANTES, o par de icones -- largura constante em qualquer locale --
    // vira o fim do grupo e ancora na mesma borda nos quatro slots.
    const { container } = montar()

    const acoes = Array.from(
      container.querySelectorAll('.p-fileupload-choose, button[aria-label]'),
    )
    const indiceUpload = acoes.findIndex((el) => el.className.includes('p-fileupload-choose'))
    const indiceVer = acoes.findIndex((el) => el.getAttribute('aria-label') === 'common.preview')

    expect(indiceUpload).toBeGreaterThanOrEqual(0)
    expect(indiceVer).toBeGreaterThan(indiceUpload)
  })

  it('o nome acessivel do upload diz de QUAL documento se trata', () => {
    // Tres slots repetem "Reemplazar" (D-23).
    montar()

    expect(
      screen.getByRole('button', { name: /profile\.documents\.replaceNamed/ }),
    ).toBeTruthy()
  })
})
