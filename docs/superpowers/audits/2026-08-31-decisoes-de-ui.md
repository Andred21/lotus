# Audit — `frontend-decisoes-de-ui-pendentes` (item 21)

Evidência datada das medições de navegador exigidas pelo plano. Uma seção por task que produz
medição; cada seção cita PNG por caminho e a decisão que ele confirmou ou derrubou.

## Task 2 — os três blocos de `p-2` (spec §6, item 3)

Medido em 2026-09-01, viewport 1024x768, stack local (`docker compose up -d` + `pnpm dev` na
porta 5174), Firefox via `playwright-cli`.

**Critério de decisão (escrito antes de olhar):** o bloco é superfície se CONTÉM outros blocos e
empilha com irmãos do mesmo tipo; é controle se é uma LINHA acionável dentro de uma lista rolável.

| Sítio | PNG | O que a tela mostrou | Degrau |
|---|---|---|---|
| `ProfileDocumentSlot:76` | `/tmp/claude-1000/-home-jvbat-projetos-lotus/8dfdff9c-6008-47d4-8bf3-107f84244f4c/scratchpad/audit/p2-profile-slot.png` | Logado como redator (`juan.morales@lotus.cl`, senha temporária de dev definida via `artisan tinker` para o teste — não é credencial de produto), `/perfil` → "Professional documents": quatro blocos com borda própria, empilhados verticalmente, cada um contendo cabeçalho + corpo (nome do arquivo ou "Not uploaded" + ação) | `rounded-surface` |
| `RedatorDocumentSlot:21` | `/tmp/claude-1000/-home-jvbat-projetos-lotus/8dfdff9c-6008-47d4-8bf3-107f84244f4c/scratchpad/audit/p2-redator-slot.png` | Logado como admin, `/personas` → ficha de Juan Morales → "Documents": mesmo padrão — blocos com borda própria empilhados, mesmo componente compartilhado do slot do perfil | `rounded-surface` |
| `CourseStep:93` | `/tmp/claude-1000/-home-jvbat-projetos-lotus/8dfdff9c-6008-47d4-8bf3-107f84244f4c/scratchpad/audit/p2-course-step.png` | Logado como admin, `/comercial` → orçamento "Scap 1" → "Add quote" → wizard "New quote", Step 1 "Course": lista `max-h-80 overflow-y-auto` de `<label>` com radio, sem borda própria por linha | `rounded-control` |

**A medição CONFIRMOU a leitura do código** (tabela do plano, linhas 263–267) — nenhum desvio a
registrar. Os três sítios migram conforme os Steps 3 e 6 do plano.

**Nota sobre a captura de `ProfileDocumentSlot`:** o admin seed não tem `redator` associado, então
`/perfil` não renderiza a seção de documentos para ele — é preciso autenticar como um redator seed.
Nenhum redator seed tem senha utilizável (credencial nasce por convite, RF `SendRedatorAccessInvitationAction`);
a senha de `juan.morales@lotus.cl` foi definida manualmente para esta sessão de medição, é local
(dev DB), não foi commitada e não substitui o fluxo de convite real.

## Task 4 — D-68: borda de controle do claro em 3:1 (WCAG 1.4.11)

Medido em 2026-09-01, `/perfil` → "Personal data", Firefox via `playwright-cli` (Chrome/Chromium
indisponível no host — `/opt/google/chrome` não existe e a instalação exige `sudo`; Firefox está
instalado no cache do Playwright e serviu de substituto equivalente para este screenshot).

| Tema | PNG | O que a tela mostrou |
|---|---|---|
| Claro | `/tmp/claude-1000/-home-jvbat-projetos-lotus/8dfdff9c-6008-47d4-8bf3-107f84244f4c/scratchpad/audit/d68-light.png` | Campos "Name" e "Phone" com traço cinza nitidamente visível sobre o card branco — a borda deixou de se confundir com o fundo |
| Escuro | `/tmp/claude-1000/-home-jvbat-projetos-lotus/8dfdff9c-6008-47d4-8bf3-107f84244f4c/scratchpad/audit/d68-dark.png` | Sem alteração perceptível — os campos seguem apoiados no poço de fundo escuro, como antes da passada |

