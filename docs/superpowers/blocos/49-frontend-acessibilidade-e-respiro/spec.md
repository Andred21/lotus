# Bloco 49 — Acessibilidade e respiro do frontend (spec)

**Classificação:** bounded (seis pendências conhecidas, sem peça nova, sem backend).
**Data:** 2026-11-02. **Fonte:** ficha 49 do `backlog.md` — `P-74`, `P-101`, `P-105`, `P-108`,
`P-109` (`pendencias/abertas.md`) e `D-71` (`backlog.md`, "Agrupados em bloco"). Esta spec registra o
que o João decidiu no brainstorming de 2026-11-02 e marca o que ficou com o construtor.

## 1. Por que

São seis defeitos pequenos que um leitor de tela, um auditor de contraste ou um usuário em
notebook ou celular já encontra hoje. O mais visível é o "Eliminar" vermelho dos diálogos
irreversíveis, a 3,76:1 no tema claro. Nenhum deles tinha hospedeiro: a ficha os juntou porque
cada um é pequeno demais para um bloco próprio.

Sucesso: o João abre o diálogo de eliminar no tema claro e lê o botão sem esforço. O leitor de tela
anuncia o paginador em espanhol. Os rótulos de permissão leem como produto, não como
especificação. O RUT fica inteiro em 1024 e em 390.

Fracasso, mesmo com o teste verde: a correção do botão mexer na cor de erro de input, em tag, badge
ou mensagem; o `danger` perder o sinal de perigo; ou um ajuste de layout num `DetailHeader`
compartilhado quebrar outra tela de detalhe.

## 2. Objetivos

| # | Pendência | Onde mora |
|---|---|---|
| O1 | P-74 — botão filled das severidades no claro | `frontend/scripts/generate-brand-theme.mjs` → `lara-light-lotus.css` (regerado) |
| O2 | P-105 — tinta `danger` do escuro sobre o fundo de 15% | `frontend/src/shared/styles/brand-theme.css` (`--tone-danger-ink` do `:root`) |
| O3 | Régua das cinco severidades | `frontend/tests/tone-ink.test.ts` |
| O4 | P-109 — paginador em es-CL | `shared/ui/AppDataTable`, as 3 locales |
| O5 | D-71 — rótulos `perm.*` | `frontend/src/shared/config/locales/{es-CL,pt-BR,en}.json` |
| O6 | P-101 — RUT a 390 px | `EnrollmentTable.tsx`, `ArchivedEnrollmentsList.tsx` |
| O7 | P-108 — RUT sob o "Agregar cotización" em 1024 | cabeçalho do detalhe do orçamento (`BudgetDetailPage` / `DetailHeader`) |

## 3. Não-objetivos e anti-objetivos

- O botão filled do **tema escuro** não muda. O Lara já pinta letra escura sobre fundo claro, e
  tudo passa, medido em 2026-11-02 sobre o stock (base / hover / active):
  success 8,55 / 10,62 / 12,30, info 6,48 / 8,32 / 10,46, danger 5,84 / 8,51 / 11,16,
  help 5,68 / 8,48 / 11,02. O anel do `:enabled:focus` (4px, veladura de 70%) mede contra o ground
  `#0b1220` e contra o card `#1e293b`: success 5,74 / 4,88, info 4,83 / 4,13, help 4,04 / 3,46,
  danger 3,85 / 3,26. O anel de 1px do `:not(:disabled):focus` mede ≥ 7,18 nos dois. Ali o bloco só
  mede: se um regerar futuro reprovar, quem acusa é o teste, e a correção é de outro bloco.
  *Decisão do construtor da spec, não do João.*
- O `warning` não muda: a P-30 o deixou certo nos dois temas.
- `outlined`/`text` das severidades, `AppTag`, badge, mensagem, `p-error` e borda de input inválido
  **não mudam** em O1. O `#ef4444` e os demais hex de stock aparecem nesses blocos também.
