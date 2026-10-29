# Bloco 43 — smoke no navegador

**Data:** 2026-10-29 · **Commit:** `8198181a` · **Stack:** lane, offset +3
(SPA `:5176`, API `:8083`), es-CL · **Gate:** backend 1402 testes (5 skipped, em `8d8bccc3`; o
fix seguinte só toca o frontend), frontend 1321 testes em 184 arquivos, lint e build verdes
(frontend refeito em `8198181a`).

Banco da lane recriado com `migrate:fresh --seed --force` antes da medição. Navegador: Chromium
1248 headless, pelo `playwright-core` do `@playwright/cli` (o headless shell 1247 que a versão
instalada pede não está no cache; um shim passa o `executablePath`). Capturas e scripts em
`/tmp/claude-1000/-home-jvbat-projetos-lotus-43-frontend-dialogos-proporcionais-e-tipo-de-documento/0e596312-6f47-4fef-a758-0f126518c2c9/scratchpad/task6/`,
abreviado abaixo como `$T`, e as capturas em `$T/shots/`.

## P-94 — diálogo do Alumno em 1024×768

Linha `DIALOGO` do `medir.cjs` (Apêndice A de `audits/2026-09-27-item23-medicoes.md`), literal:

    1024x768 /personas [Alumnos] DIALOGO (dialogo) | frame 720 scroll 720 table 720 (672px) sticky null overlap 0 col1 null free null box 0 text 0 rows 1
        CÓDIGO:82 | CURSO:216 | FECHA:103 | ESTADO:103 | CERTIFICADO:216

Veredito: scroll = frame, fecha. O 1º alumno da lista (Antonia Aguilera) tem uma turma
(`Scap 6 - Cot 1`), então a tabela tem `rows 1` e herda o piso de 42rem (672px). A moldura `md`
(48rem) dá ao conteúdo 720px, acima do piso. O `StudentDialog.tsx` não mudou. Em 1440×900 a mesma
linha mede `frame 720 scroll 720`.

O `medir.cjs` é o do Apêndice A, com uma diferença só: `BASE` aponta para `:5176` (o diff contra o
apêndice tem uma linha). A API não entra no script, porque a SPA a chama sozinha. Rodado com
`PW=$T/pw-shim.cjs VPS=1024x768,1440x900 PAGES=/personas node medir.cjs`. A saída está em
`$T/p94-antes.txt`.

## Conferência

