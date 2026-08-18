import type { ReactNode } from 'react'
import { formatFileSize } from '@shared/lib/upload'
import { formatDate } from '@shared/lib'

/** Ícone e cor por tipo. Decide por mime (spec D7); extensão é fallback quando
 * o mime é null. Cor por palette var do Lara, composta com --surface-card no
 * fundo para funcionar nos dois temas (os palette vars não invertem). */
function fileIcon(mime: string | null | undefined, name: string): { icon: string; hue: string } {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  const is = (m: string, ...exts: string[]) => mime === m || (!mime && exts.includes(ext))

  if (mime?.startsWith('image/') || (!mime && ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext))) {
    return { icon: 'pi pi-image', hue: 'var(--blue-500)' }
  }
  if (is('application/pdf', 'pdf')) return { icon: 'pi pi-file-pdf', hue: 'var(--red-500)' }
  if (
    mime?.includes('spreadsheet') || mime === 'text/csv' ||
    (!mime && ['xlsx', 'xls', 'csv'].includes(ext))
  ) {
    return { icon: 'pi pi-file-excel', hue: 'var(--green-500)' }
  }
  if (mime?.includes('word') || (!mime && ['doc', 'docx'].includes(ext))) {
    return { icon: 'pi pi-file-word', hue: 'var(--indigo-500)' }
  }
  return { icon: 'pi pi-file', hue: 'var(--text-color-secondary)' }
}

export type AppFileRowProps = {
  name: string
  mime?: string | null
  size?: number
  createdAt?: string | null
  /** Botões da linha (ver, baixar, excluir). O chamador decide quais existem. */
  actions?: ReactNode
}

/** Linha de arquivo compartilhada pelos consumidores de `files`: comercial,
 * turma e redator. Absorve o ícone e a formatação que viviam em três cópias
 * divergentes (spec D8). A ESTRUTURA de cada tela continua com a tela. */
export function AppFileRow({ name, mime, size, createdAt, actions }: AppFileRowProps) {
  const { icon, hue } = fileIcon(mime, name)
  // `toLocaleDateString()` sem locale cai no idioma do NAVEGADOR: a interface em
  // es-CL exibia a data em en-US (D-18). O `formatDate` resolve pelo idioma
  // ativo, num lugar só. `created_at` é data-hora completa e não carrega o
  // problema de fuso do `valid_until` só-data — ali a âncora `T00:00:00`
  // continua sendo o mecanismo certo, no `ProfileDocumentSlot`.
  const meta = [
    createdAt ? formatDate(new Date(createdAt)) : null,
    size !== undefined ? formatFileSize(size) : null,
  ].filter(Boolean).join(' · ')

  return (
    // `flex-wrap`: em 390px o cartão do CV media `clientWidth` 227 contra
    // `scrollWidth` 311, o rótulo saía cortado em "Reem" e o NOME do arquivo
    // ficava com largura 0 (D-19, único C do review de 2026-08-17). A quebra é
    // dirigida pelo CONTÊINER e não por breakpoint de viewport: este componente
    // serve quatro larguras diferentes na MESMA viewport — comercial, turma,
    // redator e perfil —, e um breakpoint acertaria uma e erraria três. O
    // contra-exemplo que isolou a causa é o REUF: sem botão de upload, ele mede
    // `scrollWidth` = `clientWidth` e não vaza.
    // `justify-end` é da LINHA e vale só depois que ela quebra: enquanto tudo
    // cabe numa linha, o bloco de nome é `flex-1` e come a folga inteira, então
    // não há espaço para distribuir e nada se mexe (medido: em 1440px os quatro
    // slots do perfil mantêm nome de 413/556px e `Ver` em x=1290 com e sem a
    // classe). Quando o grupo de ações desce, ele passa a ser o único item da
    // segunda linha, e sem isto ancorava à ESQUERDA: em 390px o slot do REUF
    // punha `Ver` em x=122 enquanto os outros dois, que ainda cabiam ao lado,
    // ficavam em x=248 — a coluna de ação deixava de ser uma coluna, que é
    // justamente o que a D-22 mediu em 1440px (x=1132 contra x=1275). Com a
    // âncora à direita os três voltam a x=248.
    <div className="flex flex-wrap items-center justify-end gap-3">
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
        style={{ background: `color-mix(in srgb, ${hue} 12%, var(--surface-card))`, color: hue }}
      >
        <i className={icon} aria-hidden="true" />
      </span>
      {/* `min-w-0 flex-1` é o que mantém o truncamento funcionando ANTES da
          quebra — sem ele o nome volta a empurrar a linha inteira, e o `title`
          (a leitura completa, desde 2026-08-16) deixa de ser o único recurso.

          `basis-40` é o que DECIDE a quebra, e ele foi medido no gate do BD-16:
          sem base, `min-w-0` deixa o nome encolher sem limite, então o grupo de
          ações nunca quebra e o nome é que paga. O REUF do perfil em 390px
          media 66px de nome ("reuf-jua…") com a data partida em TRÊS linhas —
          `clientWidth` = `scrollWidth`, sem vazar, e ainda assim ilegível: ele
          é o slot sem botão de upload, e era justamente o contra-exemplo que a
          primeira metade da D-19 usou para se declarar resolvida. Com a base de
          10rem o mesmo slot mede 178px, o nome cabe inteiro, a data volta a uma
          linha e o par de ícones desce. Onde sobra espaço nada muda: a base é
          menor que a linha e o grupo continua ao lado. */}
      <div className="min-w-0 flex-1 basis-40">
        <p className="truncate text-sm font-medium" title={name}>{name}</p>
        {meta && (
          <p className="font-mono text-xs" style={{ color: 'var(--text-color-secondary)' }}>{meta}</p>
        )}
      </div>
      {/* O grupo de ações quebra POR DENTRO, e ancora à direita. A quebra da
          linha acima resolveu metade da D-19: o nome voltou a caber inteiro,
          mas o grupo de três ações do perfil mede 243px (`Reemplazar` 139 + dois
          ícones de 48, gaps de 4) contra os 226px de conteúdo do slot em 390px —
          a barra lateral recolhida come 80px da viewport antes de a página
          começar. O slot media `clientWidth` 242 contra `scrollWidth` 251 e os
          botões vazavam 9px além da própria borda.
          `justify-end` é inerte quando tudo cabe numa linha — o grupo é
          `shrink-0` e não sobra espaço para distribuir —, então as três outras
          telas que consomem esta linha não se mexem. */}
      {actions && (
        <div className="flex max-w-full shrink-0 flex-wrap items-center justify-end gap-1">
          {actions}
        </div>
      )}
    </div>
  )
}
