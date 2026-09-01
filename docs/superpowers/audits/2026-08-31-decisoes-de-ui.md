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