| # | Tela | 1024×768 | 1440×900 | Escuro | Captura |
|---|---|---|---|---|---|
| 1 | Alumno criar / ver | ok: md 768px; Nombre │ RUT em y 244 e Correo │ Teléfono em y 330 no criar (165/225 no ver); conteúdo 768/768, documento 1024/1024 | ok: mesma grade, 768px, sem rolagem | ok nos dois tamanhos | `$T/shots/1-alumno-criar-1024x768-light.png`, `$T/shots/1-alumno-ver-1024x768-light.png`, `$T/shots/1-alumno-ver-1440x900-dark.png` |
| 2 | Matrícula, passos 1 e 2, aviso âmbar | ok: sm 512px; passo 2 com RUT │ Nombre (y 280) e Correo │ Teléfono (y 366); Cancelar e Continuar/Matricular no footer navy; RUT 16.200.013-6 (Transelec) abre o aviso `warning` de 448px com faixa `rgb(234,179,8)` | ok, mesma grade | ok | `$T/shots/2-matricula-passo1-1024x768-light.png`, `$T/shots/2-matricula-passo2-1024x768-light.png`, `$T/shots/2-4-aviso-warning-1024x768-dark.png` |
| 3 | Upload por tipo, tag, erro no diálogo | ok: os três tipos subidos, um por vez, e o diálogo fecha no sucesso (2º e 3º medidos; o 1º ainda animava a saída); `.txt` dá 422 dentro do diálogo, que fica aberto; Subir desabilitado sem tipo ou arquivo | ok | ok: as três tags se distinguem | `$T/shots/3-upload-dialog-preenchido-1024-light.png`, `$T/shots/3-upload-recusado-1024-light.png`, `$T/shots/3-lista-tags-final-1024-light.png`, `$T/shots/3-lista-tags-1440x900-dark.png` |
| 4 | Confirmação `confirm` / `warning` / `danger` | ok: 448px (28rem), sem maximizar; faixa de 4px no `.p-dialog` (verde `rgb(34,197,94)`, âmbar `rgb(234,179,8)`, vermelho `rgb(255,61,50)`); ícone centrado depois de `8198181a` | ok, 448px | ok | `$T/shots/4-confirm-aprobar-1024x768-light.png`, `$T/shots/2-4-aviso-warning-1024x768-light.png`, `$T/shots/4-danger-eliminar-1024x768-dark.png` |
| 5 | Preview `lg` maximizado; `sm`/`md` sem maximizar | ok: lg 973px (95vw) com maximizar, maximizado 1024×768 | ok: lg 1024px (teto de 64rem), maximizado 1440×900, o teto solta | ok | `$T/shots/5-preview-lg-1440x900-light.png`, `$T/shots/5-preview-lg-maximizado-1440x900-light.png` |
| 6 | Cliente, Usuario, Redator; `QuoteWizard`; `headerExtra` | ok: md 768px nos três, sem rolagem; "Paso 1 de 2" do wizard e a tag "Idoneidad: Idóneo" do Redator legíveis sobre o navy | ok | ok | `$T/shots/6-cliente-1024x768-light.png`, `$T/shots/6-usuario-1440x900-dark.png`, `$T/shots/6-quotewizard-1024x768-dark.png`, `$T/shots/6-redator-headerextra-1024x768-dark.png` |

### Itens que as revisões das tasks deixaram para o navegador

- **Faixa de 4px do `ConfirmDialog`:** ok. O `getComputedStyle` do `.p-dialog` mede `border-top:
  4px solid` na cor da severidade, e o header começa 4px abaixo do topo. O raio de 4px arredonda
  só os cantos da faixa. A faixa aparece inteira nos dois temas.
- **ESC travado durante o envio do upload:** ok. Com a resposta atrasada em 2,5s
  (`page.route`, só no smoke), um ESC durante o envio deixou o diálogo aberto e o X ausente. Os
  cartões, o "Elegir archivo" e o Cancelar ficaram desabilitados, e o Subir em loading
  (`$T/shots/3-upload-pending-esc-1024-light.png`). Depois da resposta, o diálogo fechou.
- **Hover e active dos botões `text` no footer navy:** ok nos dois temas. O "Cerrar" mede tinta
  `oklch(0.869 0.022 252.894)` sobre `rgba(255,255,255,0.1)` em cima de `rgb(15,43,61)`, legível
  (`$T/shots/1-footer-hover-1024x768-dark.png`, `$T/shots/1-footer-active-1024x768-light.png`).
- **`lg` maximizado:** ok. Em 1440×900 o preview mede 1024px com o teto e 1440×900 maximizado.
- **`FormPhotoRow` com a grade `sm:`:** ok. Cliente, Usuario, Alumno e Redator medidos em 1024,
  1440, 700 e 640 (a quebra), sem estouro: o conteúdo do diálogo e o documento têm `scrollWidth`
  igual ao `clientWidth` em todos. Em 640 o Usuario empilha Nombre e RUT e põe Correo │ Teléfono
  lado a lado. Os outros três mantêm as duas colunas
  (`$T/shots/6-cliente-700x900-light.png`, `$T/shots/6-usuario-640x900-light.png`,
  `$T/shots/6-redator-700x900-light.png`, `$T/shots/1-alumno-ver-700x900-light.png`).
