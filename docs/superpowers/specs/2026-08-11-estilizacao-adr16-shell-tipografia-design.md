# Spec — Estilização: tema custom (ADR-16), shell e tipografia

- **Work item:** `estilizacao-adr16-shell-tipografia`
- **Context packet:** `null` — dispensa confirmada pelo João na abertura (D1): as fontes são o
  repositório, o report do review de UI em `.artifacts/`, o ADR-16 em `docs/adrs.md` e a direção
  registrada na memória da sessão de 2026-08-11. Figma **não** é fonte deste bloco de propósito —
  a direção é identidade própria aceita pelo João, não implementação de protótipo.
- **Branch:** `feat/estilizacao-adr16-shell-tipografia` (worktree `fix-frontend`, de `09a11d9`)
- **Base da seleção:** `b29f3b9` (proposta) + `92d6118` (promoção)
- **Evidência:** `.artifacts/ui-review/2026-08-11T12-58-51-applayout-shell/report.txt`
  (2 C + 5 B + 1 A, três viewports, medições computadas)

---

## §1 — Problema

A interface tem "cara de template" e a raiz é medida, não impressão: o tema é o `lara-light-blue`/
`lara-dark-blue` **stock** do PrimeReact, com a primária Lara (`#3B82F6`) brigando com a marca
(`#25A5E4`, hardcoded em 3 arquivos); ~~nenhuma fonte é carregada (o corpo é o stack system default
do Lara)~~ **[corrigido — ver adenda abaixo]**; o título da página tem dois donos (h1 do Header +
h2 do PageHeader, gap medido de 0px); a sidebar mistura `gray-200` com `slate-400`; e o logo usa
`ml-15 h-30` arbitrário.

> **Correção factual (2026-08-11, medida na Task 0 do `/executar-bloco` — lição 13).** A frase
> riscada acima nasceu errada. Fonte **é** carregada hoje: o Vite processa o `url()` de dentro do
> `theme.css` mesmo quando o import usa `?url`, então o build emite
> `dist/assets/InterVariable-CWi-zmRD.woff2` (345 KB) e a itálica (380 KB), e o tema emitido
> referencia `url(/assets/InterVariable-…woff2)`. O corpo já é **Inter var**, embutida no tema
> stock. O problema real não é ausência de fonte — é que a tipografia do produto é um efeito
> colateral do tema de terceiro, sem papéis, sem controle de peso e sem versionamento nosso, e
> custa 725 KB de fonte que ninguém escolheu. O §5 continua valendo integralmente. Consequência
> para o plano: o script **precisa remover** os blocos `@font-face` do Lara ao gerar as cópias,
> senão o tema gerado apontaria para `./fonts/InterVariable.woff2` — inexistente ao lado do arquivo
> gerado — e o **build quebraria** (D-P4 do plano).

O review canônico do AppLayout (2026-08-11) reprovou com **C**: UI-01 (menu do usuário fora da
viewport a 390 — rightEdge 491/390, sem scroll de alcance), UI-02 (toggle da sidebar inoperante
no mobile **corrompendo a pref persistida** do Zustand — débito de 2026-07-27 reescalado). Mais
cinco B: UI-03 (foco invisível nos brand buttons — `ring-0` zera o box-shadow do Lara), UI-04
(wordmark ilegível no dark), UI-05 (título duplicado), UI-06 (tabela sem affordance de scroll),
UI-07 (aria-labels pt-BR hardcoded fora do i18n).