**Desvio do plano — contagem de bordas no CSS final:** o teste (`brand-theme.test.ts`) previa 21
declarações `border*: #64748b` no claro gerado. A execução mostrou 24. Investigação: `#64748b`
(slate-500) já é cor viva do tema ANTES desta passada — `.p-button-plain` e `.p-button-secondary`
herdam o gray-500 do mapa de cor, três declarações de `border`/`border-color` entre elas, sem nunca
terem sido `#cbd5e1`. A régua de FONTE do plano — 27 ocorrências de `#cbd5e1` no claro gerado, 21
delas borda — bateu exata (confirmado isolando a saída ANTES da passada `BORDA_DE_CONTROLE`); o "21"
do teste, porém, comparava contra a contagem de SAÍDA (`#64748b` pós-passada), que inclui as 3
pré-existentes e soma 24. Corrigido o teste para medir a invariante real: 24 no total, e — a
asserção que já existia e continua sendo a prova central — zero borda sobra em `#cbd5e1`. Documentado
aqui e no próprio teste; nenhuma mudança na régua do gerador foi necessária.

## Task 5 — D-63: `cardTitleClass` nasce, e o `h1` de `/validar` sobe

Medido em 2026-09-01, `/validar/<uuid>` de um certificado válido (`LOT-2024-03913`), Firefox via
`playwright-cli` (mesma limitação de Chrome/Chromium do Task 4 — Firefox como substituto).

| Momento | Viewport | PNG | `h1` | `folio` | Quebra | Overflow |
|---|---|---|---|---|---|---|
| Antes | 390/1024/1440 | `.../scratchpad/audit/d63-antes-{390,1024,1440}.png` | 18px | 30px | 1 linha | — |
| Depois | 390/1024/1440 | `.../scratchpad/audit/d63-depois-{390,1024,1440}.png` | 30px | — | 1 linha | `false` nas três |

(Caminho completo dos PNGs: `/tmp/claude-1000/-home-jvbat-projetos-lotus/8dfdff9c-6008-47d4-8bf3-107f84244f4c/scratchpad/audit/`.)

**A medição CONFIRMOU a leitura da ficha e o alvo declarado da spec** — o `h1` foi direto para
`text-3xl` (30px, mesmo degrau do folio), sem precisar do degrau intermediário `text-2xl`: a folga em
390px já comportava o texto "Valid certificate" numa linha só, sem overflow. Nenhum desvio a
registrar.

## Task 6 — D-64: separador visível entre a contagem e a grandeza do KPI

Medido em 2026-09-01, `/` (Dashboard), Firefox via `playwright-cli` (mesma limitação de Chrome/Chromium).

| Viewport | PNG | `linhas` (nas 6 `<p>`) | Altura (uniforme entre os 6 cards) |
|---|---|---|---|
| 390 | `.../scratchpad/audit/d64-390.png` | 1 em todas | 30px |
| 1024 | `.../scratchpad/audit/d64-1024.png` | 1 em todas | 38px |
| 1440 | `.../scratchpad/audit/d64-1440.png` | 1 em todas | 38px |

(Caminho completo: `/tmp/claude-1000/-home-jvbat-projetos-lotus/8dfdff9c-6008-47d4-8bf3-107f84244f4c/scratchpad/audit/`.)

O card "Pending quotes" (único com `hint`) mostra "1 · 250 UF" na mesma linha do número principal, o
ponto claramente visível entre os dois algarismos — o defeito da leitura como milhar único
("1250 UF") não reaparece. Os seis cards seguem na mesma altura da grade; nenhum ganhou terceira
linha. Nenhum desvio a registrar.

## Task 7 — D-67: o ramo `notFound` ecoa o código consultado e orienta

Medido em 2026-09-01, `/validar/<código inexistente>`, Firefox via `playwright-cli`.

| Caso | PNG | O que a tela mostrou |
|---|---|---|
| Código inexistente, 390px | `.../scratchpad/audit/d67-390.png` | Veredito "Certificate not found", eco "nao-existe-1234" em mono, linha de orientação — sem link, sem dado do certificado |
| Código inexistente, 1440px | `.../scratchpad/audit/d67-1440.png` | Mesmo conteúdo, card centralizado, sem deformação |
| Param de 300 caracteres, 390px | `.../scratchpad/audit/d67-teto.png` | Eco cortado em 64 char, `overflow: false` |

(Caminho completo: `/tmp/claude-1000/-home-jvbat-projetos-lotus/8dfdff9c-6008-47d4-8bf3-107f84244f4c/scratchpad/audit/`.)