- **As três tags de tipo do orçamento:** ok. Orden de compra é `info` (azul, tinta
  `rgb(24,107,148)`), Factura é `accent` (roxo, `rgb(118,60,173)`) e Comprobante é `success` (verde,
  `rgb(19,108,52)`). Distinguem-se nos dois temas.

### Teclado (`$T/kbd.cjs`, 1024×768)

O foco fica preso nos três diálogos, e o ESC o devolve ao disparador:

    confirm foco: Cerrar -> Cancelar -> Aprobar -> Cerrar ... | após ESC: Aprobar
    upload foco: Cerrar -> Orden de compra -> Factura -> Comprobante -> Elegir archivo -> Cancelar -> Cerrar | após ESC: Subir documento
    matricula foco: Cerrar -> INPUT -> Cancelar -> Cerrar | após ESC: Agregar alumno

### Correção feita no smoke

`8198181a fix(43): ícone de severidade centrado no círculo da confirmação`. O `.pi` do primeicons
é CSS sem camada e crava `display: inline-block`, que vence o utilitário `grid` do Tailwind. O
círculo virava bloco e o glifo caía no canto superior esquerdo, nas três severidades. Com `grid!`
o centro volta. Red e green no navegador por `$T/icon-check.cjs`: `display block` antes, `grid`
depois. Capturas: `$T/shots/4-confirm-icon-zoom-light.png` (antes) e
`$T/shots/4-icon-confirm-zoom.png` (depois). Depois do fix, lint, vitest (184 arquivos, 1321
testes) e build ficaram verdes.

### Mutação acidental, revertida

Um script de sondagem clicou a lixeira do último documento do orçamento 1 em vez do "Eliminar" do
cabeçalho. Isso removeu `comprobante.pdf` (`files.id` 20, soft delete às 03:44:25 UTC). Subi o
arquivo de novo (id 21, `receipt`), e a lista voltou aos três tipos. O episódio mostrou o achado
UI-04 abaixo. O banco da lane só tem seed e dados do smoke.

## lotus-ui-review

Quatro rodadas, uma por superfície do DoD 9, em `.artifacts/ui-review/20261029-0055-*/report.txt`
(ignorado pelo Git). O desvio foi declarado em cada uma: headless e login automatizado com a
credencial de seed, porque a sessão não é interativa. As jornadas da revisão foram read-only. Os
uploads e o 422 vêm do smoke acima.

- **Diálogo do Alumno:** sem C.
  - B: "Seleccionar foto" quebra em duas linhas no `FormPhotoRow`, em todas as larguras. É
    cosmético e fica registrado.
- **Matrícula na Operación:** sem achado B ou C.
- **Detalhe do orçamento com upload:**
  - B, bloco: "Comprobante" sai cortado no cartão de tipo (`sm:grid-cols-3` dentro dos 32rem do
    `sm`), e "Orden de compra" quebra a linha (`$T/shots/3-upload-dialog-preenchido-1024-light.png`).
    Registrado para o João, sem correção: é escolha de layout (empilhar ou `md`).
  - B: o 422 do tipo recusado diz "El campo **file** debe ser…", porque o backend não traduz o
    nome do atributo.
  - B, fora do bloco: em 1024 o RUT do cliente passa por baixo do "Agregar cotización" no
    cabeçalho do detalhe (`$T/explore-budget.png`).
  - B, fora do bloco: a lixeira de um documento do orçamento remove sem confirmação
    (`useBudgetDetail.ts:99` chama `removeFile.mutate` direto). Documento tem peso legal.
- **Confirmação de cada severidade:**
  - C: o ícone de severidade ficava fora do centro. Corrigido em `8198181a`.
  - B: o `danger` preenchido mede 3,76:1 no claro. É resíduo declarado da P-74 (J10).
  - O `danger` escuro sobre o fundo de 15% do ícone é a P-105, já registrada.
- **Fora das superfícies:** o paginador das tabelas expõe "Previous Page", "Next Page" e
  "Page N" em inglês para leitor de tela. É anterior ao bloco.
