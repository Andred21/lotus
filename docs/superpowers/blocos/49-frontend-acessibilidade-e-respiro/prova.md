# Bloco 49 — prova no navegador

Data: 2026-11-02. Ambiente: stack da lane (offset +2): front em `:5175`, backend em `:8082`,
banco semeado (`migrate --seed`). Chromium do `playwright-cli`, logado como `admin@lotus.cl`, em
`es-CL` salvo onde dito. As medidas saem de `getBoundingClientRect` e `getComputedStyle` na página
viva. As capturas ficaram fora do repositório e são citadas pelo número.

## P-108 — cabeçalho do orçamento em 1024 (`/comercial/presupuestos/1`)

**Antes da correção (es-CL, 1024×768).**

| Peça | Retângulo (x, y) |
|---|---|
| RUT do cliente | 412–547, 225–243 |
| "Agregar cotización" | 530–745, 186–234 |

Os dois se sobrepõem. Em `en` não havia sobreposição: "Add quote" começa em 625. O defeito
dependia da largura dos rótulos em espanhol.

**Diagnóstico.** No `DetailHeader`, o bloco do título é `min-w-0 sm:flex-1`. O `flex-1` zera a
base, e as tags e as três ações são `shrink-0`. Em 1024 o bloco caía para 165 px, enquanto o
`IdentityCell` em linha do subtítulo (avatar, razão social e RUT `whitespace-nowrap`) mede 267 px.
O conteúdo vazava para baixo dos botões. A causa mora no `DetailHeader`, e a correção também.

**Correção.** A linha ganha `sm:flex-wrap` e o bloco do título ganha `sm:min-w-min`. Só o
`flex-wrap` não bastou: com a base zerada, a quebra nunca dispara. Testado ao vivo antes de editar.

**Depois** (as colunas trazem a largura do bloco do título, a altura da linha e as interseções
entre folhas de texto do bloco e os botões ou tags da linha):

| Tela | Largura | Bloco antes → depois | Linha antes → depois | Interseções antes → depois |
|---|---|---|---|---|
| Orçamento 1 | 1024 | 165 → 642 px | 88 → 136 px | 1 → 0 |
| Orçamento 1 | 1280 | 421 → 421 px | 80 → 80 px | 0 → 0 |
| Orçamento 1 | 768 | 85 → 562 px | 88 → 136 px | 1 → 0 |
| `TurmaDetailHeader` (turma 4) | 1024 | 567 → 567 px | 94 → 94 px | 0 → 0 |
| `TurmaDetailHeader` (turma 4) | 768 | 487 → 487 px | 94 → 94 px | 0 → 0 |
| `TurmaCreatePage` (cotação 7) | 1024 | 720 → 720 px | 48 → 48 px | 0 → 0 |
| `TurmaCreatePage` (cotação 7) | 768 | 640 → 640 px | 48 → 48 px | 0 → 0 |

O "antes" foi medido na mesma página, removendo do DOM as classes novas (`sm:min-w-min`,
`sm:flex-wrap` e `sm:ml-auto`). Nenhum outro consumidor muda. As linhas de 768 vieram da revisão
final do bloco: as de 390 que a prova trazia antes não exercitavam a mudança, porque as classes
`sm:` só valem a partir de 640 px. A 390 o resultado é idêntico por construção — a linha é coluna
e o `min-w-0` segue valendo, sem `min-w-min`, sem quebra e sem margem automática. Na turma 4 e na
criação pela cotação 7 não há ação no cabeçalho a deslocar, e a medida confirma que nada se move.
Captura 1: orçamento em 1024.

**Alinhamento das ações na quebra** (`sm:ml-auto` no slot `actions`, achado da revisão final).
Em 1024, com a tag na linha do título, as três ações descem para a linha 2. Medido nas ações
(esquerda–direita, topo; a linha do cabeçalho vai de 280 a 1000 px):