- Sem backend, schema, DTO ou `generated.ts`.
- O redesenho do diálogo de Roles é do item 9. Aqui só a string muda; nenhuma chave muda.
- **Anti-objetivo:** a correção de contraste alcançar um bloco CSS que não é botão filled de
  severidade.

## 4. Desenho decidido

### 4.1 P-74 — opção A, decidida pelo João sobre maquete

No **tema claro**, os botões filled de `success`, `info`, `danger` e `help` passam para o molde
da P-30: fundo claro da rampa da Lotus e letra no degrau 900 da mesma família. A regra é uma só para
as quatro:

| Estado | Fundo | Tinta |
|---|---|---|
| base | `--<hue>-300` | `--<hue>-900` |
| hover | `--<hue>-200` | `--<hue>-900` |
| active | `--<hue>-100` | `--<hue>-900` |

Os hues são `green` (success), `blue` (info), `red` (danger) e `purple` (help), e a rampa é a
publicada em `lara-light-lotus.css`. Medido em 2026-11-02 (base / hover / active):

| Severidade | Razão |
|---|---|
| success | 5,72 / 6,71 / 7,89 |
| info | 8,02 / 9,84 / 11,40 |
| danger | 5,29 / 6,87 / 8,89 |
| help | 5,60 / 7,33 / 9,43 |

O "Eliminar" fica vermelho-salmão (`#ff8780`) com letra `#661814`. O João viu e escolheu esse
resultado entre três opções; as outras duas eram o degrau mais saturado que passa por família e o
fundo 500 com letra quase preta.

- **Os estados sobem a rampa**, como na P-30: no hover e no active o fundo clareia, porque a tinta
  é escura.
- **Anel de foco.** Ele entra junto, nas duas regras de `:focus` que o Lara declara
  (`:not(:disabled):focus` e `:enabled:focus`). Vai para `--<hue>-900`, o degrau da tinta, como na
  P-30. Medido contra a página branca e contra o ground `#f1f5f9`: success 9,70 / 8,85, info
  12,95 / 11,82, danger 12,31 / 11,24, help 12,75 / 11,63. Entre o preenchimento e o anel o Lara
  põe um separador branco de 2px, então o vizinho que o anel precisa separar (WCAG 1.4.11) é a
  superfície, como o teste da P-30 já mede. *Decisão do construtor da spec; o João não viu o anel.*
- **Mora no gerador**, não numa folha à mão. O `lara-light-lotus.css` é saída do
  `generate-brand-theme.mjs`, e a P-30 já tem a receita (`WARNING_CLARO` + `warningAmarelo`). O
  gate é o **seletor** do botão filled daquela severidade, não o hex. Os hex de stock dessas
  famílias aparecem em blocos fora do botão (§3), e a P-30 só se safou com gate por hex porque o
  laranja quase não aparecia fora do warning.
- **O gate, exatamente** (*decisão do construtor da spec*): entra o bloco em que **todo** seletor
  da lista separada por vírgula contém `p-button-<sev>` e **nenhum** contém `p-button-outlined`,
  `p-button-text` ou `p-button-link`. O Lara agrupa o filled com os irmãos que herdam a mesma
  pintura (`.p-button-group.p-button-<sev> > .p-button`, `.p-splitbutton.p-button-<sev> > .p-button`,
  `.p-fileupload-choose.p-button-<sev>`), e eles seguem o botão. Se um bloco misturar filled e
  outlined na mesma lista, o gerador falha alto em vez de adivinhar. O `:disabled` não muda: o Lara
  o trata por opacidade. O critério 2 de §5 (diff só nesses blocos) é o guarda do gate.
- **O "Eliminar" herda o filled.** O `ConfirmDialog` passa `severity` ao `AppButton` sem variant
  (`shared/ui/ConfirmDialog/ConfirmDialog.tsx:63-64`), e o mesmo vale para o `ArchiveConfirmDialog`,
  o `RevokeDialog` e o `RemoveEnrollmentDialog`. A correção do tema chega até eles sem tocar em
  componente.
