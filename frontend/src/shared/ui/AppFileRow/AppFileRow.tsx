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
    <div className="flex flex-wrap items-center gap-3">
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
        style={{ background: `color-mix(in srgb, ${hue} 12%, var(--surface-card))`, color: hue }}
      >
        <i className={icon} aria-hidden="true" />
      </span>
      {/* `min-w-0 flex-1` é o que mantém o truncamento funcionando ANTES da
          quebra — sem ele o nome volta a empurrar a linha inteira, e o `title`
          (a leitura completa, desde 2026-08-16) deixa de ser o único recurso. */}
      <div className="min-w-0 flex-1">
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