| Tela | Largura | Sem `sm:ml-auto` | Com `sm:ml-auto` |
|---|---|---|---|
| Orçamento 1 | 1024 | 280–750 px, y 254 (à esquerda) | 530–1000 px, y 254 (à direita) |
| Orçamento 1 | 768 | — | 274–744 px, y 254 (à direita; a linha vai até 744) |
| Orçamento 1 | 1280 | 786–1256 px, y 182–183 | 786–1256 px, y 182–183 (inalterado) |

A margem automática, sem quebra, recebe zero: em 1280 as ações ficam onde estavam, na mesma
linha do título. Captura fora do repositório: `orc-1024-depois.png` (orçamento em 1024, ações à direita).

## P-101 — RUT das matrículas a 390 (turma 4, aba Alumnos)

O RUT em mono mede 101 px. A célula é `border-box` com 16 px de padding de cada lado, então pede
133 px de caixa.

| Tabela | Largura | Célula antes → depois | Linhas do RUT | Cabe na célula | Wrapper |
|---|---|---|---|---|---|
| Ativa | 390 | 95 → 135 px | 1 | não → sim | rola, 640/276 px |
| Ativa | 1024 | 96 → 136 px | 1 | não → sim | 718/718 px |
| Arquivadas | 390 | 106 → 139 px | 1 | não → sim | rola, 504/276 px |
| Arquivadas | 1024 | 136 → 179 px | 1 | sim → sim | 718/718 px |

Com `identifierClass` o RUT já não quebrava, mas vazava para a coluna vizinha. `min-width` na
coluna não funciona, porque a tabela é `table-layout: fixed` (testado ao vivo). Por isso a fatia
da coluna sobe: `RUT_MATRICULA` com peso 14, local em `enrollmentColumns.ts`, e
`enrollmentColumns.test.ts` prende as fatias mínimas (133/640 e 133/504).

A 390, a única célula que cruza o RUT é a coluna de ações. Ela é `position: sticky` e flutua sobre
o conteúdo que rola, por desenho. Entre colunas de dado não há sobreposição. Para medir a lista
de arquivados, uma matrícula (id 36) foi arquivada no banco local da lane e restaurada em seguida
(HTTP 200). Captura 2: matrículas a 390.

## P-74 — botão `danger` preenchido no claro (diálogo de eliminar orçamento)

- Fundo `rgb(255, 135, 128)` = `#ff8780` (red-300). Tinta `rgb(102, 24, 20)` = `#661814` (red-900).
- Focado pelo Tab (`:focus-visible`), o anel é `rgb(102, 24, 20) 0 0 0 4px` sobre o halo branco de
  2 px, ou seja red-900. O "Cancelar" vizinho mantém o anel de marca.
- Captura 3: diálogo com o "Eliminar" focado.

## P-105 — `AppTag` danger no escuro

- Folha `lara-dark-lotus.css`. `--tone-danger-ink` resolve para `#ff8780` (= `--red-300`).
- A tag "Rechazada" (`p-tag-danger`) pinta `rgb(255, 135, 128)` sobre
  `color(srgb 0.25 0.1725 0.2261)`. A razão calculada é de cerca de 5,5:1, acima de 4,5.
- Captura 4: orçamento no escuro.

## P-109 — paginador (turma 3, aba Alumnos, 15 matrículas)

Árvore de acessibilidade (`playwright-cli snapshot`):

- es-CL: "Página anterior" (desabilitado), "Página 1", "Página 2", "Página siguiente".
- Trocando para EN pelo seletor de idioma, sem recarregar: "Previous page", "Page 1", "Page 2",
  "Next page".
- A página ativa mantém `aria-current="true"`.

## Gate

De `frontend/`, em `315a21e6`: `pnpm build` termina com exit 0 (o aviso de tamanho de chunk já
existia antes do bloco), `pnpm lint` passa limpo e `pnpm test` roda 224 arquivos e 1888 testes,
todos verdes.