- `.p-button-<sev>.p-button-outlined`/`.p-button-text` ficam como estão. O `danger` já tem tinta
  própria na camada de marca (UI-02), e os outros três não foram medidos como defeito.

### 4.2 P-105 — a tinta `danger` do escuro sobe um degrau

`--tone-danger-ink` no `:root` de `brand-theme.css` vai de `var(--red-400)` para `var(--red-300)`
(`#ff8780`), o caminho que a própria ficha nomeia. O efeito alcança o `AppTag` danger, o
outlined/text `danger` e as tintas `dangerText` do `tokens.ts` no escuro, e só clareia, então
nenhum contraste que hoje passa pode cair. O `tone-ink.test.ts` confirma isso.

### 4.3 A régua (O3)

O `tone-ink.test.ts` ganha um `describe` que cobre **as cinco severidades**: success, info,
warning, danger e help. Os estados são base, hover, active e o anel de foco, nos **dois** temas, e
nenhum par é pulado. Ele mede duas coisas, como a P-30:

- **a razão:** filled ≥ 4,5:1 em cada estado; anel ≥ 3:1 contra a superfície onde pousa (página e
  ground, composta a veladura quando houver alfa, como o `solido` do teste da P-30);
- **a amarração no claro:** o fundo de cada estado e a tinta são exatamente os degraus da tabela
  de §4.1, lidos da própria folha com `hex(folha, '--<hue>-N')`, como a P-30 faz. Nada de tabela
  fixa de hex no teste: a rampa é a fonte. A razão sozinha passa com qualquer degrau que meça bem,
  e a regra decidida é a A.

O filtro do par `danger` + escuro no teste de 15% sai, porque a P-105 foi paga. O `describe` da P-30
pode ser absorvido pelo novo ou continuar ao lado dele, a critério do construtor, desde que nenhuma
asserção dele se perca. O controle negativo também entra: a tinta branca de stock sobre o fundo de
stock reprova nas quatro severidades.

### 4.4 P-109 — paginador

O `AppDataTable` dá nome acessível em es-CL (e nas outras duas locales) aos botões de página
anterior, página seguinte e a cada botão de número. O molde é o do `AppTabView`: chave nossa nas
três locales, passada pelo `pt` **depois** do `pt` do chamador (o piso de acessibilidade não se
desliga). Não chamar `locale()` global do PrimeReact; o projeto não chama, e o motivo está no
docblock do `AppTabView`. O template hoje é `PrevPageLink PageLinks NextPageLink`, e só esses
controles precisam de nome.

### 4.5 D-71 — rótulos de permissão, decididos pelo João

Sai de cada rótulo a referência interna: `Flujo N` / `Fluxo N` / `Flow N`, `RN-02` e `soft delete`.
**O resto do parêntese fica**, porque o João decidiu manter todos. O verbo de
`identity_user_delete` passa a ser o da interface, "Archivar". Em es-CL:

| Chave | Hoje | Depois |
|---|---|---|
| `identity_user_delete` | Eliminar (soft delete) usuarios | Archivar usuarios |
| `commercial_quote_approve` | Aprobar cotización con aceptación del cliente (Flujo 2 — solo superadmin) | Aprobar cotización con aceptación del cliente (solo superadmin) |
| `operation_enrollment_manage` | Matricular alumnos / importar planilla (Flujo 3) | Matricular alumnos / importar planilla |
| `operation_enrollment_record_result` | Registrar nota y asistencia de la matrícula (RN-02 — acción del redactor) | Registrar nota y asistencia de la matrícula (acción del redactor) |
| `operation_turma_assign_redator` | Asignar redactor idóneo al grupo (Flujo 3) | Asignar redactor idóneo al grupo |
| `operation_turma_complete` | Confirmar finalización del grupo (Flujo 4 — admin confirma) | Confirmar finalización del grupo (admin confirma) |
| `operation_turma_submit_docs` | Subir documentación del grupo (Flujo 1/4 — acción del redactor) | Subir documentación del grupo (acción del redactor) |
| `certification_certificate_issue` | Emitir certificado (Flujo 5) | Emitir certificado |
| `certification_certificate_revoke` | Revocar certificado (Flujo 6 — sensible, peso legal) | Revocar certificado (sensible, peso legal) |