**Desvio do plano — a medição do teto de 64 caracteres revelou defeito real, não cosmético:** o
Step 3 do plano pedia `identifierClass` (que carrega `whitespace-nowrap`) **com** `break-all` no
mesmo `className`. Medido: `white-space: nowrap` ANULA `word-break: break-all` — CSS não tem onde
quebrar sob `nowrap`, não é conflito de especificidade. Com um uuid real (36 char) o efeito nunca
aparece (cabe numa linha), mas o param de 300 char (cortado em 64) revelou o resultado: o texto
vazava 230px além da caixa e o `overflow-hidden` do `AppCard` (`AppCard.tsx:90`) cortava em
silêncio — `document.documentElement.scrollWidth > innerWidth` continuava `false` (o teste literal
do plano PASSARIA), mas a página escondia o final do código em vez de quebrar linha, contra a
própria intenção que o comentário do Step 3 descrevia. Trocado `identifierClass` por
`technicalDataClass` (mono + tabular, sem `nowrap`) em `NotFoundCard.tsx` — papel mais correto aqui
de todo modo: este `dd` ecoa um param de rota não confiável, não um identificador bem formado como
RUT/folio. Medido depois da troca: `scrollWidth === clientWidth` (308 = 308), o texto quebra dentro
da caixa nas duas linhas do card, sem cortar.

**Segundo desvio, mecânico:** o bloco do Step 3 colado inline em `ValidationPage.tsx` estourava
`max-lines` (150) — `StatusHeading` e o corpo do card viraram `StatusHeading.tsx` e
`NotFoundCard.tsx`, sibling files em `Validation/`, mesmo padrão de extração de
`ContactFields`/`ModuleFields` que `frontend-fsliced.md` já documenta. `ValidCard` ficou onde
estava (o arquivo caiu para 127 linhas só com os dois componentes extraídos).

## Task 8 — D-32: o `order-*` muda de breakpoint

Medido em 2026-09-01, `/perfil` com sessão de **redator** (`juan.morales@lotus.cl`, senha de dev
definida via `artisan tinker` só para a medição — mesma nota do Task 2: é local, não commitada e não
substitui o convite real), Firefox via `playwright-cli` (Chrome/Chromium segue indisponível nesta
máquina). O contêiner de rolagem é o `<main>` (`scrollHeight` 2322 / `clientHeight` 764 em 390px);
séries de 25 passos de `Tab`, uma linha por passo.

| Momento | Viewport | Série | Assinatura de `main.scrollTop` |
|---|---|---|---|
| Antes | 390x844 | `.../audit/d32-antes-390.json` | 0 → **1379 → 1558 → 0** → 396 → 817 (RETORNO no passo 9) |
| Antes | 1024x768 | `.../audit/d32-antes-1024.json` | 0 → **1165 → 1288 → 0** → 406 → 819 (RETORNO no passo 10) |
| Depois | 390x844 | `.../audit/d32-depois-390.json` | 0 → 396 → 817 → 1379 → 1558 (**monotônico**) |
| Depois | 1024x768 | `.../audit/d32-depois-1024.json` | 0 → 406 → 819 → 1288 (**monotônico**) |
| Depois | 1440x900 | `.../audit/d32-depois-1440.json` | 0 → 513 → **0** (retorno de 513px no passo 23) |

| PNG | O que a tela mostrou |
|---|---|
| `.../audit/d32-depois-390.png` | Self-service PRIMEIRO (Personal data → Security → Documents); identidade abaixo — D-27 intacta |
| `.../audit/d32-depois-1024.png` | Mesma ordem de coluna única |
| `.../audit/d32-depois-1440.png` | Identidade à ESQUERDA, self-service à direita — D1 intacta |

(Caminho completo: `/tmp/claude-1000/-home-jvbat-projetos-lotus/1007b5c1-1211-4fc4-bb31-9e7b083bb14c/scratchpad/audit/`.)

**A medição CONFIRMOU o defeito e a correção.** A assinatura da ficha — o foco desce a página
inteira e VOLTA ao topo no meio da varredura — aparece nas duas larguras antes da mudança e
desaparece nas duas depois: `scrollTop` passa a ser monotônico abaixo de `xl`.

**Desvio de magnitude, não de sinal:** os números absolutos não são os do review de 2026-08-18
(`0 → 1862 → 2230 → 0` em 390px; `y` `1875 → 2383 → 323` em 1024px). Medido hoje: `0 → 1379 → 1558 → 0`
e `0 → 1165 → 1288 → 0`. A página encolheu desde agosto (os blocos de senha e documentos mudaram de
altura nos itens 18 e 19); o retorno — que é a violação de WCAG 1.3.2/2.4.3 — está lá igual. O
comentário do código cita os valores do review porque é dele que a ficha nasceu.