Dois débitos do backlog estavam **travados em decisão do João** ("Shell fora de conformidade com o
ADR-16 §4", "Toggle da sidebar sem efeito abaixo de 1024px") — **este bloco é a decisão**. As
linhas de origem ficam até o fechamento, pela regra do backlog.

## §2 — Objetivo, escopo e não objetivos

**Objetivo:** fechar o ADR-16 com identidade própria — tema custom sobre o Lara nos dois modos,
shell conforme (fim da exceção §4) e tipografia com papéis — provando cada correção pela medição
que o review usou para reprovar.

**Entra:** camada `brand-theme.css`; paleta de ~~6~~ **5** tokens (correção D-P16, §4); 3 famílias tipográficas self-hosted;
dono único de título; sidebar navy fixa; header responsivo (UI-01); toggle oculto em compact
(UI-02); focus ring visível (UI-03); wordmark legível no dark (UI-04); neutros numa família só;
fim dos hex hardcoded; aria-labels do shell no i18n (UI-07, D4).

**Não entra:** UI-06 — fica no BD-3, mesma classe do débito do piloto Clientes e mesmos arquivos
de `shared/ui` (D3); ícones custom (primeicons seguem como "aproximações" declaradas); Dashboard
placeholder; qualquer feature ou backend. `generated.ts` não é tocado.

## §3 — Decisões fechadas na abertura

| # | Decisão |
|---|---|
| D1 | Sem Context Packet — ausência medida de fonte externa, confirmada pelo João |
| D2 | Fontes **self-hosted via `@fontsource`**, 3 famílias — sem CDN em app corporativo |
| D3 | UI-06 fica no BD-3 |
| D4 | UI-07 entra no bloco (mesmos arquivos do shell) |
| D5 | Mecanismo do tema = **abordagem A**: `brand-theme.css` estático sobre o Lara |
| D6 | Botão primário = fundo celeste com **texto azul-poste** (AA; branco sobre celeste dá ~2.6:1 e reprova) |
| D7 | Radius `6px → 4px` (registro instrumental) |
| D8 | Review em **duas frentes** (toca `locales/` — sai da régua de BAIXO RISCO) |

## §4 — Tema e tokens (enmenda ao ADR-16)

> **Correção D5' (2026-08-11, aprovada pelo João na escrita do plano — lição 13).** A escrita do
> plano mediu que o Lara **compila as cores inline** nas regras de componente (97 ocorrências
> literais de `#3b82f6` no `theme.css` light); as vars de `:root` são um conjunto paralelo que as
> regras compiladas não consomem — override puro de tokens não restiliza botão, foco nem highlight.
> Mecanismo corrigido: **script versionado** `frontend/scripts/generate-brand-theme.mjs` gera
> cópias dos dois Lara com a escala azul substituída pela escala celeste derivada
> (`border-radius: 6px→4px` e `"Inter var"→"Inter"` incluídos), saída **versionada** em
> `frontend/src/shared/styles/themes/lara-{light,dark}-lotus.css` (em `shared/`, não `app/` —
> `primeTheme.ts` mora em `shared/config` e a seta de dependência não sobe), consumida pelo
> `applyPrimeTheme()`. Guarda: teste vitest reprova se o arquivo commitado divergir de uma geração
> fresca ou se restar azul Lara. O `brand-theme.css` continua existindo, **fino** (fontes, D6,
> `tabular-nums`), em `frontend/src/shared/styles/brand-theme.css`. Upgrade do primereact = rodar
> o script de novo, com o teste acusando drift.

O ADR-16 ganha o ponto 5: camada de marca **sobre** o Lara — os temas gerados + `brand-theme.css`
no bundle do Vite, que entra no `<head>` **depois** do `<link id="prime-theme">`. O Lara continua
base: o que a camada não redefine, permanece Lara.

Paleta — ~~6~~ **5** tokens nomeados, únicos donos de cor da identidade
**[corrigido — ver a correção D-P16 abaixo]**:

| Token | Hex | Papel |
|---|---|---|
| `celeste-lotus` | `#25A5E4` | primária única; escala `--primary-50..900` via `color-mix` |
| `azul-poste` | `#0F2B3D` | navy — sidebar fixa nos 2 temas, headings display no claro, texto do botão primário |
| `humo` | `#F1F5F9` | fundo claro (`--surface-ground`) |
| `grafite` | `#334155` | texto corpo no claro |
| `noche` | `#0B1220` | fundo dark |
| ~~`ámbar-aviso`~~ | ~~`#D97706`~~ | ~~só semântico (warning); nunca decorativo~~ **não construído** — `warning` fica de stock do Lara; ver abaixo |

> **Correção D-P16 (2026-08-12, decisão do João no review do bloco — lição 13).** O `ámbar-aviso`
> nunca foi construído: `#D97706` não aparece em `frontend/src/`. As paletas de **severidade**
> (info/sky, success, warning, danger, secondary/slate) ficam **intactas de propósito** — a camada
> de marca transforma só a família da primária, como o comentário do `generate-brand-theme.mjs`
> declara. O papel `warning` segue com o laranja de stock do Lara nos dois temas gerados: `#f97316`
> em botão, tag e badge e `#cc8925` na borda da mensagem `warn` no claro; `#fb923c` e `#eab308` no
> escuro. **A regra é por família, não por severidade:** onde o Lara pintou uma superfície de
> severidade com o azul, a camada varreu junto — a mensagem `info` do claro hoje tem borda celeste
> e texto no degrau 700 (D-P14). Adotar um âmbar de marca é decisão de **design**, com régua de
> contraste própria em botão, tag, mensagem e badge nos dois temas — fora do escopo desta emenda ao
> ADR-16, e registrada como pendência **P-30** em `docs/pendencias.md`, não como promessa aqui.

Focus ring: 2px celeste, visível nos dois modos — é metade da correção do UI-03 (a outra metade é
remover o `ring-0` do `brandOutline` em `AppButton/style.ts`). Radius global `6px → 4px` via token
(D7). Estados hover/active derivados por `color-mix`, não por hex novos. Estética-alvo: precisão instrumental técnico-regulatória — nem
cream+serif, nem dark+acid.

## §5 — Tipografia (3 papéis)

`@fontsource`: **Archivo** 600/700 — display (títulos de PageHeader, números grandes);
**Inter** 400/500/600 — corpo, via `--font-family` (hoje ninguém carrega fonte alguma);
**IBM Plex Mono** 400/500 — folio `LOT-AAAA-NNNN`, RUT, datas em tabelas.
`font-variant-numeric: tabular-nums` em células numéricas/datas e no Clock do header.
Escala deliberada substitui o `text-2xl font-bold` uniforme: display 20–24 Archivo semibold,
corpo 14, descrições 14 em grafite.

## §6 — Shell (mudança → achado)

| Mudança | Achado |
|---|---|
| Header perde o h1 e vira barra utilitária; `PageHeader` é dono único do título. Risco estético assumido: header sem texto à esquerda | UI-05 |
| Sidebar `azul-poste` fixa nos 2 temas; wordmark claro (assets `LogoLight`/`LogoDark` existem — qual serve se confere na execução); logo sem `ml-15 h-30`; nav com texto slate claro, ativo celeste (borda esquerda + texto), hover translúcido | UI-04 |
| Controles do header colapsam no mobile; user menu dentro da viewport | UI-01 |
| Toggle oculto em compact (<1024); pref persistida deixa de ser corrompida por clique sem efeito | UI-02 |
| `gray-*` morre no shell; o que acompanha tema usa vars Lara (`--surface-*`, `--text-color`) — fim da exceção ADR-16 §4 | débito shell |

**Assinatura única:** a sidebar navy com wordmark. O resto fica quieto — o folio mono entra pela
tipografia, sem tratamento extra.

## §7 — Higiene

- `#25A5E4` sai de `SidebarItem.tsx` e `AppButton/style.ts` → tokens CSS. `brand.ts` permanece
  como fonte **JS** (consumo TS não lê CSS var) com comentário cruzado apontando o token — dupla
  fonte **declarada**, não acidente.
- Aria-labels do shell (`"Alternar menu"` etc.) → chaves i18n novas nas 3 locales; a guarda de
  paridade existente cobre a regressão.

## §8 — O que não muda (leis)

PrimeReact só via `shared/ui` (§5.6) — o tema muda tokens, não cria import direto em feature.
Nenhuma feature importa outra. `generated.ts` intocado. Zero backend, zero schema, zero rota.
Financeiro, auth, RBAC: sem superfície de contato.

## §9 — DoD comportamental

Cada correção provada pela **mesma medição que reprovou**:

1. viewport 390: `rightEdge` do user menu **≤ 390**, page `scrollWidth` sem overflow (UI-01);
2. viewports 1024/390: toggle **ausente** do DOM ou `hidden`, e a pref do Zustand **intacta**
   após interação com o shell (UI-02);
3. computed style do foco nos brand buttons ≠ `outline: none` + box-shadow zerado (UI-03);
4. screenshot do wordmark sobre navy nos 2 temas, legível (UI-04);
5. **um** heading de página no shell (UI-05);
6. grep sem `#25A5E4` fora de `brand.ts`, `brand-theme.css`, `scripts/generate-brand-theme.mjs` e
   dos temas gerados em `shared/styles/themes/` (D5'); sem `gray-*` no shell;
7. paridade das 3 locales (chaves novas incluídas);
8. `pnpm build`, `pnpm lint`, `pnpm test` verdes;
9. **checkpoint visual do João** nas 3 viewports (1440/1024/390), light e dark;
10. re-run do `/lotus-ui-review AppLayout` como validação final da superfície.

## §10 — Review e executor

**Duas frentes** (D8): lente Claude com o gabarito do projeto + `mcp__codex__codex` read-only.
Gatilho: o bloco toca `locales/` e o shell global — fora da régua de BAIXO RISCO dos precedentes.
Executor por task no plano: julgamento visual → `claude`; mecânica com verificação executável e
paths fechados → candidata a `codex`.

## §11 — Fechamento

A enmenda do ADR-16 (ponto 5) entra em `docs/adrs.md` neste bloco; o **re-sync com o espelho do
Drive** (`decisao-stack.md`) é passo do fechamento, como no precedente de 2026-07-31. Ao fechar,
os dois débitos decididos saem de `## Débitos técnicos` e da seção "Fora dos BDs", e o item 4 sai
de "Próximos blocos".