Em pt-BR e en a mesma operação vale sobre o texto que já está lá: "Arquivar usuários" e "Archive
users"; os parênteses restantes ficam traduzidos como estão. A linha 372 de cada locale
("Flujo comercial y operativo") **não** é `perm.*` e fica fora.

**Mecanismo:** um teste (vitest) varre as chaves `perm.*` das três locales e reprova
`/Flujo|Fluxo|Flow|RN-\d|soft delete/`. A DoD da ficha vira catraca, não grep de fechamento.

### 4.6 P-101 — RUT a 390 px

A coluna RUT das duas tabelas deixa de ser `field="rut"` cru e ganha `body` com `identifierClass`,
como `StudentsTable` e `ImportTriageTable` já fazem. Se a largura da coluna (`largura.rut`) não
couber o RUT em mono sem quebrar, ela se ajusta. A ficha mede cerca de 133 px necessários. As
larguras são locais de cada tabela (`enrollmentWidths` e `archivedEnrollmentWidths`), então mexer
nelas não alcança outra tela. Com
`whitespace-nowrap`, a quebra no hífen deixa de ser possível em qualquer largura; o que sobrar vira
rolagem dentro do wrapper, que já existe.

### 4.7 P-108 — cabeçalho do detalhe do orçamento em 1024

Em 1024×768 o RUT do cliente fica sob o "Agregar cotización". O subtítulo já usa
`identifierClass`, então a causa é o layout do cabeçalho, não a quebra do RUT. Fica com o
construtor achar a causa medindo no navegador e escolher onde corrigir:

- se a causa está no `DetailHeader` (por exemplo, ações sem `flex-wrap` ou subtítulo sem
  `min-w-0`), a correção mora lá. Nesse caso, mede também os outros consumidores do
  `DetailHeader` em 1024 e 390, para nenhuma tela regredir;
- se é próprio do orçamento (três ações largas), corrige lá.

## 5. Critério de aceite

1. `tone-ink.test.ts` cobre as cinco severidades × base/hover/active/foco × claro/escuro, sem par
   pulado e sem o filtro da P-105, e amarra os degraus da §4.1 no claro.
2. O `lara-light-lotus.css` regerado só difere do atual em blocos `.p-button.p-button-{success,info,
   danger,help}` filled e seus estados. O diff é a prova, e o construtor a declara no PR.
3. Nenhum rótulo `perm.*` casa `/Flujo|Fluxo|Flow|RN-\d|soft delete/` nas três locales, sob teste.
4. O paginador anuncia em es-CL anterior, seguinte e "Página N", com o teste do `AppDataTable` lendo
   o `aria-label`.
5. **No navegador** (stack do offset da lane): o RUT não quebra a 390 px em `EnrollmentTable` e
   `ArchivedEnrollmentsList`, e não fica sob nenhum botão em 1024×768 no detalhe do orçamento. A
   captura entra na prova do bloco.
6. **No navegador**, tema claro: o diálogo de eliminar mostra o botão da opção A, com o anel de foco
   visível ao tabular.
7. `pnpm build`, `pnpm lint` e `pnpm test` verdes.

## 6. O que fica com o construtor

- A forma da receita no gerador: generalizar `WARNING_CLARO`/`warningAmarelo` ou criar uma irmã por
  severidade.
- Absorver ou não o `describe` da P-30 na régua nova (§4.3).
- Os nomes das chaves i18n do paginador.
- Onde mora a correção da P-108 (§4.7) e quanto a coluna RUT cresce (§4.6).
- Se aparecer `SplitButton` ou outro componente que herda `.p-button-<sev>` filled, ele segue o
  botão.

## Verificação externa

Nenhuma. O bloco cobre tema, testes, i18n e layout do frontend, todos verificados no repositório e
no stack local. `efeito_externo: nao`.