**A premissa da spec §6 sobre `xl` foi medida e passa pelo critério principal, com uma ressalva.**
Em 1440x900 o `Tab` ainda retorna uma vez (passo 22 → 23, `scrollTop` 513 → 0), quando sai do fim da
coluna de self-service para o `Select photo` da identidade. O critério do plano tem duas metades:
(a) `main.scrollTop` não varia mais que a altura da viewport entre passos consecutivos — **cumprido
com folga: 513px contra 900px**, e 513px é a extensão rolável INTEIRA da página nessa largura
(`scrollHeight` 1333 − `clientHeight` 820), então o foco nunca sai por mais de uma dobra;
(b) as duas colunas cabem em "uma dobra e meia" — **1,63 dobras medidas** (1333/820), 8% acima da
régua escrita. O salto não é comparável ao de 390px (lá o retorno atravessava 3 dobras), então a
ficha NÃO volta ao João pelo gatilho da spec; a ressalva de (b) fica registrada aqui.

Gate do Task 8: `pnpm lint`, `pnpm build` e `pnpm test` (125 arquivos / 712 testes) verdes.

## DoD end-to-end — cada item da spec §7 contra a evidência (2026-09-01)

| Item do DoD (spec §7) | Prova | Resultado |
|---|---|---|
| As seis fichas com veredito escrito **e** código aplicado | `D-66` `97661217`+`9d5af40a`+`3c27c4f3` · `D-68` `d8c08e11` · `D-63` `f4596362` · `D-64` `34793aa7` · `D-67` `6fae4d67` · `D-32` `5ddce556` | seis commits, nenhuma ficha "decidida e não aplicada" |
| `P-67` fechada; catraca `RAIO_LITERAL` vista reprovar por sonda ANTES de entrar | Task 3 Step 5 (seção "Task 3" acima) | sonda negativa com o arquivo restaurado do scratchpad, nunca por `git stash` |
| A catraca vista reprovar de novo, no estado final | `sed -i 's/rounded-control/rounded-md/' src/app/layouts/Sidebar/SidebarItem.tsx` → `pnpm lint` | `SidebarItem.tsx:30:11 error Raio literal no sítio: … no-restricted-syntax`; restaurado, `git diff --stat` vazio, `pnpm lint` **0** |
| Borda de controle do claro ≥ 3:1, nos dois temas | `d8c08e11` + `brand-theme.test.ts` + PNGs `d68-light.png`/`d68-dark.png` | slate-500 `#64748b` = **4,76:1**; escuro sem alteração perceptível |
| Os 4 `background` e as 2 declarações de rampa sem diff | `git show d8c08e11 -- .../lara-light-lotus.css` filtrado pelas duas cores | **0** linhas mudadas fora de `#cbd5e1`→`#64748b`; `lara-dark-lotus.css` não aparece no commit |
| `h1` de `/validar` deixa de ser menor que o folio, nas três viewports | Seção "Task 5" — PNGs `d63-{antes,depois}-{390,1024,1440}.png` | 18px → **30px**, mesmo degrau do folio, `overflow: false` nas três |
| Foco de `/perfil` abaixo de `xl` sem o salto de 2026-08-18 | Seção "Task 8" — séries `d32-{antes,depois}-{390,1024}.json` | `scrollTop` **monotônico** depois; o retorno (`→ 0` no meio da varredura) desapareceu nas duas larguras |
| `pnpm lint` 0, `pnpm build` verde, suíte verde | `pnpm lint && pnpm build && pnpm test` no estado final | lint **0**, build verde, **125 arquivos / 712 testes** passados |
| `generated.ts` com diff vazio | `docker compose exec -T app php artisan typescript:transform` + `git diff --stat -- frontend/src/shared/types/generated.ts` | **vazio** — o bloco não tocou contrato |
| A rule reflete a escala e os dois registros | `.claude/rules/frontend-estilizacao.md` §"Escala de raio" e o parágrafo dos dois REGISTROS | tabela em `rounded-surface`/`rounded-control`/`rounded-full`, com `--radius-control` referenciando `--border-radius` do tema; nenhuma linha descreve estado que o código não tem |
| A `D-69` existe no `backlog.md` | `a3571cc8` | ficha aberta com os 4 sítios e DoD mecanizado (`CATRACA_COR` chegar a `[]`) |

**Fichas que a sessão abriu em vez de calar:** `D-69` (4 sítios de utility de paleta não varridos),
`D-70` (a página pública orienta a "contactar a Lotus" sem canal — decisão da Lotus) e o **item 23**,
hospedeiro da `D-65` reescrita com os sete valores de reserva medidos.

**Ressalva registrada, que não dispara o gatilho de devolução ao João:** em `xl` (1440x900) o `Tab`
ainda retorna uma vez, 513px — dentro do critério (a) do plano (< 900px de viewport, e é a extensão
rolável inteira), 8% fora do critério (b) ("uma dobra e meia": medido 1,63). Detalhe na seção
"Task 8".
