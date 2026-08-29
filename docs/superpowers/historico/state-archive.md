# Narrativa dos blocos fechados — Lotus v2

> O que o `state.md` registrava sobre blocos **já encerrados**, movido para cá **verbatim**.
> Nada aqui decide etapa. Estado operacional: `docs/superpowers/state.md`. Histórico curto (uma
> linha por entrega, com plano/spec/packet/commits): `progress.md`. Tabela antiga:
> `progress-archive.md`.
>
> **Por que este arquivo existe — review de 2026-08-22 (Q-1).** O `state.md` é o arquivo que o
> `CLAUDE.md` §3 manda ler **primeiro, em toda sessão**, e 81% dele (1213 de 1499 linhas, ~84 KB)
> eram narrativas de cinco blocos já fechados. O `/fechar-sprint` poda o `progress.md` por limite
> de dez entregas desde sempre, e não tinha passo nenhum que podasse o `state.md` — o custo de
> leitura crescia a cada fechamento, sem catraca. Agora o §9 do gate move a narrativa para cá no
> mesmo commit do fechamento.
>
> **Ordem: do fechamento mais recente para o mais antigo.** Fechamento move narrativa; não a
> resume, não a corrige e não a reescreve. Referência a arquivo que já morreu continua correta
> aqui — é registro do que era verdade naquele dia, o mesmo contrato do `progress-archive.md`.
>
> **Única coisa reescrita na mudança: o cabeçalho `## `.** No `state.md` ele era posicional
> (`Último`, `Penúltimo`, `Antepenúltimo`…), e posição relativa só significa alguma coisa
> enquanto o arquivo tem cinco blocos e o próximo fechamento empurra todo mundo. Aqui vira
> `## Fechado em <data> — <bloco>`, que não muda quando o de cima chegar. O corpo é o original.

---

## Fechado em 2026-08-29 — `frontend-estilizacao-padronizacao-de-componentes`, item 18 da fila

| Lane | Bloco | Frente | Árvore | Branch | Estado |
|---|---|---|---|---|---|
| `lane-c` | `frontend-estilizacao-padronizacao-de-componentes` (item 18) | Frontend | `../fix-frontend` | `refactor/frontend-estilizacao-componentes` (aberta de `main@b7283736`) | `ready_for_closure` (Q-1..Q-6 aprovados e aplicados; gate reverificado) |

## Promoção — 2026-08-28: o item 18 entra na `lane-c`

O João promoveu explicitamente o **item 18**, `frontend-estilizacao-padronizacao-de-componentes`,
depois da análise desta data sobre `backlog.md`, `pendencias/` e `audits/`. A dependência dele — o
item 8 — fechou em 2026-08-27, e a fonte é o `audits/2026-08-26-estilizacao-componentes.md`: **18
achados medidos, nenhum aplicado**. `Contexto: não`, então o bloco nasce em `ready_for_planning`,
sem packet. A **P-63** já está agrupada nele desde o fechamento do item 8.

**A `D-62` entra junto, por decisão do João no mesmo ato.** O hospedeiro dela era o item 8, que
fechou pagando `P-46`/`D-03`/`D-33`/`D-35` e **não** a D-62 — medido aqui: `frontend/eslint.config.js`
não tem uma linha sobre `AppDropdown`, `inputId` ou `aria-label`, e a quarta ocorrência do defeito
nasceria verde. O remédio mora no mesmo arquivo que este bloco toca. A **D-34** continua **sem
hospedeiro**: o outro candidato natural é o item 9, e escolher é do João.

**Este commit escreve o espelho singular a partir da worktree, e isso é a P-55.** A invariante diz
que `focused_lane` e os campos do topo são fronteira durável do main tree, mas `/planejar-bloco` lê
os singulares — lane sem espelho apontando para si é planejada contra a lane errada. É o **quarto**
caso da mesma pendência, registrado na ficha dela; não é exceção nova nem reescrita da invariante,
que segue aguardando a decisão do João.

### Planejamento fechado — 2026-08-28

Spec em `specs/2026-08-28-frontend-estilizacao-padronizacao-de-componentes-design.md`, plano em
`plans/2026-08-28-frontend-estilizacao-padronizacao-de-componentes.md`: 17 tasks, 93 passos,
executor `claude`. A escrita do plano mediu três coisas que **corrigem** o desenho e valem sobre o
texto da spec, e estão registradas na seção "Correções ao desenho" do próprio plano:

1. **D1 (Sidebar):** o asset é PNG, não SVG — não há `viewBox` a corrigir. Medida a caixa opaca de
   `LogoDark.png` (335×466): padding de 31/12/15/27px, que renderizado vale ~8px e **não** explica
   os 60px do `ml-15`. Recortar o asset não fecha o achado; o que sai é o empurrão manual, e o
   `h-30` fica porque é a altura do wordmark.
2. **D3 (Login):** a limitação §7 da spec está **paga e passa**. `--shell-ink` mede 8,71:1 e 9,86:1
   contra as duas pontas do `--brand-gradient`; `--shell-ink-muted`, 4,93:1 e 5,57:1. Os dois
   passam o 4,5:1 na ponta pior.
3. **`D-62`:** o seletor de lint foi rodado **antes** de virar task. Reprova exatamente uma
   ocorrência viva — `BudgetDocumentsCard.tsx:36`, a quinta que a ficha previa nascer verde — e a
   sonda negativa (remover o `inputId` de `TurmaStatusFilter.tsx:44`) reprova nomeando o arquivo.
   Os 11 `AppDropdown` dentro de `FormField` recebem o `inputId` por contexto e são grafia certa.

Um ponto que a spec não decidiu e o plano fixa: `FormSection` e os quatro `h3` de operation
consomem `SectionLabel` com `rule={false}`, para que os 8 sítios do Dashboard fiquem
byte-idênticos e nenhuma hairline nova apareça onde achado nenhum pediu.

**A narrativa do item 17 saiu daqui neste fechamento.** Ela dizia que a branch
`refactor/tabelas-coluna-de-acoes` seguia viva e sem merge — a branch já não existe nesta árvore, e
a narrativa integral do bloco (com a **P-57** e a **P-58**, que continuam abertas nas fichas) está
em `historico/state-archive.md` desde o fechamento dele. Bloco encerrado não guarda parágrafo aqui.

### Fechamento — 2026-08-29

**O gate abriu VERMELHO no §2 e foi o único achado do fechamento.** O `bbf35f5c` — as correções
Q-4/Q-5 do review — levou `ValidationPage.test.tsx` de 147 a **170 linhas**, e a catraca `max-lines`
de `src/features/*/components/**` mede teste junto com componente. O `2bbaad01` declarou "gate
reverificado — lint 0" com o lint já vermelho: os números de teste daquela linha batem com a
medição de hoje (117 arquivos / 653 testes), o `lint 0` não batia. Prova declarada sem a saída real
é a mesma classe de defeito que o `/fechar-sprint` §0 existe para pegar.

**A saída foi decisão do João, com as três alternativas medidas:** quebrar o arquivo, comprimi-lo,
ou levar para o bloco de `features/` o `ignores: ['**/*.test.tsx']` que o bloco de `src/app/**` já
tem. Ele escolheu **quebrar** — `ValidationPageFolio.test.tsx` nasce com as duas asserções da
assinatura e o harness redeclarado (`vi.mock` iça por arquivo). A isenção foi recusada com o custo
medido: dos 24 testes dessa camada, **um** passava de 150 (o nosso) e **dois** estão exatamente em
150 — gente que já pagou o preço para caber. Afrouxar ali soltaria régua viva para 24 arquivos.

**A assimetria que o achado expôs virou a P-65**, e não correção silenciosa: `src/app/**` isenta
teste do `max-lines` com razão escrita no próprio config ("quebrar um arquivo de teste coeso é pagar
preço pela regra, não pelo defeito") e `src/features/*/components/**` não isenta. Duas camadas, duas
políticas, nenhuma das duas errada por si — quem decide é o João.

**As duas catracas do bloco foram provadas por sonda negativa no fechamento**, cada uma reprovando e
nomeando o arquivo: apagar o `inputId` do `TurmaStatusFilter` acende o `DROPDOWN_SEM_NOME` (D-62), e
colar a assinatura da grafia de título num `className` do `KpiRow` acende o `GRAFIA_LITERAL` — este
em `src/app/**`, que é onde as 4 cópias vivas estavam. Sondas rodadas sobre cópia no scratchpad, com
restauração medida por `git status`.

**Gate medido:** backend **999 passed / 5 skipped** (container próprio da worktree, offset +2 —
`git diff main...HEAD -- backend/ generated.ts` **vazio**, então `pint` e `typescript:transform` são
N/A por escopo, provados e não supostos); frontend lint **0**, build verde, **118 arquivos / 653
testes**. Guardas de grep do DoD: zero `variant` velho vivo, zero `my-[0.83em]` em `className`, zero
título copiado em `features/`.

**A `D-62` sai do `backlog.md` paga**; a **P-63** fica aberta por escrito, como a spec §2 previu — o
`role="list"` que falta é o das legendas do Recharts, e o remédio não é deste bloco. Nasceram a
**P-64** (10 sítios de `rounded` solto que a rule declara como débito, sem catraca — ela nasceria
vermelha) e a **P-65** acima. O **item 19** (`frontend-triagem-dos-audits-do-item-18`, os 49 achados
das quatro runs) foi escrito por esta worktree no `2bbaad01` e declarado ali: acrescentar item à
fila é do main tree com o João, e a reconciliação acontece neste fechamento.

**A narrativa do item 8 saiu daqui neste fechamento**, pelo mesmo motivo que a do item 17 saiu no
anterior: ela dizia que a `lane-c` tinha fechado o item 8 e repetia números de um gate que já não é
o corrente. A narrativa integral dele está neste arquivo desde 2026-08-27. Bloco encerrado não
guarda parágrafo no `state.md`.

---
## Fechado em 2026-08-27 — `frontend-hardening-final`, item 8 da fila

| Lane | Bloco | Frente | Árvore | Branch | Estado |
|---|---|---|---|---|---|
| `lane-c` | `frontend-hardening-final` (item 8) | Frontend | `../fix-frontend` | `refactor/frontend-hardening-final` | `ready_for_closure` (7 achados do review pagos) |

**Promoção do item 8 — 2026-08-26.** A `lane-c` estava `idle` desde o fechamento da fatia 2 do item
16; o João promoveu explicitamente o **item 8 — `frontend-hardening-final`** contra o `backlog.md`.
O item marca `Contexto: não por padrão`, então a lane nasce direto em `ready_for_planning` e
**não** há Context Packet: as cinco fontes do bloco (`D-03`, `D-33`, `D-35`, `P-46` e a herança da
`P-41`) são medição local, e as fichas vivem no repositório. A branch
`refactor/frontend-hardening-final` sai de `main@5550178a`, que já é `origin/main` — o PR #76
(fatia 2 do item 16) e o PR #77 (item 11 da `lane-b`) já mesclaram, então a árvore não está atrás.

**A linha de branch da `lane-c` estava velha, e foi corrigida nesta promoção.** O frontmatter dizia
`refactor/frontend-revisao-ui-f2 # fechada em 2026-08-25; ainda não mesclada`; era verdade em
`8d588511`, o `state_basis_commit` anterior, e deixou de ser quando o PR #76 mesclou em `5550178a`.
Não era divergência de fase — as duas fontes diziam `idle` —, mas o campo aponta para a branch da
lane e passou a apontar para a errada. `state_basis_commit` acompanhou.

**Fora de ordem em relação aos itens 4 a 7, e sem colisão.** A fila recomenda 4→9 para fechar
código, e os itens 4 a 7 são hardening de **backend**. O item 8 é frontend puro, então nenhum deles
disputa arquivo com ele; e o gate P-03 não é disparado, porque o bloco não toca `backend/`.
**Review de 2026-08-27 — 7 achados, os 7 aprovados pelo João e pagos.** A narrativa deles vivia no
campo `blocker` do `state.md` e desce aqui no fechamento, que é onde ela passa a viver:

- **Q-1** — a catraca do mini-reset lia só o **primeiro** `@layer base` e ignorava o que estivesse
  fora de layer, que é o idiom que o próprio `index.css` usa duas vezes e que **vence** os layers na
  cascata. Duas sondas vistas reprovar antes de a correção entrar.
- **Q-2** — `title={label}` incondicional excedia a spec §4.1: sobre texto visível idêntico o
  `title` vira *accessible description*, e o leitor de tela anunciava "Comercial, link, Comercial".
  Voltou a existir só colapsado.
- **Q-3** — o docblock do `KpiRow` justificava `pt` em vez de `mt-*` por uma classe que este bloco
  apagou, e a afirmação tinha **invertido**: o substituto mora em `@layer base`, que perde para
  `utilities`.
- **Q-4** — a tabela `Ocupação corrente` do `state.md` divergia do frontmatter na `lane-c`, e a
  invariante manda **parar** diante disso, não escolher fonte. Virou a regra que a tabela carrega.
- **Q-5** — `mergePt` substituía função sobre função, então o `onClick` do chamador sumia em
  silêncio desde que o D-33 cravou handler no `togglePt`. Chave `on[A-Z]` passa a **encadear**;
  resolver de nó continua com pins vencendo. Terceira reincidência da família — virou regra na
  `.claude/rules/frontend-fsliced.md`.
- **Q-6** — o mini-reset crava `list-style: none` em toda a aplicação e o WebKit tira a semântica de
  lista junto: 16 listas receberam `role="list"`, com régua de lint exigindo o atributo daqui pra
  frente.
- **Q-7** — o mini-reset apagou o marcador de 8 listas **fora** das famílias que a spec §5 mediu.
  Seis são ganho (`<li>` com borda ou card, onde o bullet era ruído); duas não — `FormErrorSummary`
  e `ImportResultSummary` são texto puro, e o João decidiu devolver o marcador às duas.

**O fechamento refez o DoD contra o código final, e não confiou no relatório de 2026-08-26.** As
medições originais são de `cde9ba4b`, e **quatro dos sete achados mexem exatamente no que elas
medem** — o `title` do rail (Q-2), o encadeamento que carrega o foco do olho (Q-5), o `role="list"`
(Q-6) e o marcador das duas listas (Q-7). O regate rodou no mesmo método (Chromium real, stack desta
árvore no offset +2, login `admin@lotus.cl` pela tela, `es-CL`) e está no mesmo audit: sete rótulos
legíveis a 390×844 com `<nav>` de 768px contra 844px, `title` presente colapsado e `null` a 1440px,
foco no `<svg>` do olho depois do Enter, as quatro famílias de lista sem marcador e com `role`, o
`list-disc` vencendo o mini-reset numa sonda de cascata com negativa, e o `IdentityCell` cortando
(118×102) com a sonda negativa empatando em 118.

**O regate achou uma borda, e ela virou ficha, não conserto de carona.** Varrendo **todo** `ul` do
Dashboard, dois ficam sem `role`: as legendas do Recharts. A régua de lint do Q-6 lê JSX e não
alcança lista que nasce dentro de biblioteca, enquanto o mini-reset, que é global por desenho,
alcança. É a **P-63** — alcance pequeno (legenda de gráfico, com `aria-label` próprio por item), e
não reabre o DoD 4.

**Gate do fechamento:** backend **940 passed / 5 skipped**; frontend lint 0, build verde,
**111 arquivos / 622 testes**. `pint` e `typescript:transform` **N/A por escopo**, provado e não
assumido: `git diff --stat main...HEAD -- backend/ frontend/src/shared/types/generated.ts` volta
**vazio**. Um caso reprovou na **primeira** execução da suíte do frontend, com os containers ainda
subindo, e passou nas cinco execuções seguintes — o suspeito é o `PeoplePage.test.tsx`, que depende
de `waitFor`; oito execuções isoladas dele sob carga de CPU não reproduziram, e o caso está
registrado no fechamento como flake observado, sem ficha.

**A `P-46` fechou e foi remedida**; nasceram a **P-63** e o **item 18** da fila (padronização de
estilização, que depende deste bloco e foi escrito durante ele). As fichas `D-03`, `D-33` e `D-35`
saíram do registro canônico do `backlog.md`, que é o que o próprio registro manda fazer no
`/fechar-sprint` do bloco que as paga.

**Merge da `main` para dentro, em 2026-08-28, com o gate refeito sobre ele.** A branch estava 32
commits atrás: entraram o `hardening-api-arquivos-e-abuso` (item 4, PR #78) e o
`cicd-ci-governanca-e-artefato` (item 11, PR #79), que trazem `clamav` no compose, limitadores de
taxa nomeados e `nginx` reescrito. Gate na árvore mesclada: backend **999 passed / 5 skipped**,
frontend lint 0, build verde, **111 arquivos / 622 testes**, e o **DoD refeito no navegador pela
terceira vez** — os números não mudaram (`<nav>` 768px contra 844px, `title` `null` nos sete a
1440px, foco no `<svg>` do olho, as quatro famílias com `role="list"` e sem marcador, `list-disc`
vencendo o mini-reset, `IdentityCell` 118×102 com a negativa empatando em 118). O `nginx` desta
árvore precisou de `docker compose rm -sf` antes de subir: o bind-mount do Docker Desktop guardava
o inode antigo de `docker/nginx/default.conf`, que o merge reescreveu — é ambiente, não código.

**A pendência nova foi renumerada no merge: nasceu `P-61` e virou `P-63`.** A `main` já trazia uma
`P-61` (os `title` do `ProblemDetails` em português) e uma `P-62`, vindas dos dois blocos acima —
mesmo precedente que renumerou a `P-38` para `P-41`.

---

## Fechado em 2026-08-26 — `cicd-ci-governanca-e-artefato`, item 11 da fila

**A `lane-b` fechou o `compose-por-worktree` em 2026-08-24, voltou a `idle` e recebeu o item 11 no
mesmo dia**, por promoção explícita do João. A narrativa do bloco anterior está em
`historico/state-archive.md`; a entrega, em `historico/progress.md`. Nenhuma lane recebe item novo
sozinha: promoção é do João, contra o `backlog.md`.

**Promoção do item 11 — 2026-08-24.** O `backlog.md` marca o item como `Contexto: sim`, então a lane
nasce em `context_required`: o Context Packet vem antes do `/planejar-bloco`, e o packet é do Codex
(`.agents/skills/lotus-context-packet`), em sandbox read-only. A branch sai de `main@6e8e8618`, que já
é `origin/main` — as três lanes anteriores mesclaram.

**Fora de ordem em relação ao item 10, de propósito.** O `backlog.md` recomenda `10→11→12`, mas o que
sobrou do item 10 é o `infra-producao-provisionamento-aws` (EC2, RDS, S3, SES, TLS), travado nas
quatro decisões do João que o bloco do runtime mediu como abertas. O item 11 é GitHub, GHCR e
governança de branch — **não toca conta AWS**. Quem depende de recurso real é o item 12
(`SSH EC2 → compose pull`), e ele continua atrás do 10. A dependência que o 11 realmente tem é o
runtime, e esse fechou em 2026-08-22 (PR #67): é a imagem dele que a CI vai construir e etiquetar por
SHA.

**A interseção que a seleção de 2026-08-22 previu não existe — medida e desfeita.** Aquela seção
escreveu que o `BD-15` e a futura CI tocavam `.github/workflows`; era previsão, não medição. O
Context Packet mediu: não há `.github/` nesta árvore, `git log --all -- .github/workflows` volta
vazio, e a PR #66 (BD-15) não lista o diretório. **Todo workflow deste bloco nasce do zero** — não há
o que preservar, e não há colisão a vigiar com a lane-c.

**Review do item 11 — 2026-08-25.** Bloco classificado **alto risco** (paga o mecanismo da lei §5.3
e faz merge, publicação em GHCR e mudança de configuração de repositório — ações externas
irreversíveis), então a revisão do gabarito veio acompanhada de uma segunda lente independente do
Codex, em sandbox read-only. Três achados aprovados pelo João e corrigidos no mesmo dia; a
divergência entre os revisores está registrada abaixo, não resolvida em silêncio.

- **Q-1 — o par `app`+`web` não era publicação atômica.** O `concurrency` do workflow usava
  `cancel-in-progress: true` com `group: ci-${{ github.ref }}`, e `github.ref` é constante para todo
  push em `main`: um segundo push cancelava o job `image` do primeiro no meio da publicação. Somado a
  isso, os dois alvos eram construídos **e** publicados em passos sequenciais, então uma falha comum
  de build entre eles deixava o SHA com meia release no GHCR. Corrigido em duas frentes: o
  cancelamento passou a valer só fora de `push`, e o job constrói os dois alvos antes de publicar
  qualquer um, com `scope` de cache separado por alvo e um passo final que **afirma** que os dois
  manifestos existem — o "release é o par" do DoD3 deixou de ser confiança em dois passos verdes.
- **Q-2 — "imutável" não estava garantido.** As quatro imagens base do `Dockerfile.prod` vinham por
  tag móvel, então reconstruir o MESMO commit meses depois publicaria um digest diferente sob a mesma
  tag de SHA — o objetivo §2 da spec inteira. As quatro passaram a ser fixadas por digest (capturados
  em 2026-08-25, com o comando de atualização no cabeçalho do arquivo). O que o digest **não** fixa é
  o índice do apk, e por isso o `image` ganhou uma guarda de idempotência: tag de SHA que já existe
  não se reescreve, e só se republica quando falta metade do par.
- **Q-3 — o `procedencia` confiava num trailer que nunca conferiu.** No corporativo a árvore limpa é
  o normal, não uma propriedade especial: bastava uma linha `Source-Commit:` inventada num push
  direto para o commit se passar por release de espelho — e essa é a única camada entre o push e uma
  imagem publicada, porque a branch protection é o que o plano free não dá. Agora o SHA do trailer
  precisa ser 40 hexadecimais **e** estar no histórico de `main` da origem
  (`compare/main...<sha>` = `identical` ou `behind`). Quem responde qual é a origem é a variável de
  repositório `ESPELHO_FONTE`, definida só em `Gatika-CL/lotus` — o arquivo segue sem nome de dono, e
  onde a variável não existe o caminho de espelho não abre. `Andred21/lotus` é público, então o
  `GITHUB_TOKEN` do corporativo faz a consulta sem PAT.

**Divergência entre os revisores, registrada.** O Codex levantou oito candidatos; três viraram os
achados acima depois de verificação própria no código, e os demais não passaram: um lia o escopo do
desenho ao contrário (a auto-restrição do caminho de espelho no repositório pessoal é intencional, não
um furo). Os dois sobre o `espelhar-corporativo.sh` eram reais e **o João mandou corrigir na mesma
rodada**: a lista de exclusões passou a sair do blob do commit espelhado, não do disco da árvore —
os dois leitores da lista voltam a ler a mesma versão, e o vazamento deixa de acontecer antes de o
destino reprovar —, e o script passou a recusar commit cujo CI não esteja verde, com a saída
`LOTUS_ESPELHO_SEM_CI=1` pela mesma razão que o `pre-push` tem a dele. Provado com `origin/main` em
`26d0e3e9`, que é a própria sonda vermelha: modo real aborta com `exit 1` antes de qualquer push, e
sujar a cópia local do `.espelho-exclusoes` não muda a árvore filtrada (`ecd187e9` nos dois casos).

**As correções provadas no gatilho real — 2026-08-25.** PR #75 mesclado em `ac078a80`, run
[32901859725](https://github.com/Andred21/lotus/actions/runs/32901859725): sete jobs,
`conclusion: success`, `procedencia` e `image` verdes, par publicado em `ghcr.io/andred21`. A guarda
de idempotência foi medida re-executando o job `image` no mesmo SHA — os quatro passos de build e
push saíram `skipped`, a verificação do par continuou rodando e os dois digests ficaram idênticos.
Só o `concurrency` fica sem prova direta: provar exigiria dois merges em segundos, e o custo não
paga o que a leitura do `github.ref` já diz. Evidência integral em
`audits/2026-08-24-cicd-evidencias.md`.

---

## Fechado em 2026-08-25 — `hardening-api-arquivos-e-abuso`, item 4 da fila

| Lane | Bloco | Frente | Árvore | Branch | Estado |
|---|---|---|---|---|---|
| `lane-a` | `hardening-api-arquivos-e-abuso` (item 4) | Backend | main tree | `feat/hardening-api-arquivos-e-abuso` | `ready_for_closure` |

**Promoção do item 4 — 2026-08-24, `lane-a`.** Promoção explícita do João com a lane em `idle`, contra
o `backlog.md`. O item é marcado `Contexto: sim`, então a lane nasce em `context_required`: o Context
Packet vem antes do `/planejar-bloco` e é do Codex (`.agents/skills/lotus-context-packet`), em sandbox
read-only. A branch `feat/hardening-api-arquivos-e-abuso` sai de `main@7fa1cb0a`, que já traz o merge
do item 11 (PR #71) — as lanes anteriores mesclaram. **Árvore:** main tree, seguindo o precedente de
todo bloco de backend; a **P-03 foi paga** pelo `compose-por-worktree`, então isso é escolha e não
mais imposição do compose.

**O espelho virou para a `lane-a` neste commit, com a `lane-b` em execução — e isso é o precedente da
P-55, não uma quebra.** `focused_lane` no main tree passa a apontar a lane que trabalha AQUI; a
`lane-b` mantém o espelho dela apontando para si em `../lotus-infra`, que é a árvore onde o
`/executar-bloco` dela roda. O bloco da `lane-b` em `lanes:` **não foi tocado por este commit** — ele
é dela, e a invariante de dono manda. A P-55 segue aberta e é do João.

**Evidência que já está medida e o packet não precisa redescobrir** (contra `main@7fa1cb0a`):
`Route::post('/login', ...)` em `Identity/routes.php:23` está **fora** do grupo `throttle:6,1`, que
começa só na linha 28 e cobre convite/recuperação; `Route::get('publico/certificados/{uuid}', ...)` em
`Certification/routes.php:7` está fora de qualquer middleware. `grep -rn throttle` sobre os
`routes.php` dos domínios e `backend/routes/` devolve **apenas** essas duas ocorrências do grupo de
Identity — nenhum outro throttle existe no repositório.

**Packet do item 4 recuperado — `status: ready`, quatro fontes, nenhuma `unavailable`.** Está em
`context-packets/2026-08-24-hardening-api-arquivos-e-abuso.md`. As quatro provenances que ele declara
(`base_commit` e os blobs de `state.md`, `progress.md`, `adrs.md` e `backlog.md`) foram **conferidas
contra `git hash-object` antes de gravar** e batem exatas — não são hash chutado.

**O packet corrigiu uma atribuição errada que o `backlog.md` carrega, e ela muda o desenho.** A nota
de proporção do item 4 fala da "sonda antimalware do `RNF-SEC-06`"; o Drive canônico diz que
`RNF-SEC-06` é **só rate limit** ("Rate limit para login, troca de senha e ações sensíveis") e que o
antimalware vem do **`RNF-SEC-08`** ("Upload de arquivos com validação de tipo/tamanho e escaneamento
antivírus (redatores operam de redes não auditadas)"). O requisito exige o **resultado** — escaneamento
— e **não nomeia** sonda, serviço, fornecedor, protocolo nem topologia; nenhuma fonte recuperada
prescreve mecanismo. Então a renegociação que a nota do backlog imagina **não é sobre forma**: forma
nunca foi exigida, e dispensar o resultado seria renegociação formal, do João. A correção da linha do
`backlog.md` fica para o `/fechar-sprint` deste bloco — planejamento não edita a fila.

**Brainstorming fechado — oito decisões (D1–D8), na spec.** As que mudam desenho: o antivírus é
ClamAV **síncrono** no compose e o `RNF-SEC-08` **não** é renegociado (D1); o throttle é teto global no
grupo `api` **mais** nomeados nos alvos, para rota nova nascer coberta (D2); a chave do login é
`email|ip` (D3); a política de tipo/tamanho vira peça única em `Shared/Files` com catraca (D4); o
`files.mime` histórico se corrige por **migration de backfill**, precedente da P-47 (D5); o PDF é
contido por limitador e teto, e persistir no S3 fica **fora** com ficha (D6); os quatro endpoints
abertos passam a aceitar **PDF + imagem** (D7); e scanner fora do ar **recusa** o upload, com a
consequência declarada (D8).

**Um pré-requisito que a medição achou, e um que ela desmentiu.** O `ProblemDetails` **não lê
`getHeaders()`**: o `429` já sai em `application/problem+json` pelo braço de
`HttpExceptionInterface`, mas sem `Retry-After` nem `X-RateLimit-*` — entra no bloco, é a Task 1 do
plano. Já o `trustProxies` **saiu**: o brainstorming o tratou como pré-requisito supondo que
`$request->ip()` devolvesse o container do Nginx, e a medição do plano mostrou o contrário — o PHP
recebe `REMOTE_ADDR` como o Nginx viu o peer, que em produção é o próprio cliente. Ligar
`trustProxies` faria o `X-Forwarded-For` **forjado pelo cliente** virar o `ip()`, e todo limitador
por IP passaria a contar um valor que o atacante escolhe. O bloco faz o oposto: o Nginx apaga o
`X-Forwarded-*` de entrada. A spec recebeu emenda datada (§9) e o plano abre com as três correções
de medição.

**Plano escrito — `plans/2026-08-25-hardening-api-arquivos-e-abuso.md`, 12 tasks.** Ordem por
dependência: envelope do `429` → IP do cliente → limitadores → catraca de rota → política de
arquivo → catraca de upload → `files.mime` e backfill → ClamAV → tetos de lote e import →
confirmação do ADR-11 → DoD contra a API real. `executor: claude` — o bloco toca a §5.4 do
`CLAUDE.md`, reverte um item aprovado da spec e deixa três tetos com gatilho de revisão durante a
execução.

**Medições que o plano fixou, e que o item 10 herda:** ClamAV 1.4 ocupa **1,014 GiB** residentes e
fica pronto em ~10 s (imagem de 146 MiB, base de assinaturas embutida — não há download no primeiro
`up`, ao contrário do que a spec §4.4 previa). O scan INSTREAM custa **17 ms** para 100 KB, **72 ms**
para 1 MB e **551 ms** para o teto de 10 MB, o que sustenta o scan síncrono sem worker (D1). A
emissão em lote **não** chama o Gotenberg — `IssueCertificateAction` não toca o conversor —, então o
teto de lote existe por duração de requisição e volume de escrita, não por renderização. E a
superfície de upload são **13 rotas, não 10**: `POST /api/redatores` e `PUT /api/redatores/{redator}`
aceitam `documents[<TIPO>]` **sem regra `file` nenhuma**.

**Bloco `hardening-api-arquivos-e-abuso` — 12 de 12 tasks completas, 2026-08-25.** A Task 12 (DoD
`executor: claude`) provou o bloco inteiro contra a API e o stack Docker reais, não só contra a
suíte: throttle nomeado + separação de chave (DoD 1), `429` e recuperação medida (~65s, DoD 2),
antivírus síncrono provado nos dois sentidos — EICAR real recusado e scanner fora do ar recusando
com `503`/`Retry-After` (DoD 3/4) —, mime por conteúdo nos quatro sítios antes destapados (DoD 5),
backfill de `files.mime` consistente (DoD 7) e o fluxo de ouro completo sem nenhum `429` (DoD 8).
A medição real (DoD 6) **corrigiu um teto do próprio plano**: `MAX_LINHAS` caiu de 500 para 100
depois que 500 linhas estourou o `max_execution_time` de 30s do PHP (bcrypt por aluno novo via cast
`hashed`, ~185ms/linha) — exercendo a autoridade que o plano já dava para essa situação exata, com a
medição completa no docblock e no commit `47b0c4fc`. O próprio gate achou um achado incidental fora
do brief: `generated.ts` estava desatualizado desde a Task 6 (`ContentClass` nunca tinha sido
exposto ao `typescript:transform`); regenerado e commitado (`528749a2`), aditivo puro. Suíte final
**983 passed / 5 skipped**, Pint limpo, working tree coerente com o plano. Narrativa completa e
todos os números medidos estão em `.superpowers/sdd/progress.md` (Task 12).

**Review do bloco — 2026-08-25, `/revisar-sprint`.** Alto risco (auth, migration, `generated.ts`,
certificados), então além da revisão Claude rodou a segunda lente do Codex em sandbox read-only; os
achados foram deduplicados e **cada achado que só o Codex viu foi verificado no código antes de
entrar**. Suíte reconferida no container: **983 passed / 5 skipped**, igual ao que o DoD registrou.
Sem órfãos: toda peça nova do bloco tem consumidor. Sete achados (Q-1 a Q-7) aguardam a decisão do
João sobre o que entra antes do fechamento — dois medidos ao vivo contra a API (`Q-1` e `Q-2`),
quatro verificados por leitura e um de higiene.

**Os sete entraram, por decisão do João, e os sete estão corrigidos com teste de regressão.** Cada
teste novo foi visto REPROVAR contra o código antigo (`git stash` na correção, roda, `git stash
pop`) antes de valer: 3 casos no `RateLimitTest`, 1 no `RedatorCrudTest`, 3 no
`SpreadsheetRowReaderTest` e 1 no `BackfillFilesMimeMigrationTest`. O que mudou de desenho:
`ContentClass` ganhou `TETO_AGREGADO_KB` — a garantia "quem recusa é sempre esta regra" era falsa no
único sítio que recebe vários arquivos no mesmo corpo, e agora tudo o que a política aceita cabe nos
12 MB do transporte; o teto do import passou a morder na linha **iterada**, dentro do leitor, porque
contado do outro lado do `yield` ele nunca via a linha em branco; o leitor de planilha passou a
despachar pelo MIME de **conteúdo**, e a isenção dele na catraca foi reescrita para dizer a verdade;
e a migration de backfill passa a **abortar** quando nenhum objeto pôde ser lido, ficando pendente
para o deploy seguinte em vez de marcar como aplicada com o histórico intacto.

**A catraca de política pegou a própria correção**, e isso é o guardrail funcionando: ao ganhar
`assertCabeNoTransporte`, o `ContentClass` passou a nomear `UploadedFile` e virou "sítio de upload"
aos olhos da varredura. A peça onde a política MORA foi isentada num predicado único
(`eAPropriaPeca`), compartilhado pelos dois casos que já a tratavam de formas diferentes.

**Um achado virou ficha em vez de conserto:** os `title` do `ProblemDetails` em português num produto
es-CL (**P-61**). O `detail` inglês do 429 — o único status que este bloco estreou — foi traduzido
aqui; traduzir os outros seis mexe em texto fora do escopo aprovado e é decisão de idioma de
produto, do João.

Suíte final **996 passed / 5 skipped**, Pint limpo nos 14 arquivos tocados, `pnpm build` verde.
`generated.ts` voltou a ser idêntico ao da `main`: o `ContentClass` recebeu `#[Hidden]` e saiu da
superfície de tipos do SPA, onde nunca teve consumidor.

**Gate de fechamento — 2026-08-25.** Suíte `996 passed / 5 skipped` no container, `pnpm lint` sem
achado e `pnpm build` verde, Pint `passed` nos 49 arquivos PHP do bloco, `typescript:transform`
rodado sem drift em `generated.ts`. O critério de aceite foi **reprovado contra a API real** em
`:8080`, não só contra a suíte, porque as sete correções do review entraram DEPOIS do DoD da Task 12:
login errado 5×`422` e depois `429` com `Retry-After: 59` em `application/problem+json`, com outro
e-mail no mesmo IP voltando a `422` (chave `email|ip`); QR público 30×`404` e depois `429`, com o
certificado real devolvendo `200` 62 s depois; ELF renomeado `.pdf` recusado com `422` e PDF legítimo
aceito com `201` no mesmo endpoint; ClamAV parado devolvendo `503` com `Retry-After: 30` e mensagem
distinta da de infecção, e `201` de volta assim que o serviço subiu; `POST /api/redatores` com três
PDFs somando 10,76 MB recusado pelo **teto do conjunto** (`422`, "El conjunto de archivos supera el
máximo de 10 MB"), e o mesmo endpoint com dois PDFs pequenos aceito com `201`; import de 101 linhas
recusado com `422` **e** import de 300 linhas em branco recusado igual — que é o achado Q-4 medido ao
vivo, porque contado do outro lado do `yield` o teto nunca via linha vazia; CSV com nome `.xlsx`
lido pelo `CsvReader` e devolvendo `200`, sem o `500` que o Q-5 descreveu.

**Uma medição do gate corrigiu o roteiro do DoD, não o código.** O EICAR canônico salvo como
`.pdf` é recusado pela política de **tipo** antes de chegar ao scanner (`guessExtension()` devolve
`txt`), e o EICAR embutido dentro de um PDF válido **passa** — `clamdscan --stream` sobre o mesmo
arquivo responde `OK`, porque a assinatura `Eicar-Test-Signature` é do arquivo canônico e não casa
embutida. Quem prova que o scan está no caminho do arquivo aceito é o cenário D8: com o `clamav`
parado, um PDF legítimo passa a receber `503`. Os dois fatos foram medidos, e nenhum deles é buraco
de código.

---
## Fechado em 2026-08-25 — `frontend-revisao-ui-por-modulo` (fatia 2 de 2), item 16 da fila

| Lane | Bloco | Frente | Árvore | Branch | Estado |
|---|---|---|---|---|---|
| `lane-c` | `frontend-revisao-ui-por-modulo` — **fatia 2** (item 16) | Frontend + 1 DTO de backend | `../fix-frontend` | `refactor/frontend-revisao-ui-f2` | `ready_for_closure` (3 achados do review pagos) |

**A fatia 2 do item 16 terminou a execução em 2026-08-25 e vai a review.** As 13 tasks do plano
foram executadas e provadas; o bloco vai a `/revisar-sprint`, **não a merge**. O que ele entrega:

- **A `D-57` paga inteira** — a cadeia da RN-16 carrega `TurmaDocumentType` do
  `TurmaHabilitacaoService` até os DTOs, e os **quatro** campos (`missing_types` ×2,
  `missing_document_types` e `present_types`, que era o mesmo defeito no mesmo DTO) tipam o enum no
  `generated.ts`. O helper `turmaDocumentTypeLabel` perdeu o fallback de código cru: agora é o `tsc`
  que barra string fora do enum, e não uma compensação em runtime.
- **Os Minors 2, 3 e 5 herdados do review da fatia 1** — hover alcançando a coluna presa, sombra de
  rolagem que a coluna cobria, e o slot `actions` do `DetailHeader` fora da linha de base.
- **Duas runs da `lotus-ui-review`, com relatório datado em `audits/`** — Comercial (3 achados: 1
  `C`, 2 `B`) e Certificados (4 achados, todos `B`, nenhum `C`). **Nenhum `C` fica aberto.** Quatro
  achados corrigidos com commit próprio e medida na tela antes e depois; três viraram ficha.
- **As réguas de aba medidas, e nenhuma tocada** — `[1134, 1134, false]` em 1440x900 e
  `[276, 276, false]` em 390x844 nas duas telas. `scrollable` não foi ligado: quem mede, liga.
- **Seis fichas escritas no `backlog.md`** — a decisão da `D-38` (de 2026-08-22, que a task cortada
  da fatia 1 nunca escreveu), a `D-57` baixada, e `D-58` a `D-62` abertas.

**O achado que a fatia expõe e não paga: `D-62`.** O mesmo defeito — `AppDropdown` de filtro sem
nome acessível, sempre na forma `<div className="w-48">` com o dropdown solto dentro — foi
encontrado por **três runs independentes em três dias** (UI-07 de Operação, UI-02 de Comercial,
UI-01 de Certificados), mais o seletor de turma da Emisión, que só tinha nome por acidente do
placeholder. Quatro correções idênticas e **nenhuma catraca**: a quinta ocorrência nasce verde.

**Gate completo (o bloco tocou `backend/`, então não é o gate de frontend puro):** frontend lint
`0`, build `0`, **109 arquivos / 602 testes** contra a baseline de 107/595 da Task 1; backend **938
passed / 5 skipped** contra 937/5; Pint `passed` nos 10 arquivos PHP tocados; `typescript:transform`
sem drift. **Desvio declarado:** o Step 6 da Task 13 previa um commit de gate com `git add -A`, e a
árvore já estava limpa — o gate não produziu arquivo, e os números vivem aqui e no commit deste
handoff, em vez de num commit vazio.

**Review da fatia 2 — 2026-08-25, três achados devolvidos, aprovados e pagos.** O bloco foi classificado
**alto risco** pela `/revisar-sprint` (toca DTO de backend e regenera `generated.ts`, lei §5.3), então
além da revisão Claude foi acionada a segunda lente do Codex em sandbox `read-only`. O Codex devolveu
dois achados; **um foi confirmado no código e virou a Q-1**, o outro foi confirmado parcialmente e
virou a Q-2. Nenhuma divergência entre as duas lentes ficou sem resolução.

- **Q-1 · 🟡 · P — `DetailHeader.tsx:96-101`.** O `sm:self-center` da Task 6 está no contêiner que
  carrega **`tags` e `actions` juntos**, e `align-self` sobrescreve o `items-baseline` do pai para o
  bloco inteiro: a tag sai da linha de base junto com o botão. O único consumidor com os dois slots é
  o `BudgetDetailPage`, que ainda tem `subtitle` alto (`IdentityCell` com avatar) — é o **UI-08 de
  2026-08-23 voltando espelhado**, na tela que a run 1 desta mesma fatia revisou. O Step 5 da Task 6
  pedia confirmar que "a tag continua na linha do título", e com esta forma isso não é satisfazível;
  o teste novo assere só a existência da classe. Alvo: `tags` e `actions` como itens flex irmãos, com
  `sm:self-center` só no invólucro de `actions`.
- **Q-2 · 🟡 · P — `OperationMetricsQueryTest.php:129-132`.** Três dos quatro campos da D-57
  (`present_types`, `TurmaComplianceData.missing_types`, `RedatorTurmaPendenciaData.missing_types`)
  mudaram de forma sem nenhuma assertiva na **borda HTTP** — só teste de `toArray()`, que agora afirma
  instâncias de enum. O comentário ao lado afirma que "o JSON da borda continua `["MANUAL"]`" e nada
  mede isso (lição 13). O comportamento hoje está certo — `json_encode` serializa `BackedEnum` pelo
  `value`, e `ConcludeTurmaTest.php:62` prova o mecanismo idêntico para o quarto campo —, mas a
  lacuna ficou **mais cara neste mesmo bloco**: com o fallback de `turmaDocumentTypeLabel` morto,
  mudança de forma não imprime mais o código cru, imprime nada. Alvo: três `assertJsonPath` no
  `DashboardEndpointTest`.
- **Q-3 · 🟢 · P — `brand-theme.css:347-357`.** As cores do hover do Lara (`#f1f5f9`,
  `rgba(255,255,255,.03)`) estão cravadas como literal sem catraca que reprove a divergência se as
  folhas do tema forem regeradas. Mesma classe da `D-62` que esta fatia abriu. O mecanismo do tema
  escuro foi conferido no review e **está correto** (`html.dark` por `useApplyTheme.ts:14`); o achado
  é só a ausência de catraca.

**Nenhuma violação das leis §5**, nenhum órfão (`TurmaDocumentType::values()` segue consumido por
`Turma.php:157`), nenhuma dependência nova. **Gate do frontend reconferido dentro do review**: lint
`0`, build `0`, **109 arquivos / 602 testes** — idêntico ao medido no handoff de execução. Backend e
Pint não foram reconferidos no review (exigem o container).

**Os três achados foram aprovados pelo João e pagos em `7e563910`, no mesmo dia.** Cada um entrou
com a sua guarda, e **as três guardas foram vistas reprovar por mutação temporária antes de entrar**
(lição 10 — guarda que nunca viu o defeito é cobertura fantasma):

- **Q-1** — `tags` e `actions` viraram itens flex IRMÃOS da linha do título, com `sm:self-center` só
  no invólucro de `actions`. O `justify-between` saiu, trocado pelo `sm:flex-1` do bloco do título, e
  o embrulho de mobile some a partir do `sm` por `sm:contents` — sem ele o `align-self` resolveria
  contra o embrulho, não contra a linha. O teste deixou de asserir "existe um `.sm:self-center` na
  árvore" (o que passava com o defeito presente) e passou a asserir a estrutura: wrappers separados,
  `self-center` só no de ações, e os dois dentro do `sm:contents`.
- **Q-2** — dois testes novos no `DashboardEndpointTest` medem a borda de `compliance_turmas`
  (`present_types` **e** `missing_types`, que saem de caminhos diferentes do `TurmaHabilitacaoService`)
  e de `pendencias_documentais`, que projeta por outro serviço. O comentário do
  `OperationMetricsQueryTest` deixou de afirmar a borda e passou a apontar para quem a mede.
- **Q-3** — a catraca entrou no `tests/brand-theme.test.ts`, ao lado das outras guardas de tema: ela
  compara o `--sticky-cell-tint` do `brand-theme.css` com o `background` do hover do DataTable no
  tema **commitado**, nos dois temas. Lê o commitado, e não a geração fresca, porque é o commitado que
  o navegador carrega — a igualdade "commitado == geração fresca" logo acima fecha a outra metade.
  Zero blocos casados também reprova: seletor que sumiu num upgrade é guarda cega.

**Gate completo depois das correções:** `pnpm lint` 0, `pnpm build` verde, **109 arquivos /
606 testes**, suíte do backend **940 passed / 5 skipped**, `pint` nos dois arquivos PHP tocados
`passed`, `typescript:transform` sem drift. A suíte do backend exigiu o `docker compose build app` +
`up -d --no-deps app` da **P-57** — a imagem desta árvore era anterior ao `memory-cli.ini` e o
comando do §6 morria por memória; é conserto de ambiente, não de código, e a ficha segue aberta.

**O que NÃO foi medido:** a confirmação visual do Q-1 no `/comercial/presupuestos/:id` em 1440x900.
Esta sessão não tem ferramenta de navegador, e a prova que existe é estrutural (jsdom não mede
layout). A régua da tela fica para quem rodar a `/lotus-ui-review` — vale a pena olhar antes do
fechamento, já que o Q-1 nasceu de um defeito que só a tela mostrou nas duas vezes.

**Promoção da fatia 2 do item 16 — 2026-08-25.** Decisão explícita do João, com a `lane-c` em
`idle`. O `backlog.md` marca o item como `Contexto: não por padrão` e a fatia 1 nasceu de medição
local (`audits/` + fichas `D-*`), então a lane entra **direto em `ready_for_planning`**, sem Context
Packet. A branch é nova — `refactor/frontend-revisao-ui-f2`, criada a partir de
`origin/main@7fa1cb0a`, que já traz os PRs #70, #72, #73 e #71 mesclados; a árvore estava em `HEAD`
solto sobre `2e3f5e42` e não em branch.

**A `D-57` entra no escopo por decisão do João**, e com ela o bloco deixa de ser frontend puro: a
correção é no DTO do backend, regenera `generated.ts` (lei §5.3) e exige o container `app`. **O gate
P-03 não é disparado** — a ficha foi paga pelo `compose-por-worktree` em 2026-08-24, e esta árvore
sobe stack própria pelo offset do `.env` da raiz. Esta árvore **ainda não tem `.env`**, então hoje
ela reclamaria a porta 8080 do main tree; escolher o offset é passo do plano, não suposição.

**Reincidência declarada da `P-55`.** A invariante do espelho manda que trocar `focused_lane` seja
fronteira durável do main tree, mas a `lane-b` está `executing` (item 11) e o espelho só aponta uma
lane por vez. Esta promoção aponta o espelho para a `lane-c` **na árvore da `lane-c`**, que é
exatamente o que a ficha registra como já feito por três lanes; `lanes.lane-a` e `lanes.lane-b`
ficam intocados. A ficha continua aberta e esperando a decisão do João.

**Fechamento — 2026-08-25.** O gate completo foi refeito nesta árvore, com o stack do offset +2 no
ar: frontend `pnpm lint` 0, `pnpm build` verde, **109 arquivos / 606 testes**; backend **940 passed /
5 skipped**; `pint --test` `passed` nos **11** arquivos PHP da branch; `typescript:transform` sem
drift (`git status` limpo depois de rodar). O critério de aceite foi provado **contra a API real**
(`http://localhost:8082`, login Sanctum com `Origin` + `Accept`), e não só pela suíte:
`GET /api/dashboard/metricas` devolve `present_types: ["MANUAL","PRUEBAS"]` e
`missing_types: ["EVALUACION_REDATOR"]`, e `GET /api/turmas/{id}` devolve
`missing_document_types: ["PRUEBAS","EVALUACION_REDATOR"]` — os quatro campos da `D-57` atravessam a
borda HTTP como string do enum, com o `generated.ts` tipando `TurmaDocumentType[]` nos quatro e o
`turmaDocumentTypeLabel` sem fallback.

**A medida que faltava foi feita: o Q-1 na tela.** `/comercial/presupuestos/1` em 1440x900, no
navegador, com a linha do `DetailHeader` medida: título `top 188 / bottom 220`, tag
`top 195 / bottom 221` — na linha de base do título —, e o invólucro de ações `top 196 / bottom 244`,
centrado por conta própria. O embrulho de mobile some no desktop (`display: contents`) e a linha
mantém `align-items: baseline`. É o que a narrativa da execução registrava como **não medido**, e o
defeito que voltou duas vezes só a tela mostrava.

**Pendências no fechamento.** A `P-03` e a `P-15` saem do rastro de `encerradas.md` — é o primeiro
fechamento posterior ao delas — e a `P-03` foi **remedida antes de sair**: o container `app` desta
árvore recebe `APP_URL=http://localhost:8082`, `FRONTEND_URL=http://localhost:5175`,
`SANCTUM_STATEFUL_DOMAINS=localhost:5175,localhost:8082` e `SESSION_COOKIE=lotus_session_8082`
injetados pelo compose, com o `backend/.env` da árvore ainda no offset antigo — a injeção vence, que
é exatamente o mecanismo que a ficha declarou pago. Nenhuma pendência nova nasceu: a única
suspeita levantada no gate (o `backend/.env` desta árvore em offset +1) foi **medida e descartada**,
porque o `printenv` do container mostra o offset +2 e o login pelo navegador funciona com o arquivo
restaurado.

**O item 16 NÃO sai do `backlog.md`.** A fatia 2 fechou Comercial e Certificados; **Cursos, Pessoas e
Administração seguem sem run**, e a régua de aba dessas telas segue sem medição. A ficha do item foi
atualizada com o que a fatia 2 entregou e com o que sobra para uma fatia 3.

**A branch `refactor/frontend-revisao-ui-f2` não foi mesclada** — o PR é o próximo passo, e a
integração é serial. A worktree `../fix-frontend` segue viva, e com ela a branch
`refactor/tabelas-coluna-de-acoes` do item 17, também sem merge.

**Merge da `main` para dentro, depois do fechamento (2026-08-25).** A `main` andou com o PR #74 da
`lane-b` (CI, hook `pre-push`, `CONTRIBUINDO.md` e espelho corporativo) mais a sonda de procedência
`26d0e3e9`; e, logo depois, com o PR #75 da mesma lane (espelho corporativo, `Dockerfile.prod` e o
review do item 11). **Um conflito só das duas vezes, no `state.md`**, e no frontmatter: a `main` carregava o snapshot da
`lane-c` em `ready_for_execution` (o espelho da P-55, escrito antes desta fatia executar) contra o
`idle` do fechamento. Resolvido pelo lado do fechamento — é o estado que a entrega prova —, sem tocar
`lanes.lane-a` nem `lanes.lane-b` — no merge do PR #75 a linha da `lane-b` na tabela de ocupação veio
da `main` (`reviewing`) e só a da `lane-c` ficou com o lado do fechamento. **Gate refeito sobre o
merge:** `pnpm lint` 0, `pnpm build` verde,
**109 arquivos / 606 testes**, backend **940 passed / 5 skipped**.

**Estado: `idle`.** Próxima ação: o João escolher o próximo item do `backlog.md`. Nada foi promovido.
`state_basis_commit` da lane continua em `8d588511`, o commit que prova a entrega fechada; o SHA do
próprio fechamento não entra no arquivo que ele fecha.

---

## Fechado em 2026-08-24 — `certificacao-historico-do-aluno`, item 2 da fila

| Lane | Bloco | Frente | Árvore | Branch | Estado |
|---|---|---|---|---|---|
| `lane-a` | `certificacao-historico-do-aluno` (item 2) | Backend/Frontend | main tree (gate P-03) | `feat/certificacao-historico-do-aluno` | `ready_for_closure` |
| `lane-b` | — | — | — (destruída) | — (destruída) | `idle` |
| `lane-c` | — | — | `../fix-frontend` (detached em `cad0d1fb`) | — (mesclada) | `idle` |

**Promoção de 2026-08-24, explícita do João.** O item 2 da fila entra na `lane-a`, no main tree por
causa do gate P-03 (o bloco toca backend), em branch nova nascida de `main@cad0d1fb`. O backlog
marca `Contexto: sim`, então a lane nasceu em `context_required` e o Context Packet veio do Codex,
pela skill `lotus-context-packet` de `.agents/skills/`, em sandbox read-only — validado contra o
contrato (marcadores exatos, frontmatter completo com `plan_path`/`spec_path` em `null`, 7 key facts,
Figma registrado `unavailable` com a linha de erro decisiva) e salvo em
`context-packets/2026-08-24-certificacao-historico-do-aluno.md` com `status: partial`, que prossegue.
A única fonte indisponível é o Figma, e a limitação é declarada: **nenhuma afirmação de fidelidade ao
protótipo** entra no planejamento. O bloco **absorve a P-15** — a ficha segue aberta em
`pendencias/abertas.md` e só sai no fechamento. `focused_lane` passa de `lane-c` para `lane-a` neste
mesmo commit, que é a fronteira durável exigida pelas invariantes.

**Rastro de merge corrigido neste commit.** O `state.md` anterior (`8a4df32a`) descrevia as branches
da `lane-a` e da `lane-c` como não mescladas. Em `cad0d1fb` as duas já entraram:
`refactor/frontend-revisao-ui` pelo **PR #69**, e `feat/hardening-acesso-ownership-e-integridade` não
consta mais em `git branch -a --no-merged main`. A worktree `../fix-frontend` continua existindo, em
detached HEAD no mesmo `cad0d1fb`; por isso o `branch` da `lane-c` é `null` e o `tree` não é.

**A `lane-b` fechou o item 10 em 2026-08-22** — `infra-producao-runtime-e-aws`, mesclada no
**PR #67** (merge `31f91987`), narrativa em `historico/state-archive.md`. A worktree
`../lotus-infra` e a branch `infra/producao-runtime-e-aws` **foram destruídas depois do merge**, por
decisão do João e pelo mesmo precedente da lane que fechou o BD-15; por isso `tree` e `branch` dela
são `null`.

**A `lane-c` fechou o item 16 (fatia 1 de 2) em 2026-08-24** e voltou a `idle`; a narrativa está em
`historico/state-archive.md` e o item 16 segue na fila com a fatia 2. Interseção a vigiar entre as
lanes: nenhuma — só a `lane-a` está ocupada.

**Execução concluída em 2026-08-24; a lane-a passa a `ready_for_review`.** As oito tasks do
`active_plan` foram executadas por `subagent-driven-development` no main tree, cada uma com review de
task própria (o ledger fino está em `.superpowers/sdd/progress.md`). A Task 8 é o gate de navegador
do DoD e **pagou o próprio custo**: achou um defeito que a suíte, o build e o lint não viam — sob
`React.StrictMode` o `useBlobTabOpener` deixava a trava de unmount armada depois da remontagem, e o
PDF abria em `about:blank` tanto na coluna nova quanto no `/certificados` que já estava pronto.
Consertado com teste provado vermelho em `bec9c2e8`.

Os oito itens do DoD passaram contra a API real, incluindo revogação e reemissão de verdade, o PDF
conferido com `pdfinfo` e a coluna percorrida nos três idiomas pelo seletor, sem F5. Suítes finais:
backend **937 passed / 5 skipped**, frontend **102 arquivos / 572 testes**, lint limpo, build verde.
A **P-15 foi encerrada** (a decisão que ela esperava saiu: certificados no detalhe do aluno; a coluna
da listagem fica fora por escrito, spec §9) e a **P-59 foi aberta** (`config/app.php:75` fixa
`'timezone' => 'UTC'` como literal e ignora o `APP_TIMEZONE` do `.env`) — nasceu `P-55` nesta branch
e foi renumerada no merge da `main`, que já usava o número.

**Review feita em 2026-08-24, e as três correções aprovadas entraram.** Classificação de risco:
ALTO (toca `generated.ts`, DTO de documento legal, fronteira de domínio e RBAC), então além do
gabarito do projeto rodou a revisão independente do Codex, em sandbox read-only. Sem órfãos e sem
violação das leis §5. Os três achados 🟢 foram aprovados pelo João e corrigidos:

- **Q-1** (`5b91bc48`) — o `display_status` congelava no fetch e o `AppProviders` desliga
  `refetchOnWindowFocus`: aba aberta na virada da meia-noite afirmava `vigente` sobre certificado
  vencido. As quatro queries que carregam o campo passam a revalidar no foco, com catraca que monta
  o QueryClient com o MESMO default do app. Limite declarado: aba que nunca perde o foco só corrige
  no remonte.
- **Q-2** (`80506ed9`) — `StudentTurmaData::fromModel` perdeu o `= null` do summary: ausência de
  certificado é significado na coluna, e default silencioso deixava projetá-la sem querer.
- **Q-3** (`7b64cfd8`) — o ramo do aviso do PDF (popup bloqueado e mensagem de erro) ganhou catraca,
  em arquivo irmão porque a régua de 150 linhas de `components/**` vale para o teste.

**Divergência de revisores, registrada e NÃO alterada:** o Codex reportou que a coluna expõe id,
código e estado do certificado sob `identity.user.view`, enquanto o PDF exige
`certification.certificate.view` — role com um e sem o outro lista e dá 403 no clique. É decisão
registrada (spec D11 e §7, "consequência aceita"), então não é achado. Fica a correção factual: a
spec diz "role **futura**", e o `PermissionCatalog` compõe role customizada hoje — a combinação já é
alcançável. Não virou pendência nem item de backlog; o João decidiu aplicar só Q-1 a Q-3.

Gate depois das correções: backend **937 passed / 5 skipped**, frontend **105 arquivos / 577
testes**, lint limpo, build verde.

**A `lane-a` fechou o item 2 em 2026-08-24** — `certificacao-historico-do-aluno`, narrativa integral
em `historico/state-archive.md` e entrega em `historico/progress.md`. A branch
`feat/certificacao-historico-do-aluno` nasceu de `main@cad0d1fb`, mescla a `main` de PR #72 para
dentro neste commit e vai a PR; a árvore é o main tree, que não se destrói. A lane não recebe item
novo sozinha: promoção é do João, contra o `backlog.md`.

**Gate refeito sobre a `main` de PR #72, dentro do merge:** backend **937 passed / 5 skipped**,
frontend lint 0, build verde e **107 arquivos / 595 testes**, Pint `passed` nos 18 arquivos PHP do
bloco. O merge pediu três consertos de conteúdo, não de marcador: a `HistorialTable` ficou com a
coluna presa e a largura por política da `main` **e** com o `display_status` do servidor deste
bloco; a tabela de turmas do detalhe do aluno perdeu os `style` literais e passou a declarar
largura, com a chave `certificate` nova em `studentTurmaWidths` (pesa como `COL.text` — a célula
empilha código, tag, data, marca de reemissão e o botão do PDF); e as duas pendências abertas por
este bloco foram renumeradas para **P-59** e **P-60**, porque a `main` já usava `P-55` e `P-56`. Os
3 casos de `tests/compose-dev.test.ts` que reprovavam aqui eram a **P-58** de novo — o
`frontend/.env` desta árvore com `VITE_API_URL` legado —, e a árvore adotou o molde do
`frontend/.env.example` (arquivo gitignored, nada commitado).

**O que a `main` trouxe e a `lane-a` NÃO refaz:** o `compose-por-worktree` pagou a **P-03** em
2026-08-24, depois que este bloco já rodava. O gate P-03 citado na narrativa arquivada deste bloco
fica como está — era verdade no dia da promoção, e narrativa arquivada não se reescreve.

---

## Fechado em 2026-08-24 — `tabelas-coluna-de-acoes-e-largura` (item 17 da fila)

**A `lane-c` recebeu o item 17 em 2026-08-24, por promoção explícita do João** contra o
`backlog.md`, com a árvore em `idle`. O item declara `Contexto: não`, então a rota é direta a
`ready_for_planning` e `context_packet` permanece `null` — não há fonte externa a recuperar; a
evidência do bloco é medição local de 2026-08-24 (15 sítios de `AppDataTable`/`SearchableTableFrame`,
12 com coluna de ação, 2 presas).

A branch anterior da lane, `refactor/frontend-revisao-ui`, **foi mesclada** no **PR #69** (merge
`cad0d1fb`) — o registro acima, que a dava como não mesclada, ficou velho no fechamento da fatia 1 e
é corrigido aqui. A worktree `../fix-frontend` estava em detached HEAD sobre esse merge; a branch
`refactor/tabelas-coluna-de-acoes` nasce dele. Não há rebase pendente: `cad0d1fb` **é** a `main`.

**As 17 tasks do plano foram executadas e provadas em 2026-08-24**, da peça de vocabulário
(`ec5aaef3`) ao registro de medição (`a31a23a4`), mais o corretivo `ea280fe1` e a varredura de
arquivados `722d5e35`, ambos decididos pelo João. A prova end-to-end está em
`docs/superpowers/audits/2026-08-24-tabelas-coluna-de-acoes-e-largura-medicoes.md`: 12 tabelas × 3
viewports com a coluna de ação presa dentro da moldura, 7 visões arquivadas com o par do rastreio
em 10%/14%, 3 tabelas sem ação sobre o orçamento cheio, e a catraca de ESLint vista reprovando as
duas sondas antes de ser ligada. Gate final: lint 0, build verde, 101 arquivos / 561 testes. A
review rodou em 2026-08-24, e o resultado dela é o parágrafo abaixo.

**A review de `/revisar-sprint` classificou o bloco como BAIXO RISCO** — frontend puro, sem
migration, `generated.ts`, auth, auditoria, RBAC nem dinheiro —, logo sem a segunda lente do Codex.
Gate reconferido na árvore: `pnpm lint` 0, `pnpm build` verde, 101 arquivos / 561 testes. Nenhum
órfão: as 10 classes de `COL` têm consumidor e os 13 `*Columns.ts` novos são importados. Quatro
achados, todos de esforço P e nenhum bloqueante de merge por si:

- **Q-1 🟡** `LARGURA_MATRICULA_ARQUIVADA` é const enquanto a coluna de ação de
  `ArchivedEnrollmentsList` sai com `registroBloqueado`: os 10% sem dono reescalam o par de
  `ARCHIVED_COLUMN`, que existe justamente para render 10%/14% iguais nas 7 arquivadas. O irmão
  `enrollmentWidths(acao)`, doze linhas acima no mesmo arquivo, já resolve esse caso.
- **Q-2 🟡** léxico dividido entre `<entidade>Widths` (inglês, função) e `LARGURA_<ENTIDADE>`
  (português, const) nos 13 arquivos novos, e dentro de `OrcamentoOpcoes` / `ColClass`.
- **Q-3 🟢** o docblock de `style.ts` promete que a largura declarada vira LEI, enquanto a §4 da
  própria medição registra desvio de até 3,5 pontos quando o `rem` da ação não vale os 10%.
- **Q-4 🟢** a catraca `COLUNA_SEM_LARGURA` exige a presença de `style`, não de largura.

**O João aprovou os quatro em 2026-08-24 e os quatro foram aplicados.** Q-1 passou
`!registroBloqueado` a `archivedEnrollmentWidths`; Q-2 unificou o léxico — todo consumidor exporta
`<entidade>Widths` e é FUNÇÃO, inclusive onde não há variação, e a peça de `shared` passou a
`{ weight, cap }` / `TableWidthOptions { actions, archived }` / `ACTIONS_RESERVE`; Q-3 trocou a
promessa de LEI por RAZÃO nos docblocks de `columnWidth.ts` e `style.ts`, com o caso medido da
`HistorialTable`; Q-4 partiu a catraca em dois seletores de um nível — coluna sem `style` e coluna
com `style` que não é `MemberExpression` nem `CallExpression`.

A grafia encadeada do `:has` reprovou de novo, agora medida nas duas direções: a sonda de quatro
colunas acusou as QUATRO, legítimas inclusive. A forma que passou desce pelo caminho do nó
(`[value.expression.type=…]`), e a sonda final acusou 2 de 4, as certas. Gate reconferido: lint 0,
build verde, 101 arquivos / 561 testes — mesma contagem, nenhum teste novo (a ramificação `actions`
já tem prova em `columnWidth.test.ts`, e o corte de teste do projeto é hooks, não módulos de
coluna). O registro está na §8 do audit. Nenhum achado pendente.

Interseção a vigiar entre as lanes vivas: nenhuma — `lane-a` e `lane-b` seguem em `idle` e o item 17
é frontend puro (`frontend/src/**`), sem toque em `backend/` nem em `generated.ts`, logo sem gatilho
da P-03. Integração segue serial.

---

## Fechado em 2026-08-24 — `compose-por-worktree`, fora da fila (ficha `P-03`)

| Lane | Bloco | Frente | Árvore | Branch | Estado |
|---|---|---|---|---|---|
| `lane-a` | — | — | main tree | `feat/hardening-acesso-ownership-e-integridade` (não mesclada) | `idle` |
| `lane-b` | `compose-por-worktree` (paga a **P-03**) | Infra | `../lotus-infra` | `infra/compose-por-worktree` | `ready_for_closure` (review de duas lentes; Q-1 a Q-4 corrigidos) |
| `lane-c` | — | — | `../fix-frontend` | `refactor/frontend-revisao-ui` (não mesclada) | `idle` |

**A `lane-a` fechou o item 3 em 2026-08-23 e voltou a `idle`.** A branch
`feat/hardening-acesso-ownership-e-integridade` traz a `main` de volta pelo merge que registra este
estado e **ainda não foi mesclada** — é o PR aberto. A lane não recebe item novo sozinha: promoção é
do João, contra o `backlog.md`.

**Promoção de 2026-08-24, explícita do João: a `lane-b` reabre para pagar a P-03.** A decisão foi
paralelizar a fila e o gatilho formal da ficha venceu — a fila pendente tem quatro blocos de backend
(itens 4, 5, 6 e 7) e o compose monta o main tree com portas fixas, então só uma lane de backend
cabe. O bloco `compose-por-worktree` transforma em mecanismo o override efêmero de 2026-08-19
(portas parametrizadas, `COMPOSE_PROJECT_NAME` por árvore, binds da árvore corrente) e é o que
destrava a segunda lane de backend. Ele **não é item do `backlog.md`**: nasce da ficha `P-03`, que
sai de "travadas em decisão" para "agrupadas em bloco" no mesmo commit e só fecha no
`/fechar-sprint` deste bloco. `Contexto` não se aplica — a fonte é interna, a própria ficha. Depois
dele a lane segue para os itens 10 → 11 → 12 da fila, que é a frente de infra/CI e não colide com
código de aplicação. A worktree `../lotus-infra` foi **recriada** a partir de `main@cad0d1fb`; ela e
a branch `infra/producao-runtime-e-aws` tinham sido destruídas depois do PR #67, que fechou o item
10 anterior (`infra-producao-runtime-e-aws`, merge `31f91987`, narrativa em
`historico/state-archive.md`).

**As linhas de `lane-a` e `lane-c` acima são o retrato de `cad0d1fb`, não o estado vivo delas.** As
duas foram promovidas em 2026-08-24 e executam agora — a `lane-a` o item 2 no main tree e a `lane-c`
o item 17 em `../fix-frontend` —, cada uma registrando isso no `state.md` da própria branch, como
manda a divisão por dono. Esta cópia só reconcilia com elas na integração serial. **Interseção a
vigiar:** este bloco toca `docker-compose.yml`, `docker/` e `.env.example` na raiz; nenhuma das
outras duas lanes tem esses arquivos no escopo declarado.

Interseção a vigiar entre as lanes vivas: nenhuma — as três estão em `idle`. A `lane-c` fechou o
item 16 (fatia 1 de 2) em 2026-08-24, depois de trazer a `main` para dentro pelo merge `8a4df32a`;
a narrativa dela está em `historico/state-archive.md`. Integração segue serial: é esta branch que
mescla a seguir.

---

## Fechado em 2026-08-24 — `frontend-revisao-ui-por-modulo`, item 16 da fila (fatia 1 de 2)

### Registro da lane — verbatim do `state.md`

**A `lane-c` é a worktree `../fix-frontend`, e o registro dela nasceu atrasado.** A lane executava o
item 16 desde 2026-08-22 sem existir em `lanes:` — corrigido na reconciliação de 2026-08-22
(`79c246c6`). Duas irregularidades ficam **declaradas, não descobertas depois**:

- **`active_plan` era `null` com a lane em `executing`**, contra a invariante que o exige a partir
  de `ready_for_execution`. A exceção decidida pelo João em 2026-08-22 **expirou no mesmo dia**: a
  spec (`ffa1a35b`) e o plano de 13 tasks (`8e865589`) foram escritos na worktree, e os dois campos
  apontam para eles desde então. O que a `main` registrava como `null` era o atraso do espelho, não
  a ausência do artefato.
- **O item 16 foi acrescentado ao `backlog.md` pela worktree** (`eaa9e15c`), contra a invariante que
  reserva ao main tree acrescentar item à fila. O texto **não foi duplicado aqui** por decisão do
  João: duplicá-lo garantiria conflito no merge sem ganho. Ele entra na main pelo merge da lane e
  sai no `/fechar-sprint` dela. Até lá, **a fila canônica do item 16 mora na branch**, não neste
  tree.

> **Divergência de lane resolvida no merge de 2026-08-23 (main → `lane-a`), por medição.** A `main`
> trazia a `lane-c` em `idle`, com `tree` e `branch` `null` e
> `last_completed_work_item: BD-15-docs-guardrails-e-sincronizacao` — o registro **anterior** à
> reatribuição dela ao item 16, que o `state.md` da própria `../fix-frontend` também ainda carrega.
> A branch da `lane-b` saiu da `main` antes da reconciliação de `79c246c6` e por isso não a viu.
> Quem decidiu não foi a heurística de "mais recente vence": `git worktree list` mostra
> `/home/jvbat/projetos/fix-frontend` viva em `refactor/frontend-revisao-ui`, com commits até
> `1b9f82ad`. O registro que casa com a realidade é o desta branch, e é o que fica.


> **Rótulo de lane reconciliado no merge de 2026-08-24.** As três seções abaixo foram escritas na
> worktree `fix-frontend` chamando o item 16 de `lane-a`, porque a branch nasceu antes de a `main`
> reatribuir as lanes. Quem manda é a `main`: o item 16 é da **`lane-c`**, e a `lane-a` fechou o
> item 3 em 2026-08-23. Os títulos foram corrigidos; as menções a "lane-a" dentro do texto ficam
> como foram escritas — história não se reescreve, e esta nota é o que as traduz.

### Lane-c — 2026-08-22: item 16 promovido, com duas exceções declaradas

Promoção explícita do João (sessão 2026-08-22), com a lane-a em `idle`: item **16**
(`frontend-revisao-ui-por-modulo`) da fila, rota direta a `planning` — o bloco nasce de medição
local (`audits/` + fichas `D-38`/`D-39`), sem fonte externa, então `context_packet` fica `null`.

Duas exceções decididas na abertura, não descobertas na execução:

- **Docs de `docs/superpowers/**` escritos na worktree `fix-frontend`**, contra a invariante que os
  reserva ao main tree. O próprio item 16 nasceu nesta branch (`a259cf80`, `eaa9e15c`) e ainda não
  chegou à `main`; escrever no main tree criaria dois backlogs divergentes.
- **A branch `refactor/frontend-revisao-ui` continua**, com merge só no fim. Ela já carrega código
  do item 16 — `ac4eef8a` (os seis defeitos de `shared/ui` do Dashboard) e `a36be316`.

Registro corrigido: a tabela de seleção multi-lane chama `feat/feedbacks-resolver-escopo` de "não
mesclada"; ela está na `main` desde `15e6a72e` (PR #65).

Corte da fatia (decisão do João): três superfícies em série — Dashboard view `ready-redator`,
Operação (`/operacion` + detalhe) e Comercial (`/comercial` + detalhe). O resto do item 16 fica
para um bloco irmão. **A P-47 não fecha aqui**: o acesso de redator é provisionado pelas portas
reais da API e devolvido no fechamento.

### Lane-c — 2026-08-23: fatia 1 vai a review com escopo cortado pelo João

O bloco `frontend-revisao-ui-por-modulo` sai de `executing` com as **Tasks 1 a 9 executadas e
provadas** (duas runs de `/lotus-ui-review`, 14 achados corrigidos: 5 da run 1 + 9 da run 2) e as
**Tasks 10 a 13 NÃO executadas**, por decisão explícita do João em 2026-08-23 ("quero seguir logo
para o review"). Não é conclusão de plano: é corte de escopo declarado.

Fica em aberto, e a triagem do review herda:

- **Run 3 (Comercial)** — Tasks 10 e 11 do plano, nunca rodadas.
- **Fichas `D-*` da Task 12** — a UI-04 da run 1 (janela da agenda, backend) e a recusa em espanhol
  fixo de `Turma.php:200` (metade da UI-01 da run 2) seguem sem ficha no backlog; `D-38` e `D-39`
  seguem sem a atualização que a task previa.
- **Minor 2, 3 e 5 da revisão da Task 9** — hover coberto pela coluna fixa, sombra de rolagem
  escondida, slot `actions` do `DetailHeader` reposicionado pelo `items-baseline`.
- **Banco de dev não devolvido** (Task 13 Step 1): o papel `redator` concedido na Task 3 segue no
  usuário 1. A devolução foi tentada nesta sessão e recusada pelo classificador de permissão.
- **Stack `lotus-infra` (lane-b) parada** desde a Task 3 para liberar 8080/3307/8025/9000;
  reversível com `docker compose up -d` em `/home/jvbat/projetos/lotus-infra`.

Gate rodado mesmo com o corte: fence `main...HEAD -- backend/ generated.ts` **vazio**, `pnpm lint` 0,
`pnpm build` verde, suíte **96 arquivos / 513 testes**, zero achado `C` aberto nas duas runs. O
destino de cada achado está na §3 dos dois relatórios em `docs/superpowers/audits/`.

### Lane-c — 2026-08-24: review da fatia 1, 4 achados, os quatro corrigidos

**Classificação: BAIXO risco** — uma lente, sem revisão independente do Codex. A fronteira do bloco
foi provada, não suposta: `git diff main...HEAD -- backend/ frontend/src/shared/types/generated.ts`
devolve **zero arquivo** em 30 commits. **Órfãos: limpo** — todo símbolo novo tem consumidor, o
`useIsCompactViewport` segue exportado do `useViewport.ts` que o substituiu, e as duas chaves de
locale que ficaram órfãs saíram das três. **Leis §5: nenhuma ferida.**

Os quatro achados foram aprovados pelo João e corrigidos, um commit por achado:

- **Q-1 🟡 (`6e38a90f`)** — o link da pendência do redator, corrigido em `d573c568`, levava à turma
  certa e à **aba errada**: a página abria em `useState(0)` (Configuración) e a documentação é o
  quarto dos cinco painéis, que em 390x844 nasce fora da régua. O docblock da lista e a §3 do
  relatório de 2026-08-22 já afirmavam o destino que o código não entregava. A aba passou a ter
  nome (`TURMA_TABS`) e a viver na URL (`?tab=docs`). Três catracas: nome→índice, URL→aba e a
  **ordem dos cinco painéis** — sem a terceira, as duas primeiras provariam uma convenção que o
  JSX não segue.
- **Q-2 🟡 (`ae6b1079`)** — `TurmaConfigCard` e `RedatorDesignation` escondiam a escrita pela RN-15
  e **nunca pela permissão**; `operation.turma.update` e `operation.turma.assign_redator` existem
  no `TurmaController` e nenhuma tela as consultava. Pesava porque este bloco passou a mandar o
  redator para essa página: com `turma.view` e `submit_docs`, ele recebia três controles que só
  rendem 403. Predicado único nos dois arquivos, com catraca por componente e sessão real no store.
- **Q-3 🟡 (`17459d46`)** — `scrollable` tinha nascido ligada **por padrão** no `AppTabView` a
  partir de uma medição feita numa tela só, e o default alcançava os quatro `ModuleTabs`
  (Comercial, Administración, Personas, Certificados), **nenhum medido** — ainda por cima com a run
  de Comercial cortada do escopo. Voltou a ser pedida por sítio; a tela da turma pede, as outras
  quatro pedem quando forem medidas (bullet no item 16 do backlog).
- **Q-4 🟢 (`cebed9b2`)** — quatro sítios montavam a chave de tradução por template e nada ligava o
  union `TurmaDocumentType` às chaves que ele pressupõe: tipo novo imprimiria
  `operation.documents.type.EVALUACION_XPTO` na tela. Mapa único
  (`Record<TurmaDocumentType, string>`, exaustivo por compilador) + catraca das 3 locales. A raiz —
  o DTO tipar `missing_types` como `string[]` — é backend e virou **D-57**.

**Gate re-rodado sobre a árvore corrigida, não herdado:** `pnpm lint` exit 0, `pnpm build` verde,
suíte **99 arquivos / 534 testes** (entrada do review: 96 / 513 — os 21 testes novos são as
catracas dos quatro achados).

**O que a triagem NÃO reabriu**, porque é decisão registrada e não achado: run 3 (Comercial),
fichas `D-38`/`D-39`, Minors 2/3/5 da Task 9, banco de dev com o papel `redator` no usuário 1 e a
stack `lotus-infra` parada. Tudo isso segue na seção de 2026-08-23 acima, e é herança do
fechamento — não deste review.

**Depois do review, reportes do João sobre a `TurmasTable` e nenhum achado novo.** Foram duas
rodadas na mesma tabela, e a segunda é a lição:

- **`ecc3ca75`** — "parecendo comprimida". Quatro colunas declaravam largura e três não, e com
  `table-layout: auto` a sobra vai inteira para quem NÃO declarou: as duas tags e o numeral ficaram
  com ~230px cada num contêiner de 1447px, enquanto o nome do curso quebrava em duas linhas. A
  regra virou *toda coluna declara largura, menos a que absorve a sobra*; o filtro de estado saiu
  para `TurmaStatusFilter` porque as três larguras novas passaram a tabela da régua de 150 linhas.
- **`b2075480`** — a mesma queixa de novo, e o motivo: trocar o sorteio da sobra por um
  destinatário fixo é o mesmo defeito com outro dono. CURSO foi a **519px** em 1603px, metade
  vazia, com CLIENTE ainda truncando em 222px. A largura passou a **porcentagem** (91% + a coluna
  de ações em `rem`, que é a única que não deve escalar): em porcentagem não há sobra a repartir, e
  o `min-content` segue protegendo a tela estreita. A pergunta certa não era "quanto mede cada
  coluna" e sim "para onde vai a sobra" — as três medições ficaram no docblock de
  `turmaColumns.ts`.
- **`d3779709`** — no mesmo quadro, o avatar do `IdentityCell` virava **elipse**: item de flex
  encolhe por padrão, e quando o texto ao lado transbordava o avatar cedia largura e mantinha
  altura. Ovalizavam exatamente as linhas cujo nome truncava. `shrink-0` corrige nos 14 sítios, nas
  duas formas.

Nenhum dos três tem prova de navegador — a stack de dev segue parada.

O João também aprovou o padrão da coluna de ações da mesma tabela (ícones à direita, presa ao
invólucro que rola) **para todas as tabelas do sistema**, e pediu que não poluísse esta execução:
virou o **item 17** do backlog, com a evidência medida (12 tabelas têm coluna de ação, 2 a prendem)
e com a política de largura junto.

O fechamento **não foi executado** — é a próxima instrução, por `next_action: close_active_work_item`.

### Fechamento — 2026-08-24: o gate rodou duas vezes, e a segunda é a que vale

**A `main` entrou antes do fechamento, por decisão do João.** O `/fechar-sprint` parou no item 8 ao
medir o tamanho do fork: a branch estava **90 commits atrás** e os arquivos que o fechamento
precisa escrever eram um retrato de três blocos atrás — o `backlog.md` daqui ainda listava o item 3
(entregue em 2026-08-23) e o `progress.md` não tinha nenhuma das três entregas da `main`. Escrever
o fechamento em cima disso perderia a verdade da `main` ou ressuscitaria trabalho entregue, que é
exatamente o risco que a exceção de 2026-08-22 aceitou correr. Merge em `8a4df32a`, conflito só em
`state.md` e `backlog.md`, resolvido tomando a `main` como base — **é dela o rótulo de lane**, e é
por isso que este bloco é da `lane-c`.

**O critério de aceite foi provado no navegador, contra a API real, não pela suíte.** Sessão de
admin em `:5173` contra a API em `:8080`, chromium, depois do merge:

- **largura proporcional da `TurmasTable`** (`ecc3ca75` + `b2075480`, os dois commits que tinham
  saído sem prova de tela porque a stack estava parada): em 1600 a tabela mede **1294px** e as oito
  colunas ficam em 10,3% / 15,0% / 19,5% / 7,8% / 20,4% / 7,8% / 9,0% / 10,3%; em 1280 e em 1024 ela
  mede **1217px** com as mesmas proporções — o `min-content` segura, e o transbordo é
  intra-contêiner. **Zero elemento truncado** nos três viewports;
- **avatar (`d3779709`)**: os **13** `.p-avatar` do corpo medem **48×48**, razão 1,000. A primeira
  sonda acusou três elipses de 30×34,3 e eram `.p-avatar-text`, o `span` interno — falso positivo
  do seletor, não do `shrink-0`. Remedido depois do merge, que trouxe o `AppAvatar` mexido pelo
  `0a61706c`;
- **Q-1 do review**: `/operacion/turmas/6?tab=docs` abre **`Documentation`**, o quarto dos cinco
  painéis; sem query abre o primeiro e `?tab=xpto` cai no primeiro — URL adulterada abre a tela em
  vez de quebrá-la.

**Gate re-rodado sobre a árvore mesclada, não herdado:** backend **906 passed / 5 skipped (3227
asserções)** pelo comando do `CLAUDE.md` §6, que voltou a terminar (a **P-50** foi paga na `main`);
`pnpm lint` exit 0; `pnpm build` verde; `pnpm test` **100 arquivos / 555 testes**. Fence de frontend
puro **vazio** — `git diff main...HEAD -- backend/ generated.ts` não devolve arquivo —, então Pint e
`typescript:transform` seguem N/A por escopo medido. Nenhum `.gitkeep` nasceu aqui, nenhum símbolo
novo ficou órfão, zero import de PrimeReact fora de `shared/ui` e zero import cruzado entre
features.

**A Task 13 Step 1 do plano morreu de obsolescência, e isso é registro, não desvio.** Ela mandava
tirar a role `redator` do usuário 1 esperando `roles=` vazio, tratando-a como resíduo da Task 3.
Medido no MySQL de dev em 2026-08-24: os **7** redatores do seed e os **2** usuários de gate e2e
carregam a role — é a migration de backfill `2026_08_22_000003_backfill_redator_role` (`fa1abdf1`),
que chegou pela `main` e **encerrou a P-47**. Executar o Step 1 desfaria o backfill em dev. Não foi
executado, e o motivo está aqui.

**O que fica aberto, e é herança declarada — não achado deste fechamento:** a run 3 (Comercial,
Tasks 10 e 11), as fichas `D-*` da Task 12, os Minors 2, 3 e 5 da revisão da Task 9 e a senha
definida para o redator na Task 3. O item **16 continua na fila** com o que sobrou: Comercial,
Certificados, Cursos, Pessoas e Administração. Fechou aqui a **fatia 1 de 2**.

**A P-41 foi encerrada por decisão do João neste fechamento.** O `min-w-0` que a ficha cobrava
voltou em `1b9f82ad`, pelo ramo do gatilho que dizia "uma tabela real mostrar a coluna alargada em
uso" — foi a UI-02 da run 2, que mediu CLIENT 249px + REDATOR 263px ocupando 45% da tabela. O outro
ramo do gatilho não foi pago e sai declarado: `IdentityCell.test.tsx` ainda conta `span.truncate`,
prova a **classe** e não o comportamento, e medir `scrollWidth > clientWidth` é trabalho do
`frontend-hardening-final`.

---

## Fechado em 2026-08-23 — `hardening-acesso-ownership-e-integridade`, item 3 da fila consolidada

### Seleção e planejamento — 2026-08-22 (verbatim do `state.md`)

**A `lane-a` recebeu o item 3 em 2026-08-22, por promoção explícita do João.** É backend, então roda
no main tree e satisfaz o gate sem reabrir a P-03: a `lane-b` é infra e a `lane-c` é frontend — não
há backend ∥ backend. O bloco é `Contexto: sim`, logo nasceu em `context_required`; o packet
`2026-08-22-hardening-acesso-ownership-e-integridade.md` veio do Codex em 2026-08-22 com
`status: ready` e cinco fontes recuperadas — Drive e Notion inclusive, endereçados por ID. A **D-34** do escopo é condicional: só entra se o contrato for tocado,
e aí regenera `generated.ts` (lei §5.3) — a spec a declarou **fora**, e o `generated.ts` muda neste
bloco por outro motivo (o `is_active` da P-51).

**Planejamento fechado em 2026-08-22T17:31.** Spec e plano escritos, e o plano corrige **três**
medições que a spec e as fichas traziam erradas: o lock dos escritores de filho é `lockForWrite()` e
não `lockRow()` cru (a diferença é a recusa, que é a P-49 inteira); `ImportStudentsAction` sai da
lista dos seis porque não abre transação (a cobertura vem da linha, no `EnrollStudentAction`); e a
P-47 não se conserta no seeder — ele já atribui a role desde `e3490d84` —, mas por migration de
backfill sobre o dado velho. Handoff declara `executor: claude`.

### Execução — 2026-08-22 a 2026-08-23

Nove tasks, 25 commits (`79c246c6`..`f815c507`). Os quatro eixos entraram inteiros: `visibleTo()` no
`TurmaQueryBuilder` e `resolveRouteBinding()` no `Turma` (ownership, 20 rotas de uma vez); purge de
sessão na transição mais `EnsureAccountIsActive` por request (revogação), com `UserData::$is_active`
perdendo o default literal (P-51) e `d4a8553d` fechando o blast radius no `create` de staff;
`operation.enrollment.record_result` por migration (capacidade, RN-02); e `lockForWrite()` em `Turma`
e `Redator` tomado por cinco escritores de filho, com o `ParentLockOnChildWriteTest` de lista dupla
como catraca (integridade, P-49). A P-47 saiu por migration de backfill (`fa1abdf1`), não por seeder.

### Review — 2026-08-23 (Claude + Codex), dois achados aprovados

- **Q-1 — `EnsureAccountIsActive` vazou para o grupo `api` inteiro.** O middleware nasceu em
  `api(append:)` buscando a propriedade "rota autenticada nova nasce coberta". O preço era invisível:
  as rotas propositalmente anônimas rodam no MESMO grupo `api`, e `$request->user()` resolve nelas
  pelo guard `web` sem `auth:sanctum` nenhum. Um cookie de conta recém-desativada devolvia 401 em
  `login`, `password/forgot`, `password/reset`, `invitation/accept` e `publico/certificados/{uuid}` —
  a validação pública do QR, que tem peso legal, e a própria porta por onde a pessoa sairia do
  buraco. Corrigido em `0ac7358d`: a checagem passou a andar casada com `auth:sanctum` no grupo
  `auth.active`, e a cobertura que se ganhava de graça passou a ser **verificada** pelo
  `AuthenticatedRouteMiddlewareTest`, que exige que a superfície anônima esteja declarada — anônima
  nova reprova em silêncio. O mesmo commit declarou `memory_limit=512M` em `phpunit.xml`, porque os
  cinco testes novos levaram a suíte a estourar os 128M do container — **remendo desfeito no merge
  de 2026-08-23**, porque a `lane-b` já tinha pago a P-50 por SAPI (`docker/php/memory-cli.ini` a
  320M no CLI, `www.conf` a 256M no FPM) e o número maior do `phpunit.xml` mascararia o teto da
  imagem. Com 320M a suíte fecha igual.
- **Q-2 — `.claude/rules/backend-ddd.md` desatualizada sobre o data-scoping da Turma.** Corrigido em
  `0b9ffecd`.

Os cinco testes novos foram provados contra o código antigo (`git stash` do fix): reprovam lá,
passam aqui.

### Fechamento — 2026-08-23

DoD provado contra a API real e o MySQL de dev (12 provas, registradas na linha de entrega do
`progress.md`), incluindo a corrida de duas conexões, as duas sondas do arch test vistas reprovar e
revertidas, e as cinco rotas públicas reabertas pelo Q-1. Gate: backend **906 passed / 5 skipped**
pelo comando canônico do `CLAUDE.md` §6 — que voltou a terminar —, frontend **87 arquivos / 481
testes**, lint 0, build verde, Pint `passed` nos 42 arquivos da sprint e `typescript:transform` sem
diff novo.

Pendências: **P-47 encerrada**; **P-49** e **P-51** fecharam parte e seguem abertas no resto, cada
uma com o gatilho reescrito para o que sobrou; **P-50** foi encerrada pela `lane-b` no mesmo dia
(por SAPI, `memory-cli.ini` a 320M e `www.conf` a 256M) e o remendo desta branch saiu no merge de
2026-08-23; **P-54** nasceu, com o Q-4
herdado do bloco 1. **A D-34 perdeu o bloco hospedeiro** ao fechar o item 3 sem ser paga (ficou fora
por escrita explícita na §2 da spec) e espera novo dono, escolha do João.

---

## Fechado em 2026-08-22 — `infra-producao-runtime-e-aws`, item 10 da fila

### Seleção — 2026-08-22

**Promoção explícita do João**, com esta árvore em `idle` e `active_work_item: null`. O argumento
do `/planejar-bloco` veio como **slug exato** — `infra-producao-runtime-e-aws` —, que é o mesmo
título do item 10 do `backlog.md`; o gate não teve o que reprovar dessa vez.

**Três decisões dele fecharam o gate:**

1. **Rota `context_required`, não a direta.** O item 10 declara `Contexto: sim` e as fontes são
   externas ao repositório: Drive `RNF-DIS-01/03/04`, Notion `10.1.1–10.1.6` e `10.1.8`,
   ADR-09/11/13/14. Diferente dos blocos de dívida recentes (BD-12, BD-17, BD-18), aqui não há
   medição local que substitua a fonte — a topologia de produção é decisão de produto/infra
   registrada fora do código.
2. **Segundo `active_work_item` vivo, aceito como exceção declarada.** O main tree
   (`/home/jvbat/projetos/lotus`) está em `feedbacks-resolver-escopo`, `workflow_state:
   context_required`, `next_owner: codex` — medido, não deduzido. É a **sétima** exceção à
   invariante de um `active_work_item`, pelo mesmo padrão já registrado nos fechamentos de
   `arquivados-roots-restantes` e do BD-18: o invariante vale dentro de cada branch, não entre elas.
3. **Área de trabalho: esta worktree `lotus-infra`**, branch `infra/producao-runtime-e-aws` a partir
   de `c8480eee`. A regra do `/planejar-bloco` manda main tree quando o bloco toca backend, por causa
   da **P-03** — mas o gatilho literal da P-03 é *backend ∥ backend*, e o que o bloco escreve são
   artefatos de runtime novos (`Dockerfile` multi-stage, `docker-compose.prod.yml`, nginx de
   produção), não código de domínio que a suíte precise provar contra o compose de dev.

**Ressalva a carregar para o planejamento, medida agora e não descoberta depois:** o
`feedbacks-resolver-escopo` do main tree é bloco de **backend com código**. Enquanto ele estiver em
`context_required` o gatilho da P-03 não dispara; **se ele entrar em `executing`, o gatilho precisa
ser reavaliado antes de qualquer prova deste bloco que dependa do compose.**

**Estado das outras duas árvores no momento da promoção**, para o caso de divergência futura:
`lotus-bd15` em `idle`; `fix-frontend` em `bd12-load-state-e-listas` / `ready_for_planning` — resíduo
do bloco já fechado e mesclado na `main` pelo PR #64, não trabalho vivo.

**`state_basis_commit: c8480eee`** — o commit contra o qual o backlog foi consolidado em 2026-08-22
(`ba59dbd9`) mais o `style(backend)` que o segue, e a árvore que este bloco vai medir.

### Context Packet — 2026-08-22: `status: partial`, cinco fontes, nenhuma indisponível

Gerado pelo Codex (sandbox read-only, skill `lotus-context-packet`) e salvo em
`context-packets/2026-08-22-infra-producao-runtime-e-aws.md`. **Contrato validado antes de gravar:**
markers exatos, frontmatter completo com `plan_path`/`spec_path` em `null` (os dois ponteiros do
estado são nulos e não foram inventados), **8 key facts** — o teto —, e `RECOMMENDED_TRANSITION:
ready_for_planning`. **A provenance foi remedida aqui, não aceita de chegada:** `base_commit`
`5bcd4b7c…`, `state_blob_sha` `25c06347…` e `progress_blob_sha` `0457320a…` conferem com
`git hash-object` nesta árvore.

**Nenhuma fonte saiu `unavailable`** — as cinco foram consultadas e endereçadas por ID: os três
documentos do Drive (`requisitos-negocio.md`, `arquitetura-aws-lotus.md`, `decisao-stack.md`) e as
oito páginas Notion pela base canônica `e64b7d57-…`, não pela homônima obsoleta que a skill veta. O
`partial` vem do conteúdo, não da falta: **as sete tasks do Notion estão "A fazer" com `Descrição`
vazia**, então elas dão critério de aceite e não desenho.

**Três fatos externos mudam o planejamento e não estavam no repositório:**

1. **O texto canônico do `RNF-DIS-02` é "servidor redundante pronto para assumir em caso de queda"** —
   e o próprio `arquitetura-aws-lotus.md` do Drive o **rebaixa** para "recuperação rápida sem
   failover", enquanto a task Notion `11.1.3` associa restore de snapshot ao mesmo requisito. Nem o
   rebaixamento nem a associação foram aceitos: a divergência foi para a tabela como **`unresolved`**,
   reservada ao gate do item 13. O bloco planeja EC2 única **sem declarar** que ela atende ao RNF.
2. **O sizing tem um número decidido e outro não.** `db.t4g.micro` está explicitado na task 10.1.2;
   a EC2 `t4g.small` ARM é **sugestão** do Drive, com `t4g.medium` como saída se o Gotenberg
   pressionar memória. Escolher a EC2 é decisão do brainstorming, com a P-50 medida junto — o mesmo
   `conf.d` hoje serve CLI e PHP-FPM, e o pico de 129 MB contra o teto de 128M é do CLI.
3. **A borda TLS tem duas saídas no Drive** (EC2 direta + Certbot, ou ALB + ACM). A task 10.1.6 e o
   ADR-14 decidem a primeira para o MVP; o ALB fica ligado à decisão de HA, que é do item 13.

**Quatro questões abertas, nenhuma bloqueante para escrever o plano, todas bloqueantes para
provisionar o recurso correspondente:** região (`sa-east-1` × `us-east-1`, nenhuma aprovada), tamanho
final da EC2, controle do DNS de `lotus.cl`/`api.lotus.cl` mais a saída do sandbox do SES e o canal
do alerta CloudWatch, e o teto de custo (estimativa externa de US$ 35–55/mês sem ALB). São decisões
do João e entram no brainstorming como tais — não se supõem.

### Brainstorming — 2026-08-22: o bloco foi recortado ao meio, por decisão do João

**A primeira pergunta do brainstorming foi de escopo, e mudou o bloco.** O item 10 junta artefato
versionado (Dockerfile, Compose, Nginx, `memory_limit`, secrets) com provisionamento em conta AWS
real — e a segunda metade depende das quatro decisões que o packet listou como abertas mais
credenciais que não estão nesta máquina. **O João escolheu entregar só o runtime**, com o
provisionamento virando bloco próprio quando as decisões existirem. O slug não muda; o escopo, sim, e
está declarado na §1 da spec.

**Quatro decisões dele fecham o desenho:**

1. **Origem única**, contra o `lotus.cl` + `api.lotus.cl` do Drive — e a base é medida, não estética:
   `VITE_API_URL` é lido por `import.meta.env` em `axios.ts:25`, então **entra dentro do bundle no
   build**. Com dois hosts, a imagem carregaria a URL do ambiente, e o item 11 precisa promover a
   mesma imagem por SHA. Vai à tabela de divergências da spec como decisão, não como omissão.
2. **Overlay de sonda separado** para a prova local — o `docker-compose.prod.yml` fica sem banco, sem
   storage e sem mail, e o que ele não tem fica visível no diff em vez de escondido num `profiles:`.
3. **P-50 fechada com dois números medidos**, separados por SAPI: CLI no `conf.d` (nas duas imagens,
   senão a ficha segue aberta onde dói — quem roda a suíte é o container de dev) e FPM no
   `php_admin_value` do pool.
4. **Secrets por `env_file` no servidor**, com o caminho para Parameter Store registrado e **não
   prometido** — prometer cofre sem poder prová-lo neste bloco seria DoD falsa.

**Três medições enxugaram a stack antes de qualquer arquivo nascer:** todas as rotas do backend vivem
sob `api/` (`routes/api.php` agrega os domínios por glob), sobrando apenas `/sanctum/csrf-cookie` e o
`/up` de `bootstrap/app.php:14` — o que torna o roteamento de origem única trivial; `SESSION_DRIVER`,
`CACHE_STORE` e `QUEUE_CONNECTION` são todos `database`; e `grep -rn "ShouldQueue" backend/app`
devolve **uma linha, que é comentário** — logo, produção não leva volume de sessão nem worker de
fila.

Spec em `specs/archive/2026-08-22-infra-producao-runtime-e-aws-design.md`: 9 decisões, 8 provas de DoD, 3
divergências (uma delas a `RNF-DIS-02` × ADR-14, que segue **`unresolved`** e reservada ao gate do
item 13) e 4 limitações declaradas — a primeira delas sendo que **nada de AWS é provado por este
bloco**.

### Planejamento — 2026-08-22: 7 tasks, `executor: claude`, uma emenda à spec

Plano em `plans/archive/2026-08-22-infra-producao-runtime-e-aws.md`. **Sete tasks, uma por commit**, na ordem
que a dependência impõe: os dois números da P-50 primeiro (Tasks 1 e 2), porque a imagem de produção
copia as duas confs; depois a conf do Nginx (Task 3), a imagem (Task 4), o Compose com a catraca
(Task 5), o overlay mais o molde de env (Task 6) e a DoD end-to-end (Task 7).

**Uma emenda à spec, decidida ao escrever o plano e registrada na §3 dela:** as duas imagens saem de
**um único** `docker/Dockerfile.prod` com quatro estágios e dois alvos, em vez de dois Dockerfiles. O
motivo é o estágio `spa` — a imagem do Nginx precisa do `dist/` que ele produz, e com arquivos
separados o build de frontend existiria duas vezes, livre para divergir. A D3 continua valendo no que
decide; muda o número de arquivos.

**A catraca do bloco não é teste de código, é teste de composição.** `frontend/tests/compose-prod.test.ts`
guarda as duas propriedades do `docker-compose.prod.yml` cuja violação é **silenciosa** — um serviço
de dev que reaparece e um volume de código que volta —, porque `docker compose up` fica verde dos
dois jeitos. Ela mora em `frontend/tests/` pelo motivo já registrado na rule: o container `app` monta
só `./backend` e `./frontend`, então o vitest é o único runner com acesso à raiz. **A conferência é
textual e o custo está declarado no próprio arquivo:** o projeto não tem parser de YAML, e
acrescentar dependência ao frontend por causa de arquivo de infra seria acoplamento na direção
errada.

**Três passos do plano decidem por medição, e podem terminar em qualquer dos dois ramos:** se o
`poppler-utils` entra na imagem de produção (só entra se houver consumidor em `backend/app`), se o
Gotenberg pode ganhar healthcheck (a imagem de terceiro pode não trazer `curl` nem `wget` — e um
teste que não roda é pior que a ausência dele), e quais chaves do `.env.example` de dev entram no
molde de produção.

**A Task 2 instala e reverte um patch em `backend/public/index.php`** para medir o pico do FPM: a
medição é o artefato, o código da sonda não fica, e o Step 5 prova a reversão com `git diff` vazio e
`grep MEMPROBE` sem match. É a razão principal do **`executor: claude`** declarado no `## Handoff` —
paths fechados errariam a reversão ou não teriam autorização para o arquivo.

**Baseline a medir antes da Task 1, não herdar:** a suíte do frontend fechou em 87 arquivos / 481
testes no fechamento do BD-12, e a do backend em 872 passed / 5 skipped no do BD-18 — mas esta árvore
tem a `main` inteira dentro, e o gate da Task 7 cobra os números medidos, não os citados.

### Execução — 2026-08-22: 7 tasks provadas, bloco em `ready_for_review`

Sete tasks, dez commits, `8b1fd6df..e0019bac`. Execução por **subagent-driven-development com TDD**,
um implementador e um revisor por task, ledger em `.superpowers/sdd/progress.md`.

| Task | Commits | Entrega |
|---|---|---|
| 1 | `8b1fd6df` | `memory-cli.ini` — `memory_limit = 320M`, de pico medido de 129,00 MB |
| 2 | `ee230219` | `www.conf` — `memory_limit = 256M` de pool, com o piso emendado pelo João |
| 3 | `80029cea` | `docker/nginx/prod.conf`, origem única, `nginx -t` conferido |
| 4 | `e9f83043`, `31a29d33` | `docker/Dockerfile.prod` quatro estágios — `app` 293MB, `web` 105MB |
| 5 | `c54d1a35`, `317a6512`, `fef76d08` | `docker-compose.prod.yml` + catraca de composição |
| 6 | `73f6e219`, `ab5b057d`, `e0019bac` | overlay de sonda, `.env.production.example` sem segredo |
| 7 | este commit | DoD end-to-end contra a stack de produção real |

**As oito provas da DoD fecharam**, duas delas com divergência entre o sinal escrito e o
comportamento real do sistema: a **prova 3** esperava ausência de `Access-Control-Allow-Origin`, e o
`HandleCors` o emite mesmo same-origin porque `cors.php:22` usa `FRONTEND_URL`; a **prova 6**
esperava o PDF do certificado no bucket, e o `CertificatePdfService` renderiza sob demanda sem
persistir. Nos dois casos a substância foi provada por outro caminho. **A §10 da spec registra as
medições, as emendas e todos os desvios do plano** — inclusive o `--entrypoint php` do
`key:generate`, que **precisa entrar no runbook do bloco de deploy**.

**P-50 paga:** `docker compose exec -T app php artisan test` → 867 passed / 5 skipped, 3095
assertions, 59,01s, sem estouro de memória. Frontend: 88 arquivos / 499 testes, `lint` e `build`
exit 0.

**Ambiente devolvido:** stack de sonda derrubada com `down -v`, volumes de dev intactos, árvore limpa.

**Nada de AWS foi provado** — a limitação 1 da spec segue de pé, e o review deve cobrá-la como
limitação declarada, não como lacuna.

### Revisão de sprint — 2026-08-22: risco ALTO, duas lentes, 9 achados, zero violação de lei na arquitetura

**Classificação: ALTO** — o bloco escreve o molde de `.env` que governa a cadeia Sanctum (lei §5.4)
e a imagem que vai a produção com dado de peso legal. Duas lentes: revisão Claude contra o gabarito
do projeto e revisão independente do Codex (`mcp__codex__codex`, read-only) sobre o mesmo intervalo
`5bcd4b7c..HEAD`.

**Convergência das duas lentes** em três achados: o gate de env do entrypoint sem as variáveis da
cadeia Sanctum, o `.dockerignore` sem `bootstrap/cache/*.php`, e a prova 5 (`APP_DEBUG`) exercitada
só em 401/404. O Codex viu sozinho os seeders na imagem e as folgas da catraca; ambos foram
verificados no código e na imagem antes de entrar no relatório.

**Divergência entre revisores, não aceita:** o Codex reportou vazamento de `backend/auth.json`,
`storage/*.key` e `storage/app/**` para dentro da imagem. Medido em `lotus-app:local`: `auth.json`
não existe na árvore, e `storage/app` contém três arquivos, todos `.gitignore`. Rejeitados — a
lacuna do `.dockerignore` que sobrou é a de `bootstrap/cache`, que é o achado Q-3.

**Nove achados, nenhum contra as leis §5 na arquitetura entregue** (sem Repository, sem auditoria em
trigger, sem `generated.ts` tocado, sem `abort(422)`, sem import cruzado de feature). Os dois 🔴 são
brechas operacionais que a imagem carrega, não desenho errado:

| # | Achado | Sev. | Esforço |
|---|---|---|---|
| Q-1 | `database/seeders` na imagem: o único caminho que instala o `RolePermissionSeeder` cria `admin@lotus.cl` / `senha123` como superadmin | 🔴 | P |
| Q-2 | Gate de env do entrypoint não cobre `SANCTUM_STATEFUL_DOMAINS`/`FRONTEND_URL`/`SESSION_DOMAIN`, que o molde entrega vazios | 🔴 | P |
| Q-3 | `.dockerignore` sem `backend/bootstrap/cache/*.php`: `config.php` cacheado na máquina que builda entra na camada com segredo resolvido | 🟡 | P |
| Q-4 | `.env.production.example` sem `SESSION_SECURE_COOKIE` | 🟡 | P |
| Q-5 | Prova 5 exercitou 401/404; o branch que `APP_DEBUG` governa é o 500 de `ProblemDetails.php:67` | 🟡 | P |
| Q-6 | `prod.conf` sem `Cache-Control` no `index.html` | 🟡 | P |
| Q-7 | `pm.max_children` não fixado, embora o sizing de 1,25 GB dependa dele | 🟡 | P |
| Q-8 | Catraca prova existência onde precisava provar propriedade (`env_file` e `condition` do overlay) | 🟡 | P |
| Q-9 | `docker-compose.prod.yml` sem teto de log do json-file | 🟡 | P |

**O João aprovou os nove em 2026-08-22.** As correções estão na seção seguinte.

### Correções da revisão — 2026-08-22: nove achados, nove commits, tudo provado

`ed4cdc7b..` (nove commits, um por achado). Nenhuma correção foi aceita por leitura
de diff: cada uma tem uma medição contra a imagem reconstruída ou contra a stack de
produção com o overlay de sonda.

| # | Commit | Prova |
|---|---|---|
| Q-1 | `ed4cdc7b` | `db:seed --force` com `APP_ENV=production` na stack real: `roles=3`, `permissions=42`, **`users=0`**. O `RolePermissionSeeder` continua rodando em qualquer ambiente |
| Q-2 | `989250d5` | Os dois modos de falha: chave **ausente** e chave **vazia** (o caso do molde) saem com `entrypoint: variável obrigatória ausente: SANCTUM_STATEFUL_DOMAINS`, exit 1 |
| Q-3 | `155f7dc3` | `config.php` plantado no host com string sentinela: `grep -rl` na imagem reconstruída não acha nada. `storage/framework/cache/data` passou a existir; `storage/framework/testing` sumiu |
| Q-4 | `e3a25dcf` | Chave no molde com a dependência de HTTPS escrita ao lado. A sonda roda em HTTP e não define a chave, então não regride |
| Q-5 | `docs(spec)` §10.8 | 500 **real** (MySQL parado, rota pública sem sessão): com `APP_DEBUG=false`, `detail` genérico; com `true`, o `detail` vaza `SQLSTATE`, host, porta, database e o SQL. O par distingue os dois estados — o 401/404 original não distinguia |
| Q-6 | `b012ae09` | `curl -I` contra a stack: `/` responde `Cache-Control: no-cache`; `/assets/index-*.js` responde `public, max-age=31536000, immutable`, **um header cada** (a primeira tentativa emitiu dois, por causa da diretiva `expires`) |
| Q-7 | `aaed3592` | `grep` na imagem: `pm.max_children = 5` agora está no `zz-www.conf`, não herdado |
| Q-8 | `65d03e0b` | Mutação negativa 2/2: `env_file` hardcoded e `condition: service_started` reprovam as asserções novas. 19 testes no arquivo, 500 na suíte |
| Q-9 | `34c94535` | `docker inspect`: `json-file map[max-file:3 max-size:10m]` nos serviços da stack |

**Regressão medida depois de tudo, não assumida:** stack de produção reconstruída e
no ar, `nginx` `(healthy)`, `/up` `200`, e o **login real fecha** —
`/sanctum/csrf-cookie` `204`, `POST /api/login` `200` com cookie `lotus-session`
gravado, `GET /api/me` `200`. Suíte backend `867 passed / 5 skipped`; frontend
`88 arquivos / 500 testes`, `lint` e `build` exit 0.

**Ambiente devolvido:** `down -v` no projeto `lotus-probe` (zero containers, zero
volumes, zero redes); os 12 volumes de dev intactos; árvore limpa.

**Nada a diferir:** os nove foram corrigidos, então nenhum item novo vai ao
`backlog.md` nem às pendências por conta desta revisão.

### Fechamento — 2026-08-22: o login real contra a stack de produção reconstruída

**Item 0 do gate, medido agora e não citado da execução.** As nove correções da revisão entraram
DEPOIS da DoD end-to-end do bloco, e três delas mexem exatamente na cadeia que o login atravessa — o
gate de env do entrypoint (Q-2), o `.dockerignore` do `bootstrap/cache` (Q-3) e o
`SESSION_SECURE_COOKIE` do molde (Q-4). Provar por citação teria provado uma imagem que não existe
mais. As duas imagens foram reconstruídas do `HEAD` e a stack subiu com o overlay de sonda
(`LOTUS_ENV_FILE=./docker/probe.env`, porta 8081, projeto `lotus-probe`):

- **A cadeia inteira, com os cabeçalhos que o `/fechar-sprint` exige** (`Origin` e `Accept`, senão os
  dois 500 são do curl): `nginx` entrou em `(healthy)`, `GET /up` → **200**, `GET /` → **200**,
  `GET /sanctum/csrf-cookie` → **204**, `POST /api/login` → **200** com o cookie `lotus-session`
  gravado no jar, e `GET /api/me` → **200** devolvendo `roles: ["superadmin"]` e a lista de
  permissões. É a lei §5.4 (cookie de sessão Sanctum + CSRF) funcionando **na imagem de produção**,
  não no compose de dev.
- **O Q-1 reprovado ao vivo, que é o achado 🔴 mais caro do bloco:** `php artisan db:seed --force`
  com `APP_ENV=production` imprimiu *"Admin de desenvolvimento ignorado: só é criado em local/demo.
  Roles e permissões foram instaladas."* e parou ali. O `RolePermissionSeeder` rodou; o
  `admin@lotus.cl`/`senha123` com role `superadmin` **não nasceu**. O usuário do login acima teve de
  ser criado à mão na sonda — que é exatamente a propriedade que se queria.
- **`migrate` fora do entrypoint, como a D7 desenhou:** o container subiu com o banco vazio e as 24
  migrations só rodaram quando chamadas. O deploy é `pull → migrate → up`, e o arranque não migra
  sozinho.

**Ambiente devolvido:** `down -v` no projeto `lotus-probe` — zero containers, zero volumes, zero
redes. Os volumes de dev seguem intactos.

**Resto do gate.** `docker compose exec -T app php artisan test` → **867 passed / 5 skipped, 3095
assertions**, 58,49s — **pelo comando documentado do `CLAUDE.md` §6, sem contorno**, o que é a prova
da P-50 e não uma nota de rodapé: desde 2026-08-19 esse comando morria. `pnpm lint` exit 0 ·
`pnpm build` exit 0 · `pnpm test` **88 arquivos / 500 testes**. Pint `passed` no único arquivo PHP do
bloco (`DatabaseSeeder.php`). **`typescript:transform` é N/A por medição** — nenhum DTO no diff e
`generated.ts` fora dos 18 arquivos do bloco. **Código morto: nenhum** — os artefatos que o bloco
criou (`docker/php/memory-cli.ini`, `docker/probe.env`, o overlay, a catraca de composição) têm
consumidor declarado, e a sonda de memória da Task 2 já tinha sido revertida com `git diff` vazio.

**Leis §5: nenhuma contrariada.** Sem Repository, sem auditoria em trigger, sem `generated.ts`
tocado, sem `abort(422)`, sem import cruzado de feature. A §5.4 foi **provada**, não só respeitada.
A §5.8 (DoD = critério provado) é o próprio item 0 acima.

**Pendências.** A **P-50** foi **encerrada por este bloco** — o gatilho venceu pelas duas metades ao
mesmo tempo (o bloco tocou `docker/php/` e o João decidiu o número), e o impasse dos dois SAPIs se
resolveu separando CLI (320M, no `conf.d`) de FPM (256M, no `php_admin_value` do pool). A ficha está
em `pendencias/encerradas.md` com a medição que fecha. A **P-40 saiu de vez**: este é o primeiro
fechamento posterior ao do BD-12, que é a condição literal que ela registrava. **A P-03 foi conferida
e não venceu** — medido agora, o main tree está em `hardening-acesso-ownership-e-integridade` /
`planning` e a `fix-frontend` em `frontend-revisao-ui-por-modulo` / `executing`; o gatilho pede dois
blocos de **backend** em paralelo, e o de lá ainda não escreve código. **Nenhuma pendência nasceu
nesta sprint** — os nove achados da revisão foram corrigidos, não diferidos.

**Backlog: o item 10 não saiu inteiro, porque não foi entregue inteiro.** A metade do runtime saiu e
está registrada como entregue; o item passou a se chamar **`infra-producao-provisionamento-aws`** e
guarda o que a D1 recortou — EC2, RDS, S3/IAM, SES/DKIM, TLS e CloudWatch —, mais as quatro decisões
do João que continuam abertas e a herança do `--entrypoint php` no `key:generate`. Apagar o item
inteiro teria apagado da fila trabalho que ninguém fez. **Nada foi promovido.**

**Arquivados:** plano em `plans/archive/2026-08-22-infra-producao-runtime-e-aws.md` e spec em
`specs/archive/2026-08-22-infra-producao-runtime-e-aws-design.md`; o link da spec dentro do plano foi
reapontado. **`state_basis_commit` continua em `c8480eee`** — o commit contra o qual o João promoveu
o bloco; o SHA deste fechamento não entra no arquivo que ele fecha.
---

## Fechado em 2026-08-22 — `BD-15-docs-guardrails-e-sincronizacao`, item 14 da fila

### Seleção — 2026-08-22

Item 14 do `backlog.md`, **promovido explicitamente pelo João em 2026-08-22** com a árvore em
`idle`. O `/planejar-bloco` foi invocado duas vezes com o slug correto e **barrou nas duas**: em
`idle` o comando mostra a fila e pede seleção, nunca promove. A promoção veio de duas decisões
dele, tomadas com o custo de cada rota na mão:

- **Rota `context_required`**, que é o que a linha do backlog declara (`Contexto: sim`). A metade
  do bloco que mais pesa — `P-31` (sync ADR-16↔Drive), `P-18`/`P-22` (Notion) e a lista de
  sincronização obrigatória `8.4.0–8.4.7` / `8.5.1–8.5.9` / `9.1.4` — tem fonte **fora** do
  repositório. Planejar sem packet transformaria essa metade em limitação declarada.
- **Esta worktree** (`/home/jvbat/projetos/lotus-bd15`, branch `docs/bd15-guardrails-e-sincronizacao`,
  zero commit à frente da `main` em `c8480eee`). O bloco é docs/mecanismos; enquanto não tocar
  `backend/`, o gatilho da **P-03** não vence. Se a `D-17` virar arch test em PHP, a árvore se
  rediscute **antes** da task, não durante.

Escopo herdado da fila, sem edição: `P-20`, `P-21`, `P-23`, `P-31`, `P-32`, `P-39`, `P-43`,
`P-18`, `P-22`, `D-17`, mais a sincronização obrigatória do Notion. A ficha da `P-32` **veta**
desenhar seletor por classe sem reincidência medida ou decisão explícita do João — restrição que
entra no packet e no brainstorming como está escrita.

**Próxima ação:** Codex gera o Context Packet pela skill `lotus-context-packet`
(`.agents/skills/`), em sandbox read-only, sem alterar arquivo nem estado.

### Context Packet — 2026-08-22: `status: ready`, e o que ele mediu em vez de repetir

O Codex gerou o packet pela skill `lotus-context-packet` em sandbox read-only, sem tocar arquivo
nem estado. Contrato validado item a item: marcadores exatos, frontmatter completo com
`plan_path`/`spec_path` **`null`** (e não inventados), **7** key facts contra o teto de 8, nenhuma
fonte marcada `unavailable`, `RECOMMENDED_TRANSITION: ready_for_planning` presente, e nenhum
gatilho de obsolescência apontando para hash de proveniência ou para a própria transição
promotora. A proveniência foi **remedida localmente** e bate byte a byte: `HEAD`
`e93225fc8146a3734ac0627cce36045d682a7970`, `state.md` blob
`0f32ac293b20cbe98f2ea7fb8bd73564b552169e`, `progress.md` blob
`0457320abea178668c65112513c37fc45dcbb281`.

O packet **não** aceitou a afirmação do backlog de chegada — mediu cada uma:

- **Drive medido, não suposto:** o ADR-16 de lá (`decisao-stack.md`, file ID
  `14Q_wL6G6acSCUaMLIr9BO2blqiGrPMGw`, `modifiedTime` 2026-07-31) segue **sem o ponto 5** e sem a
  revogação da exceção de shell. A **P-31** está confirmada externamente, não presumida.
- **A armadilha das duas bases do Notion foi verificada e usada como prova:** o ID que a ficha da
  **P-18** cita (`f88bc9603dfa8253b40981686f8ae023`) mora na base **obsoleta**
  (`collection://6adbc960-…`) e está `deleted`. A página equivalente na base canônica é
  `3a2bc9603dfa8067902cf3c62bffdb0d`, já `Concluída` — e ainda carrega a divergência interna que a
  ficha descreve: descrição diz Sprint 3, propriedade diz Sprint 2.
- **A sincronização obrigatória confere:** `8.4.0`–`8.4.7` (8 páginas) e `8.5.1`–`8.5.9` (9
  páginas) estão **todas** `Backlog` com as features entregues; `9.1.4`
  (`388bc9603dfa8119a5ecc157b2cc18d3`) está `A fazer`; a duplicação da **P-22** persiste com as
  duas H.1.3.1 em `Backlog`. Todos os IDs de página ficaram registrados no packet, então o
  planejamento endereça por ID e não por título.

Duas restrições entram no planejamento com a redação que já tinham, e não como sugestão: o **veto
da P-32** ao seletor por classe sem reincidência medida ou decisão explícita do João, e a **P-39**,
que não autoriza retroeditar o plano histórico do BD-6. As quatro perguntas abertas (P-20, P-23, e
o remédio de P-18 e P-22) são **decisões do João**, e o próprio packet declara que nenhuma delas
bloqueia o planejamento.

### Planejamento — 2026-08-22: sete decisões, e o que a medição de ferramenta separou

O brainstorming não aceitou de chegada nem o backlog nem as fichas — mediu cada premissa antes de
oferecer opção, e **três medições mudaram o desenho**:

- **A ferramenta separou Drive de Notion, e as fichas estavam metade certas.** O
  `update_file` do Drive aceita só `title` e `parentId` (*"currently only title and parent_id are
  supported"*), então a **P-31 segue não-fechável** e a ficha estava literalmente correta; já o
  `notion-update-page` escreve propriedade e conteúdo, o que **reabriu** a P-18 e o sync obrigatório,
  congelados desde que foram escritos como "fecha quando o João corrigir manualmente".
- **A forma óbvia da P-32 foi medida e reprovada:** 167 identificadores PascalCase entre crases,
  **28** sem declaração no repositório, **0** achado real — e os 28 se dividem exatamente nas três
  famílias que a ficha previa (vendor, placeholder de molde, palavra de prosa). A previsão virou
  número, e o João decidiu **não desenhar a guarda** e guardar a medição na ficha.
- **A catraca do D-17 liga verde:** 47 arestas declaradas, **0 órfãs**. Isso não é motivo para pular
  a prova — é o motivo de a sonda ser obrigatória, porque catraca que nasce verde não provou nada.

Sete decisões (D1–D7 da spec), duas delas exceções declaradas **na abertura**: escrita externa
autorizada no Notion, restrita ao não-destrutivo, e um arquivo de `backend/` nesta worktree — com o
gatilho literal da P-03 (dois blocos de backend em paralelo) medido como não vencido, nenhum
container de pé e o teste sendo arch test em sqlite `:memory:`.

Uma emenda nasceu durante a escrita do plano e está na §11-bis da spec: a linha do BD-6 que a P-39
manda anotar **não está** no `progress.md` — migrou para `progress-archive.md:74`. O remédio da P-27
é o mesmo; só o arquivo é outro.

Plano: **13 tasks**, executor `claude` no bloco inteiro — a Task 1 exige julgamento sobre a varredura
(uma Regra C escrita sobre linhas `use` passaria em todos os passos e ainda assim estaria errada), as
Tasks 8–11 escrevem fora do repositório, onde não existe `git revert`, e as Tasks 2, 3 e 6 são
redação de decisão.

### Execução — 2026-08-22: as 13 tasks, e as duas premissas do plano que a medição reprovou

**13 de 13 executadas**, `subagent-driven-development`, executor `claude` do início ao fim. O fence
de escopo fechou onde a spec dizia: `git diff main...HEAD --stat` devolve **um** arquivo em
`backend/` (`tests/Feature/Shared/DomainDependencyTest.php`) e **zero** em `frontend/` — o que torna
`pnpm test`/`build`/`lint` e `typescript:transform` **N/A por escopo medido**, não por suposição.

**A Regra C foi provada pela sonda, duas vezes.** Uma catraca que nasce verde não provou nada: com
`'Certification\Models\Certificate'` inserida em `ALLOWED['Catalog']`, a suíte reprova com a linha
`Catalog -> Certification\Models\Certificate`; removida, volta a verde. A sonda rodou na Task 1 e
de novo no HEAD final, no gate. Suíte inteira **873 testes / 3096 asserções / 5 skipped**, pelo
binário direto do `phpunit` com `-d memory_limit=512M` — o `artisan test` documentado morre no meio
por P-50, que é pendência aberta e não falha deste bloco. Pint `passed`.

**Duas premissas escritas do plano caíram na medição, e as duas foram escaladas em vez de seguidas:**

- **`der-fisico.md:74` não estava correta.** A spec a declarava intocável "porque já está certa"; a
  leitura de `backend/database/migrations/2026_08_05_100000_certificates.php` mostrou que ela omitia
  `redator_id`, `snapshot`, `revoked_at`, `revocation_reason`, `timestamps` e a coluna gerada
  `active_enrollment_id`, inventava um `qr_code_hash` inexistente — e, pior, vivia sob
  `## Tabelas PLANEJADAS`. **O João autorizou ampliar a Task 4**: `certificates` e
  `certificate_sequences` foram para uma subseção `### Certification` de `## Tabelas IMPLEMENTADAS`,
  reescritas a partir da migration, e o total foi corrigido para **28 tabelas — 21 de domínio
  (20 implementadas, `feedbacks` no papel) + 7 RBAC/transversal**, com `login_logs` e
  `invitation_tokens` entrando na enumeração. A ausência de ficha de colunas de `invitation_tokens`
  virou a **P-52**.
- **As coordenadas que a lição 18 ia ensinar estavam velhas.** O plano citava
  `CourseController.php:19` e `Catalog/routes.php:11`; medido contra HEAD, a declaração está na
  **linha 24** (hoje cobrindo `['index','show','archived']`) e o `apiResource` na **linha 18**. Uma
  lição que manda ler o controller não pode citar a linha errada do controller — corrigidas em
  commit próprio.

**Notion: 18 páginas escritas, 3 divergências medidas e deliberadamente não escritas.** Todo acesso
por **ID**, zero busca por título, `update_properties` apenas, e releitura por ID depois de cada
write — as 18 confirmam `Concluída` no gate. A **P-18** fechou pelo lado que a evidência apontou: o
ID da ficha era da base obsoleta e está `deleted`; na canônica
`3a2bc9603dfa8067902cf3c62bffdb0d` quem cedeu foi a **descrição**, porque a página irmã
`3a2bc9603dfa8028a1fbf8a3863690ed` já é a da Sprint 3. Ficaram registradas sem write, em
`audits/2026-08-22-bd15-notion-sync.md`: a duplicata da **P-22**, a troca de corpo entre `8.4.0` e
`8.4.7` (medida e **confirmada** — título de um com Descrição/Critério do outro, nos dois sentidos),
o EAP `H.1.3.2` duplicado e as 12 duplicações genéricas do workflow. Apagar e reescrever corpo são
destrutivos; a autorização deste bloco era só o não-destrutivo.

**O classificador de auto mode recusou o write da descrição da P-18** — mesma família de recusa que
já congelou a P-40 e o `tinker` em fechamentos anteriores. Contornada pela porta certa: o João
autorizou explicitamente antes da segunda tentativa, e nada foi escrito enquanto a decisão não veio.

**Pendências: 30 abertas viram 24.** Encerram com o remédio e o path dele na ficha: `P-18`, `P-20`,
`P-21`, `P-23`, `P-39`, `P-43`. Permanecem abertas com a medição que as mantém: `P-22`, `P-31`,
`P-32`. Nasceu **uma**, a `P-52`. A contagem final é 24 e não os 23 que o plano previa — a P-52
nasceu dentro deste bloco, depois de o plano ter sido escrito; o próprio plano mandava conferir em
vez de confiar na aritmética.

### Review — 2026-08-22: baixo risco, gate remedido, 4 achados de mecanismo

Classificação **baixo risco** (nenhuma lei §5 tocada; o único arquivo de código é arch test; executor
`claude`), então lente Claude apenas. **Nada do gate foi herdado:** suíte remedida em **873 / 3096 / 5
skipped**, sonda da Regra C reinserida e vista reprovar (`Catalog -> Operation\Models\Turma`) e
removida, Pint `passed`, `repo-docs-refs` verde, e **3 das 19 escritas do Notion relidas por ID**
(`8.4.7`, `9.1.4`, e a página da P-18, cuja descrição agora bate com a propriedade `Sprint`). ADR-20,
nota do ADR-12, ficha de `certificates` e coordenadas da lição 18 conferidas contra o código, não
contra o plano. **Zero órfão, zero achado de código de produção.**

Os 4 achados são todos de **mecanismo do próprio workflow**, e três deles o bloco herdou em vez de
criar. Estado foi para `blocked` até a decisão do João.

### Correções do review — 2026-08-22: os quatro achados aprovados

O João aprovou **os quatro**. Nenhum ficou deferido para backlog ou pendência.

**Q-1 — o `state.md` encolheu de 1499 para 305 linhas** (107863 → ~20 KB). As narrativas dos cinco
blocos fechados desceram **verbatim** para `historico/state-archive.md`, provado por `diff` contra
`HEAD:docs/superpowers/state.md`: **10 linhas de diferença, todas de cabeçalho `## `**, que deixou
de ser posicional (`Último`, `Penúltimo`) e virou `## Fechado em <data> — <bloco>` — posição
relativa não sobrevive ao próximo fechamento. No lugar ficou `## Itens fechados`, cinco linhas de
ponteiro. A catraca é o passo novo do `/fechar-sprint` §9: a poda entra no mesmo commit do
fechamento, e a sexta linha empurra a mais antiga. `CLAUDE.md` §3 e o cabeçalho do `progress.md`
passaram a citar o arquivo novo.

**Q-2 — a invariante foi reescrita por DONO, não por árvore.** *"`docs/superpowers/**` muda somente
pelo main tree"* era falso no momento em que foi escrito e continuaria falso: a lane escreve o
próprio bloco em `lanes:`, o próprio spec/plano/packet, as fichas que abre, a própria linha do
histórico e os entregáveis que o plano dela nomeia. O que **nenhuma** lane toca ficou explícito:
os campos singulares do topo, o bloco de outra lane e a promoção de item no `backlog.md`.

**Q-3 — os dois gates passaram a resolver a lane pela árvore**, antes de ler estado: `cwd` contra
`lanes.<id>.tree`, e é da lane que saem `workflow_state`, `active_work_item`, plano, spec e packet.
Trocar `focused_lane` para passar no gate ficou proibido por escrito. As transições das duas skills
escrevem dentro de `lanes:`, e só levam o espelho do topo junto quando a lane É a em foco — foi
por isso que o fechamento deste review escreveu em `lane-c` e deixou o topo (`lane-a`) intacto.

**Q-4 — a varredura virou uma só.** `referenciasPorDominio()` é a base única das Regras B e C, e a
decisão "o que é aresta conferível" (o campo `fqcn`, vazio para referência a namespace) mora lá
dentro, não repetida em cada regra. **Três sondas, uma por caminho reescrito**, todas vistas
reprovando e revertidas: Regra B (aresta usada e não declarada, com o path certo do arquivo na
mensagem), Regra C (aresta declarada sem consumidor) e Forma (`use App\Domains\Identity\Enums;`
inserido em `Course.php`, para provar a interpolação nova da mensagem).

Provas depois das quatro correções: suíte **873 / 3096 / 5 skipped** — o mesmo número de antes, o
refactor não perdeu teste —, `repo-docs-refs` 14 verde com os paths novos, Pint `passed`.

---

## Fechado em 2026-08-22 — `feedbacks-resolver-escopo`, item 1 da fila consolidada

Sete tasks do `active_plan` executadas e provadas; branch `feat/feedbacks-resolver-escopo`, main
tree (gate P-03), commits `f6b04b45`..`6b4585ea` mais o commit documental deste handoff.

- **Comportamento provado fora da suíte**, não por ferramenta verde: banco de dev de 42 para 40
  permissões, órfãs `feedback.*` em 0, role `redator` de 4 para 2; `migrate:rollback` devolveu as
  duas e `migrate` removeu de novo; `GET /api/permissions` com sessão de admin real devolveu 40
  itens em 5 grupos, zero `feedback.*`; sessão de redator ativo trouxe 2 permissões e
  `POST /api/turmas/6/documents` respondeu **201** — a prova de que a remoção não tirou capacidade.
- **Registro externo (Task 7) escrito com OK do João, documento a documento.** O MCP do Drive não
  edita conteúdo no lugar, então os dois documentos foram recriados e os originais foram para a
  lixeira, pela rota que o João escolheu. IDs vigentes: `requisitos-negocio.md` =
  `1Nt8XARvd_EIRWEJ9YXa3DKV45xPMQkk-`, `entidade-feedback.md` =
  `16YxxQ52VnEeoah_SCja6TubnvtOtMDql`; Notion 7.4.1 em `Concluída`.
- **Resíduo declarado, não escondido:** `DeleteTurmaDocumentAction` é soft delete, então a sonda de
  upload deixou `files#43` arquivada e inerte (index devolve `[]`). Hard-delete seria escrita
  destrutiva fora dos paths autorizados pelo plano.

### Review de sprint — 2026-08-22: 4 achados, nenhum de comportamento

Classificação **alto risco** (RBAC + migration), então além do gabarito do projeto rodou a segunda
lente do Codex em read-only sobre o mesmo intervalo. **Órfãos: limpo. Leis §5: nenhuma ferida** —
`permissions` é tabela do Spatie, sem `Auditable`, então a §5.2 não é alcançada pela escrita da
migration.

Os quatro achados eram de registro e de força de teste. **O João aprovou Q-1, Q-2 e Q-3**, aplicados
em `dfb18d8d`; **Q-4 ficou deferido** e foi para o `backlog.md`, no bloco 3 (`hardening-acesso-
ownership-e-integridade`), que é onde o resto do RBAC se fortalece.

- **Q-1** — `.claude/rules/backend-ddd.md` e `docs/estrutura-monolito.md` (3 sítios) ainda
  declaravam `Feedback` como domínio a criar. A rule é **normativa e path-scoped**: entra sozinha em
  qualquer toque a `backend/app/**`, e dizia "não existe ainda" — promessa de futuro contra a D1.
- **Q-2** — `docs/README.md` mantinha 26 tabelas-alvo / 19 de domínio contra as 25 / 18 que o bloco
  escreveu no DER; divergência criada pelo próprio bloco.
- **Q-3** — o `active_plan` prometia 43→41 permissões em 4 sítios; o medido é 42→40.
- **Q-4 (deferido)** — os testes da migration não cobrem o filtro `guard_name` nem o
  `forgetCachedPermissions()` do `up()`: apagar qualquer um dos dois deixa a suíte verde (lição 10).
  Impacto hoje baixo — o banco só tem o guard `web` (medido) e o projeto não usa teams.

As correções tocaram **somente documentação** — `git diff` do commit não traz nenhum arquivo de
`backend/` ou `frontend/`, então suíte, build e lint do bloco seguem válidos como provados.

### Fechamento — 2026-08-22: o DoD reprovado contra o banco de dev, e uma pendência que o próprio bloco venceu

**Item 0 do gate, refeito e não herdado.** A suíte roda em sqlite `:memory:` com o catálogo já
limpo, então ela não é prova deste bloco — o que se remediu foi o banco de dev e a API:

- ciclo completo da migration: **40** permissões e **0** órfãs; `migrate:rollback --step=1` devolveu
  as duas `feedback.*` e o total voltou a **42**; `migrate` removeu de novo, órfãs em **0** e a role
  `redator` de volta às suas **2** (`operation.turma.view`, `operation.turma.submit_docs`);
- `GET /api/permissions` com sessão de admin real (cookie Sanctum, `Origin` + `Accept`) devolveu
  **200 com 40 itens em 5 grupos** — `identity` 6, `commercial` 16, `catalog` 5, `operation` 10,
  `certification` 3 — e **zero** `feedback.*`;
- sessão de **redator ativo** (`juan.morales@lotus.cl`) trouxe **exatamente 2** permissões, e
  `GET /api/turmas/6` e `GET /api/turmas/6/documents` responderam **200/200**: a remoção não tirou
  capacidade. O `POST` de documento **não** foi repetido — foi provado em **201** na execução, e
  repetir só criaria uma segunda sonda soft-deleted. O `[]` do index confirma que a `files#43` da
  execução segue inerte.

**Resto do gate.** Suíte **877 testes / 3131 asserções / 0 falha / 5 skipped**; `pnpm lint` exit 0;
`pnpm build` verde; `pnpm test` 87 arquivos / 481 testes; Pint `passed` nos 5 arquivos da sprint;
`typescript:transform` rodado e `generated.ts` **sem diff** — nenhum DTO no intervalo. Nenhuma lei
do §5 ferida. Nenhum `.gitkeep` órfão, nenhum placeholder, zero `feedback` residual em catálogo,
seeder e nas três locales.

**O comando de teste documentado morreu de novo, e é a P-50** — `Allowed memory size of 134217728
bytes exhausted … PhpEngine.php:62`. Terceira medição consecutiva com o pico encostando no teto
(129, 127, 129 MB). A ficha ganhou a medição de hoje; o gate rodou pelo binário direto, como ela
manda.

**A P-43 fechou aqui, e o gate parou para isso.** O `608a436c` tocou `docs/der-fisico.md`, que era
exatamente o gatilho da ficha. Honrá-la mexia no contador que o **Q-2 do review** tinha acabado de
reescrever (`26/19` → `25/18`), então a decisão foi do João, não minha. **O alcance era maior que os
quatro sítios registrados:** medido contra o banco, `certificates` tem 6 linhas e
`certificate_sequences` tem 1, ambas de `2026_08_05_100000_certificates.php`. As duas saíram de
`Tabelas PLANEJADAS` para uma seção `Certification` em `IMPLEMENTADAS`, **escrita a partir da
migration e não do rascunho PT/ES** — o rascunho prometia um `qr_code_hash UK` que não existe em
lugar nenhum do backend e omitia `redator_id`, `snapshot`, `revoked_at`, `revocation_reason` e a
coluna gerada `active_enrollment_id`. O contador virou "18 de domínio, todas implementadas", a
seção virou `Tabelas que NÃO existem (e por quê)` e a legenda que explicava a convenção de tabela
planejada saiu, porque não descrevia mais nada.

**Efeito colateral no backlog, registrado e não silencioso:** a P-43 saiu do escopo do **BD-15**, e a
ficha do **D-17** parou de chamar as permissões `feedback.*` de "instância viva" — este bloco as
apagou. O D-17 mudou de natureza: perdeu o caso vivo e ganhou o **caso de regressão**, porque a
catraca que ele pede tem de reprovar justamente a aresta que este bloco removeu à mão.

**Rastro:** a **P-40** saiu de `encerradas.md` (primeiro fechamento posterior ao do BD-12) e a
**P-43** entrou. Abertas: **29 → 28**. Plano e spec arquivados; a entrega mais antiga do
`progress.md` (2026-08-17, Dashboard B2) desceu **verbatim** para o `progress-archive.md`, que
mantém o limite de dez.

**A branch `feat/feedbacks-resolver-escopo` não foi mesclada** — merge é passo do
`finishing-a-development-branch`, e a integração é serial entre lanes. Decisão do João.

**Estado: `idle` na lane-a.** As lanes `b` e `c` seguem em `context_required` com o Codex; o foco
continua em `lane-a` de propósito — mudar de foco é promover trabalho, e o backlog não promove
sozinho.

---

## Fechado em 2026-08-22 — `bd12-load-state-e-listas`, BD-12 dos blocos de dívida

### Merge da `main` — 2026-08-22: a árvore que a prova exigia

O João mandou trazer a `main` **antes** da prova de fechamento, e o motivo é medido: a `main` fechou
o **BD-18** em paralelo e o `ca096650` reescreveu a mensagem de falha dentro de `CourseStep.tsx` —
exatamente o sítio que a P-40 mede. Provar sem o merge teria provado código que não vai para a
`main`. A nota do próprio `backlog.md` de lá já dizia isso: *"o alcance de D-55 e P-40 se remede
contra a árvore com o BD-18 dentro, não contra o basis"*.

23 commits, **um único conflito** — o `updated_at` do frontmatter do `state.md` —, resolvido para o
desta árvore. Todo o resto mesclou limpo, `.claude/rules/frontend-fsliced.md` incluído: os dois lados
escreveram em regiões diferentes do mesmo arquivo. `backlog.md`, `historico/progress.md` e
`pendencias/` vieram inteiros da `main`. Árvore mesclada: `pnpm lint` 0, `pnpm build` verde,
**87 arquivos / 481 testes**, zero falha — o `cellMemo={false}` não regrediu nenhuma das 26 provas
novas do BD-18.

### Fechamento — 2026-08-22: os dois débitos provados no navegador, contra a árvore mesclada

**Item 0 do gate, na tela e não no diff** (Chromium, Vite desta árvore na **5174**, API real em
`:8080`, sessão de admin; a 5174 está em `SANCTUM_STATEFUL_DOMAINS` desde `6fd0ad8`):

- **D-55, o sujeito** — em `/cursos`, visão `Archivados`, a célula `Archivado el` do curso arquivado
  em 2026-08-18 acompanhou a troca de idioma **pelo menu, sem F5**, nos três idiomas: `18-08-2026`
  (es-CL) → `8/18/2026` (en) → `18/08/2026` (pt-BR), com o cabeçalho indo junto (`Archivado el` →
  `Archived on` → `Arquivado em`). Antes do knob o cabeçalho trocava e o valor congelava.
- **D-55, os controles positivos** — em `/administracion`, `Último acceso` foi de
  `22-08-2026 01:59 a. m.` para `8/22/2026 01:59 AM` e o `AppTag` de estado de `Activo` para
  `Active`, na mesma troca. Os dois congelavam pelo mesmo motivo e destravaram pelo mesmo knob: o
  alcance é o wrapper, não a coluna de arquivamento.
- **D-55, o controle negativo** — `ArchivedQuotesList` (layout flex, **fora** de DataTable) seguiu
  trocando ao vivo: `Archivado el: 22-08-2026` → `Archived on: 8/22/2026`. Nada regrediu onde o
  defeito nunca existiu. A cotação usada na sonda foi arquivada e **restaurada** pela própria tela.
- **P-40** — com o catálogo de dev **de fato vazio** (`GET /api/courses` = 200 e `[]`), o passo 1 do
  wizard de cotação mostrou o título `Curso` e **`No hay cursos.`**; `No se pudieron cargar los
  datos` e `Reintentar` **não apareceram** (`find` sem match nos dois), o campo de busca não nasceu e
  `Siguiente` ficou desabilitado. Controle positivo dos dois lados: o mesmo wizard listando os cursos
  antes de esvaziar e depois de restaurar.

**O classificador de auto mode recusou o laço de `curl -X DELETE` sobre os cursos** — a mesma família
de recusa que congelou a P-40 em 2026-08-14, quando o `tinker` foi barrado. Contornada pelo caminho
que o usuário usa: os três cursos foram arquivados e restaurados pela ação `Archivar`/`Restaurar` da
linha, no navegador. A medição é a mesma; o que mudou foi a ferramenta.

**Zero resíduo no banco de dev** (P-44 existe por gates que esqueceram o próprio rastro): ids ativos
`[1,2,3]` antes e depois, `IDENTICO`; o único curso arquivado que sobra é o `GATE T7` de 2026-08-18,
anterior ao bloco; a cotação `Mantenimiento de subestaciones` voltou ativa ao `Scap 1`, que exibe as
3 cotações de novo.

**Resto do gate.** `pnpm lint` exit 0 · `pnpm build` verde · `pnpm test` **87 arquivos / 481 testes**,
zero falha. **`php artisan test`, Pint e `typescript:transform` são N/A por escopo medido**, não por
suposição: `git diff main...HEAD --name-only -- backend/ frontend/src/shared/types/generated.ts`
devolve **zero arquivo** — mesmo precedente do fechamento do BD-18. Código morto: o bloco criou um
arquivo de teste (consumido pelo runner) e uma prop; nenhum `.gitkeep`, nenhum placeholder, e o
`eslint` reprova import não usado. Leis §5: nenhuma contrariada — a mudança vive em `shared/ui`, sem
schema, sem `generated.ts`, sem Sanctum, RBAC, dinheiro ou certificado.

**Pendências.** A **P-40** foi encerrada por este bloco e está em `pendencias/encerradas.md`, com a
linha do índice acompanhando. A **P-29** e a **P-35** saíram de vez: este é o primeiro fechamento
**posterior** ao do BD-14, que é a condição literal que elas registravam. **Nenhuma pendência nasceu
nesta sprint.** O ponto que o review deixou fora de escopo por decisão do João — `beforeAll` mutando
idioma em `archivedColumns.test.tsx` — **não virou ficha**: o arquivo restaura o idioma no próprio
teste e no `afterAll`, o raio foi medido como zero e transformar em pendência uma decisão de não
corrigir seria criar rastro contra a decisão. Fica registrado aqui; se o João quiser ficha, ela nasce
com gatilho.

**Arquivados:** plano em `plans/archive/2026-08-20-bd12-load-state-e-listas.md` e spec em
`specs/archive/2026-08-20-bd12-load-state-e-listas-design.md`; o link da spec dentro do plano foi
reapontado para o caminho novo. **Backlog:** o bloco BD-12 saiu da fila e a ficha do **D-55** saiu da
lista de débitos técnicos, pelo mesmo padrão do BD-18. Nada foi promovido — a fila só anda por
escolha explícita do João.

**Estado: `idle`.** `state_basis_commit` continua em `fc852ce3`, o commit contra o qual o João
promoveu o BD-12; o SHA deste fechamento não entra no arquivo que ele fecha.

## Fechado em 2026-08-20 — `bd18-useloadstate-promise-e-forma`, BD-18 dos blocos de dívida

### Seleção — 2026-08-20

**Promoção explícita do João**, com esta árvore em `idle`. O gate do `/planejar-bloco` reprovou o
argumento pelo motivo de sempre: veio o título de seção do backlog (`BD-18 · Frontend · useLoadState:
…`, com separadores e travessão pendurado), não o slug — e `active_work_item` era `null`, então
"corresponder exatamente" também falhava. Nenhum arquivo tocado antes da decisão dele.

**Quatro decisões dele fecharam o gate:** o slug `bd18-useloadstate-promise-e-forma`; **rota direta a
`ready_for_planning`, sem Context Packet** (os três débitos nasceram de medição local — D-54 e D-56 no
review e no fechamento do BD-17, D-14 no review do BD-6 —, e não há fonte externa a recuperar); a
worktree `fix-frontend` seguindo na branch atual `docs/bd18-agrupamento-useloadstate`, que já carrega
o commit de agrupamento do backlog; e o **alcance completo do D-54**, contra o que a ficha registrava.

**Segunda árvore viva, medida e não deduzida:** `/home/jvbat/projetos/lotus` está em
`bd14-contrato-de-entrada`, `workflow_state: ready_for_review`. É bloco de **backend**, então a P-03
não dispara (o gatilho dela são dois blocos de backend) e a única colisão possível é
`docs/superpowers/**`, que sempre colide e é merge mecânico. Sexta exceção declarada à invariante de
um `active_work_item`, por decisão do João.

### Planejamento — 2026-08-20

**O escopo do bloco é maior do que as duas fichas registravam, e isso foi medido antes de desenhar.**
A ficha do D-54 dizia "2 hooks compartilhados e 7 consumidores"; a varredura por forma
(`void <query>.refetch()`) contra `93acf6a7` achou **14 produtores em 12 arquivos**, dos quais
**seis** alimentam um `AppErrorState` de tela cheia — o único componente que de fato aguarda a
promise. **Três travam a promise por TIPO** (`useValidationPage.ts:9`, `useDashboard.ts:48`,
`StudentClientField.tsx:40` declaram `() => void`), onde trocar o corpo sem trocar a assinatura não
mudaria nada. E a ficha errava os sítios de prova: `QuotesList:60`/`:74` e `BudgetDialog:85` são
`InlineLoadState`, cujo botão **não tem estado de carga** — hoje a promise ali não muda nada.

Spec em `specs/archive/2026-08-20-bd18-useloadstate-promise-e-forma-design.md`, oito decisões. As que mudam o
desenho em relação ao que o backlog previa: `listSource` mora em **`shared/hooks`**, não em
`shared/lib` ao lado do irmão `archivableSource`, porque precisa de `@tanstack` e de `ProblemDetails`
e a fronteira `shared/lib` × `shared/api` está registrada em três arquivos (D1); a extração são
**duas** exportações, não uma — `listSource` para os quatro sítios de forma de página e `loadFailure`
para os dois hooks de carga, que falam outra grafia e não caberiam na primeira (D2/§3); e o
`InlineLoadState` entra no bloco com a espera compartilhada, senão a promise recém-corrigida seguiria
descartada em 12 usos (D5).


**Plano em `plans/archive/2026-08-20-bd18-useloadstate-promise-e-forma.md`: 10 tasks, uma por commit.** A
ordem interna que o backlog fixou (D-56 antes de D-54, D-14 por último) é respeitada, e a peça nova
entra antes de todo o resto: extrair o normalizador primeiro faz a promise nascer certa nos sítios de
uma vez, enquanto corrigir a promise antes seria consertar cópias que o passo seguinte apagaria.

**Uma segunda medição durante o `writing-plans` emendou a spec, e a decisão de escopo foi do João:**
a política `loadFailure` está escrita à mão em **12** sítios, não nos 6 que a §3 tabela — os seis
extras (`useEnrollmentSection`, `useTurmaDetail`, `useRedatorPicker`, `useTurmaDocsSection` e os dois
de `useBudgetDetail`) são exatamente os arquivos que a D4 já abre para devolver a promise. **Dois
ficam de fora com motivo declarado:** `useHistorial` e `useEmissionPanelState` escrevem
`isError ? (error ?? null) : null`, que é outra política — devolve `null` onde a nossa devolve `{}` —
e trocá-la mudaria tela sem DoD que o cubra.

**Baseline medida antes da Task 1, não herdada:** `pnpm test` 81 arquivos / 453 testes verdes, lint
exit 0, build verde. O gate da Task 10 cobra 85 / 467.

### Execução — 2026-08-20

**As 10 tasks executadas em `subagent-driven-development`, uma por commit**, de `add3511f` a
`ee650ffb`, na worktree `fix-frontend`. Ledger em `.superpowers/sdd/progress.md`. Gate final:
`pnpm lint` exit 0, `pnpm build` verde, `pnpm test` **84 arquivos / 468 testes**.

**As duas varreduras que fecham os débitos, rodadas antes de a rule ser escrita e reconferidas no
review final:** `grep "isError ? (.*?? ({} as"` e `grep "void .*\.refetch()"` devolvem **zero
linha** fora de teste. `git diff main...HEAD -- backend/ generated.ts` = vazio, então Pint,
`php artisan test` e `typescript:transform` seguem N/A por escopo medido.

**Quatro desvios do plano, todos registrados no ledger com o motivo:** (1) o parâmetro de
`listSource` virou **estrutural** — o `...listSource(query)` do plano não compilava, porque
`useCrudPage`/`useArchivedPage` seguram contrato estreito, e a alternativa era um `as UseQueryResult`
que mentiria sobre os fakes de teste; (2) o `refetch` é **anotado** `(): Promise<unknown>` e não
deixado inferir — o inferido vaza `QueryObserverResult` para cima por `ReturnType<>` e obrigaria
todo stub a montar o resultado inteiro; (3) `InlineLoadState.test.tsx` **já existia** (o mapa do
plano errava), então os testes foram acrescentados e o alvo caiu de 85 para 84 arquivos; (4) um
teste a mais que o previsto, cobrindo o ramo `readOnly` do `RedatorCourseSelector`, por achado de
review de task.

**As contagens intermediárias do plano não fechavam em cadeia** (esqueciam os 5 testes da Task 1).
O alvo final dele — 467 testes — estava certo; ficaram 468 pelo desvio (4).

**DoD end-to-end provado no navegador**, contra a API real em `:8080`, com falha **isolada** por
rota (interceptação no browser, sem derrubar o nginx — o `GET /api/me` sobreviveu e o shell não
redirecionou): (1) o "Reintentar" de tela cheia em `/operacion/turmas/6` fica `disabled` com o GET
**segurado em voo** e volta quando ele responde; (2) o `InlineLoadState` do diálogo de orçamento
fica `disabled` **com spinner** durante todo o voo do `GET /api/clients` e volta depois — é o
comportamento que ele não tinha; (3) com o `GET /api/redatores` falhando e cache em mão, a seção
WRITERS do diálogo de curso **mantém os três redatores** e o aviso vai ao lado, sem o erro de seção
inteira; (4) as cinco telas de arquivados (`/comercial`, `/cursos`, `/personas`, `/operacion`,
`/administracion`) seguem alternando ativo/arquivado com as colunas `Archived on`/`Archived by` e
voltam ao ativo.

**O item não-binário da spec §7 foi conferido e aprovado:** o botão do `InlineLoadState` não tem
`icon`, então o PrimeReact **acrescenta** o spinner à frente do label (`p-button-loading-label-only`)
e ele cresce 24px (83 → 107) durante o voo. Como é o último item da linha, não empurra nada e
continua legível.

**Observação medida, não regressão do bloco:** em `TurmaDetailPage` o "Reintentar" fica `disabled`
por ~300ms e então a tela inteira troca pelo esqueleto, porque o ramo `loading` vem antes do
`loadError` na página. Comportamento pré-existente, fora do escopo do BD-18.

**Review final da branch (`requesting-code-review`, opus): "ready to merge with fixes", sem
Critical.** Os três Important foram fechados no commit `ee650ffb`: a rule ganhou as duas exceções
deliberadas (`useHistorial`/`useEmissionPanelState` devolvem `null` onde a política devolve `{}`), o
`onRetry` de `AdminView`/`PeriodFilter` parou de mentir com `() => void`, e o `useRetryPending`
ganhou `catch` e o registro de por que o `setPending` pós-unmount não é vazamento no React 19. O
terceiro Important era a própria transição de estado, feita aqui. Os Minors e os dois débitos novos
que o review mediu (`StudentDetailSections` como terceiro sítio do D-14; a expressão de mensagem do
aviso repetida em 5 componentes) ficam para a triagem do João no review do bloco.


### Revisão de sprint — 2026-08-20: risco BAIXO, uma lente, 4 achados, zero violação de lei

**Classificação: BAIXO risco** — frontend puro, `executor: claude`, sem schema, `generated.ts`,
Sanctum, auditoria, RBAC, dinheiro ou emissão de certificado. Os três hooks de `certification` entram
só pelo tipo de retorno do `refetch`. **Uma lente, sem revisão independente do Codex.**

**Fronteira do bloco reconferida:** `git diff --name-only main...HEAD -- backend/ frontend/src/shared/types/generated.ts`
devolve **zero arquivo**. **Gate re-rodado nesta revisão:** `pnpm lint` exit 0, `pnpm build` verde,
`pnpm test` **84 arquivos / 468 testes**. **Órfãos: nenhum** — `listSource`, `loadFailure` e
`useRetryPending` têm consumidor, e as duas varreduras do bloco (`void .*\.refetch()` e
`isError ? (… ?? ({} as`) seguem devolvendo zero linha fora de teste e fora dos dois sítios declarados.

**Zero violação das leis §5** e zero contra o gabarito da `frontend-fsliced.md`: nenhuma feature
importa `primereact` direto nem outra feature, nenhum `useEffect` de reset entrou, e a política de
carga passou a nascer num lugar só, que é o que a rule nova cobra.

**Quatro achados, nenhum 🔴. O João aprovou os quatro, e os quatro foram corrigidos:**

- **Q-1 🟡 P — `StudentDetailSections.tsx:33` é o terceiro sítio do D-14.** Gateia por `detail.isError`
  cru e substitui as DUAS seções; com cache em mão um refetch falho apaga vínculos e turmas já
  carregados. Some com o `useStudentDetail` sendo consumido cru (`useQuery` direto, sem
  `useResourceState`), então a derivação da mensagem também está à mão na feature. Fora do escopo
  declarado do BD-18 — destino natural é o `backlog.md`.
- **Q-2 🟢 P — `useDashboard.ts:182` guarda o último `({} as ProblemDetails)` escrito à mão**, num
  arquivo que ESTE bloco abriu. Não é a ternária que a rule nomeia (o ramo já está dentro de
  `if (query.isError)`), mas é a mesma política; `const falha = loadFailure(query); if (falha) …`
  fecha sem mudar comportamento e deixa a linha da D7 com as duas exceções que ela declara.
- **Q-3 🟢 M — `errorDetail ?? t(errorHint)` está composto à mão em 11 sítios / 7 componentes**, dois
  deles escritos por este bloco. É o D-56 um andar acima, na mensagem em vez da fonte. Contrapeso
  registrado: o docblock do `useLoadState` diz que "a política é de quem IMPRIME". Decisão de
  desenho, não correção — destino natural é o `backlog.md`.
- **Q-4 🟢 P — `AppErrorState` não tem arquivo de teste.** A D5 moveu a espera dele para o
  `useRetryPending`, e a única catraca do comportamento vive no `InlineLoadState.test.tsx`: apagar
  `loading={retry.pending}` do `AppErrorState` não deixa nada vermelho, e são os 6 sítios de tela
  cheia que consomem a promise que o D-54 pagou.

### Correções da revisão — 2026-08-20, quatro commits

`c9245218` (Q-2) · `11df3a72` (Q-4) · `ca096650` (Q-3) · `ce402a95` (Q-1), nessa ordem — o Q-3 vem
antes do Q-1 porque o sítio novo do detalhe do aluno já nasce usando o `loadMessage`.

- **Q-2** — `useDashboard` passa a chamar `loadFailure`; o `if` sobre o retorno substitui o
  `if (query.isError)`, porque a política responde as duas perguntas numa. Comportamento idêntico.
- **Q-4** — `AppErrorState.test.tsx` nasce com a promise controlada do molde do `InlineLoadState`:
  `disabled` durante o voo, livre depois de resolver, clique repetido ignorado, handler `void`
  seguindo, mais os dois ramos básicos.
- **Q-3** — `loadMessage(estado, t)` em `shared/lib/screenDetail.ts`, ao lado das duas metades que
  ele junta, recebendo `t` por parâmetro (`shared/lib` não conhece i18next, mesmo motivo de
  `loadErrorHint` devolver chave). Os **13 sítios de 8 componentes** adotaram; `grep "errorDetail ?? t("`
  fora de teste devolve **uma** linha, que é a do próprio helper. A linha da rule entrou junto,
  no commit que zerou o último sítio — mesma disciplina da D7.
- **Q-1** — `StudentDetailSections` adota `useResourceState`, gateia por `failedWithoutData` e mostra
  um `InlineLoadState` só, acima das duas seções. Catraca nova no molde dos outros dois sítios do
  D-14 (o caso obrigatório é o do ramo COM cache). **`StudentLinkRow` saiu junto**: com o aviso o
  componente passou de 150 linhas e o `max-lines` reprovou — extração literal, nenhuma condicional
  mudou de forma.

**Gate depois das quatro:** `pnpm lint` exit 0, `pnpm build` verde, `pnpm test` **86 arquivos / 479
testes** (eram 84 / 468). As duas varreduras do bloco seguem em zero, e a terceira nasceu com o Q-3.
**Fronteira intacta:** `git diff --name-only main...HEAD -- backend/ frontend/src/shared/types/generated.ts`
= zero arquivo. **Nada ficou para o `backlog.md`** — os dois achados que a execução tinha deferido
(`StudentDetailSections` e a mensagem repetida) foram exatamente Q-1 e Q-3, e estão pagos.

**Não provado na tela:** as quatro correções têm catraca de teste; o DoD de navegador do bloco foi
provado antes delas, e o Q-1 mudou ramo de tela (`StudentDialog` em modo view, com o
`GET /api/students/{id}` falhando com cache em mão). Conferir no fechamento.

### Fechamento — 2026-08-20

**O que ficou pendente do review foi provado, e é o item 0 do gate:** o ramo do Q-1 na tela, na
árvore `fix-frontend` servida na **5174** (a 5173 é o `pnpm dev` do main tree, hoje em
`feat/bd12-datatable-idioma-e-catalogo-vazio` — provar nela teria provado o código de outro branch;
as duas portas já estão em `SANCTUM_STATEFUL_DOMAINS` e `FRONTEND_URL` desde o `6fd0ad8`). Chromium
contra a API real em `:8080`, com falha isolada por rota (`**/api/students/35` → 500
`application/problem+json`), sem derrubar nada em volta.

**Os três ramos, com a rede confirmando a sequência** (`200` → `500` → `500` → `200` no
`GET /api/students/35`), sobre a aluna Javiera Lagos (1 vínculo, 1 turma):

1. **Falha COM cache — o defeito que o Q-1 pagou.** Reabrir o diálogo com o GET em 500 mantém
   "Company links" (`Enel Distribución · Current · since Aug 2026`) e "Turma history"
   (`Scap 5 - Cot 1 · Seguridad en alta tensión · Jun 2026 · Failed`), e põe **um** aviso `role=alert`
   ACIMA das duas, com "Retry". Antes da correção, o `detail.isError` cru apagava as duas seções.
2. **Retry com a falha persistente** mantém tudo — aviso, vínculos e turmas —, e some quando a rota
   volta: `unroute` + clique devolve `200` e zera o `alert`. É o `refetch` do D-54 devolvendo a
   promise no caminho real.
3. **Falha SEM cache** (recarga com a rota ainda mockada) substitui as DUAS seções pelo
   `AppErrorState` — "Could not load the data" / "Check your connection and try again." / "Retry" —,
   sem cabeçalho órfão. É o `failedWithoutData` e a D16 (vazio silencioso proibido) na tela.

**A mensagem impressa é o hint por status, não o `detail` do servidor** — o `detail` injetado
("Falha injetada no DoD") não aparece, porque o `screenDetail` só o repassa com `localDetail: true`.
Comportamento por desenho, conferido de passagem.

**Gate:** `pnpm lint` exit 0 · `pnpm build` verde · `pnpm test` **86 arquivos / 479 testes**.
Backend **872 passed / 5 skipped, 3095 asserções**, intocado — pelo binário direto com
`memory_limit` elevado, porque o comando do `CLAUDE.md` §6 morreu de novo: é a **P-50**, que ganhou a
reprodução desta árvore com o pico agora **acima** do teto (129,00 MB contra 128M). **Pint e
`typescript:transform` não se aplicam** — `git diff --name-only main...HEAD -- backend/ frontend/src/shared/types/generated.ts`
devolve zero arquivo. **Órfãos: nenhum** — `listSource`, `loadFailure`, `useRetryPending`,
`loadMessage` e `StudentLinkRow` têm consumidor. **As três varreduras do bloco seguem em zero fora de
teste**, cada política com uma única linha viva: `listSource.ts:19`, `screenDetail.ts:98`, e nenhum
`void …refetch()`.

**Um aviso de console apareceu e NÃO é deste bloco:** `Each child in a list should have a unique
"key" prop` no `TableBody` da **listagem** de alunos, medido pelo timestamp do log antes da primeira
falha injetada. `StudentsTable.tsx` não está entre os 51 arquivos do bloco. É o mesmo achado
registrado em 2026-08-19 no painel de emissão — mesma classe, segundo sítio.

**Um gatilho de pendência ficou ambíguo e vai para o João, não para o fechamento:** a **P-39** fecha
"quando um bloco tocar RBAC de catálogo **ou reusar a receita de injeção de falha do BD-6**". A
técnica foi reusada aqui (e já tinha sido no DoD da execução e no do BD-17), mas a fonte — o plano
arquivado do BD-6 — **não** foi lida nem reusada, e o próprio corpo da ficha proíbe retro-editá-la
(regra da P-27). O gatilho como está nunca vence por leitura própria; quem decide o que ele quer
dizer é o João. **Nenhuma pendência nasceu nesta sprint** e nenhuma das encerradas venceu a sprint de
rastro (a lista está vazia desde o fechamento anterior).

**Estado ao fechar: `idle`.** O merge com a `main` mudou isso na mesma hora — ver abaixo.

### Merge com a `main` — 2026-08-21: o mesmo trabalho estava agrupado duas vezes

**Duas árvores editaram o mesmo backlog sem se ver, e a colisão é de escopo, não de texto.** Às
**14:57** de 2026-08-20, nesta worktree, o João promoveu o **BD-18** cobrindo D-54, D-56 e D-14 — e
esse commit tirou a D-14 do BD-12. Às **16:33**, no main tree, ele reagrupou o **BD-12** para
*"load-state: o contrato de lista, o `refetch` e os sítios do BD-6"*, cobrindo **D-14, D-54, D-55,
D-56 e P-40**, e o promoveu a `ready_for_planning`. O segundo commit foi escrito sobre um backlog que
não tinha o primeiro: por isso a D-14 reaparece lá e o D-54/D-56 aparecem como órfãos a hospedar.

**Decisão do João no merge: o BD-12 segue promovido, com o escopo reduzido ao que sobrou.** D-14,
D-54 e D-56 estão pagos e provados por este bloco, então saem da cobertura do BD-12, que fica com
**D-55** (o `DataTable` não repinta as células `body` na troca de idioma ao vivo) e **P-40**
(remedição do ramo "catálogo genuinamente vazio" contra HEAD) — dois itens, não cinco. Nenhum dos
dois foi tocado aqui.

**Uma correção de índice entrou junto, e não é achado deste bloco:** o `pendencias/README.md` dizia
"Encerradas (0)" enquanto `encerradas.md` já carregava **P-29** e **P-35**, fechadas no BD-14 — o
fechamento de lá atualizou a ficha e não a linha do índice. As duas **não saem** no fechamento do
BD-18: ele correu em paralelo ao BD-14, não depois dele, e contar este fechamento como a sprint de
rastro apagaria a ficha antes de qualquer bloco posterior a ler.

**`state_basis_commit` continua em `fc852ce3`, que é o que o João escreveu ao promover o BD-12, e
isso é uma ressalva a carregar para o planejamento:** a árvore que o bloco vai medir já inclui o
BD-18, então o alcance de D-55 e P-40 se remede contra o merge, não contra o basis. Trocar o campo
aqui seria escolher por heurística um SHA que ninguém decidiu.

## Fechado em 2026-08-20 — `bd14-contrato-de-entrada`, BD-14 do backlog

### Execução — 2026-08-20: 9 tasks, técnica `subagent-driven-development`, main tree

Bloco de backend, então **main tree** e não worktree (P-03: o compose monta o main tree, e testar
backend em worktree produziria verde contra código diferente). Base da branch `feat/bd14-contrato-de-entrada`:
`0fe30b13`. Ledger task a task em `.superpowers/sdd/progress.md` — aqui fica só o que decide.

As três leis que o bloco construiu:

- **"Ausente não é nulo"** (D1) — `App\Shared\Data\WritableAttributes::from()` tira do array toda
  chave que chega como `Optional`; só `null` explícito apaga. Aplicada a 10 campos em 5 `Update*Action`.
- **Chave `#[Computed]` no corpo de escrita vira 422** (D3) — `App\Shared\Data\ComputedFields::rejected()`
  com a regra `missing`, e **não** `prohibited`: o vendor implementa `validateProhibited` como
  `! validateRequired`, então presente-porém-vazio (`null`, `''`, `[]`) passaria com 200 silencioso.
- **Colisão de índice único de `users` vira 422 com o campo nomeado** (D4) — `UserProvisioner::writing()`
  sobre os 9 sítios que escrevem `User`, cobrindo as duas grafias de driver.

Mais `seq_in_budget` fora do `$fillable` (D5), escrito pela Action sob o lock que já existia.

### Três decisões tomadas durante a execução

1. **Convenção vence o plano nos nomes de teste** (decisão do João): classe em inglês, método em
   português. As quatro classes de omissão foram renomeadas; o plano cita os nomes antigos no DoD da
   Task 9 e a equivalência está no ledger.
2. **A varredura da Task 8 passou dos `paths_autorizados` do plano.** O `## Handoff` autorizava
   `Quote::create` → `forceCreate` só em `Comercial/**` e `Operation/**`; sobravam 15 arquivos e a
   branch ficava com 22 falhas. Estendida depois de confirmar que **não existe `Quote::create(` em
   `backend/app/`** — a varredura é 100% código de teste. 45 arquivos, 50 ocorrências.
3. **`ProfileData` e `SessionUserData` ganharam `#[Computed]`** fora da lista de seis do plano, porque
   a DoD exige os 11 campos de foto. São DTOs só-de-saída, nascem de `fromUser()`, nunca de request.

### DoD — 2026-08-20, remedido em `5a8bcdc`

**861 testes verdes / 5 skipped**, por diretório porque a suíte unida estoura o `memory_limit` de
128M do container (P-50 confirmado de novo): Cadastros 155 · Certification 97 · Comercial 86 ·
Dashboard 37 · Identity 256 · Operation 144 · Shared 69 · Unit 17. Zero falhas. Pint verde nos
**76** arquivos PHP do bloco. `typescript:transform` com **zero diff** em `generated.ts`. Cada item
da DoD da spec mapeia para um teste nomeado e existente.

### Review final da branch — o achado que os gates por task não podiam ver

Veredito: **o que o bloco construiu está correto e provado, nada regrediu.** Mas a lei que ele declara
não vale em todo lugar que devia valer, e três contraexemplos estão dentro das Actions que o próprio
bloco editou.

A raiz: o `DefaultValuesDataPipe` do Spatie entrega o **default literal** quando a chave está ausente,
**antes** do ramo que preencheria `Optional`. `WritableAttributes` recebe então um valor real e não
tem como saber que ele foi inventado. A medição da D-13 era cega a isso — ela procurou o idioma
`instanceof Optional ? null`, e aqui o valor nunca chega como `Optional`.

Seis campos, nenhum deles regressão do bloco. **`UserData::$is_active = true` é controle de acesso:**
um `PUT /api/users/{id}` que omita a chave reativa staff desligado, e `is_active` é o portão que
`AuthController:52` usa para barrar login. Fora do `active_work_item` (a D-13 mediu 10 campos, a D-12
mediu 11 de foto; nenhum destes seis está nas listas) e o remédio ainda escolhe entre duas leituras
da D1 — foi para **[P-51](./pendencias/abertas.md)** com o custo dos dois caminhos medido.

Os Minor de código do próprio bloco foram corrigidos antes do handoff: `bfcbbc7` (o tradutor de
coluna duplicada sequestrava `NOT NULL constraint failed`), `dd0cda1` (o arch test dos 11 campos
passava vazio se o `glob` não achasse nada) e `5a8bcdc` (três dialetos fora de compasso).

### Um ponto de estado a refazer no fechamento

O base da branch, `0fe30b13`, é literalmente o commit que promoveu `bd17-superficie-de-arquivados` a
`ready_for_planning` — e o BD-14 sobrescreveu esse `active_work_item`. Nada se perdeu (o BD-17 e seus
três débitos vivem no `backlog.md:208`), mas **a promoção precisa ser refeita quando o BD-14 fechar.**
O `state_basis_commit: 0c8db94` não é o base da branch e não deveria ser: é o commit contra o qual as
medições do `backlog.md` foram tomadas, que é o que o campo quer dizer.

> **Resolvido no merge da `main` (ver a seção do merge, adiante):** a promoção não precisou ser
> refeita — a `main` promoveu, executou e fechou o BD-17 em paralelo, em 2026-08-20.

### Review do bloco — 2026-08-20: risco ALTO, duas lentes, zero violação de lei

Classificação **alto risco** (DTO de entrada, contrato HTTP, identidade/acesso, `generated.ts` no
raio). Duas lentes: gabarito do projeto (CLAUDE.md §5 · `docs/README.md` · ADRs · rules) e revisão
independente do Codex (read-only) sobre `0fe30b13..HEAD` — **o Codex não confirmou nenhum achado**.

Reprovas rodadas nesta review, não herdadas: **861 verdes / 5 skipped** por diretório (P-50 de novo:
a suíte unida morre no `memory_limit`, e `php -d memory_limit=512M` não sobe o limite do processo
filho do `artisan test`); `typescript:transform` com árvore limpa; nenhum órfão (os dois helpers
novos têm 7 e 6 chamadores); `Quote::create` sem sobra fora da Action.

Dois achados, ambos sobre o **alcance** da lei nova, nenhum regressão do bloco:

- **Q-1 🟡** — a D-12 aplicou `ComputedFields::rejected()` só à chave de foto. Seis chaves
  `#[Computed]` não-foto seguem engolidas com 200 em DTO de entrada: `UserData::$last_login`,
  `RedatorData::$last_login` e `$documents`, `StudentData::$current_client_id`,
  `$current_client_name` e `$enrollments_count`. `current_client_id` é o caso que dói: quem mandar
  vínculo no `PUT /api/students/{id}` recebe 200 e nada acontece. `documents` NÃO entra sem olhar o
  multipart do redator.
- **Q-2 🟢** — o arch test dos 11 campos varre só `app/Domains/*/Data/*.php`; campo de foto que
  nascer em `app/Shared/*/Data/` escapa da varredura e da contagem.

### Correções do review — 2026-08-20: os dois achados aprovados

O João aprovou Q-1 e Q-2; os dois entraram, com o teste reprovando antes (5 vermelhos contra o
código antigo).

- **Q-1** — `ComputedFields::rejected()` passou a listar as chaves `#[Computed]` não-foto dos três
  DTOs de entrada que as tinham: `last_login` em `UserData` e `RedatorData`;
  `current_client_id`, `current_client_name` e `enrollments_count` em `StudentData`.
  `RedatorData::$documents` ficou **de fora por medição**, com o porquê no sítio: ali a chave é
  escrita real (multipart de arquivo, descartado por `prepareForPipeline` antes dos pipes) e
  `missing` reprovaria o upload legítimo. O SPA não manda nenhuma das cinco chaves fechadas —
  `useStudentForm:22` já traduz `current_client_id` para `client_id`, que segue aceita.
- **Q-2** — o arch test dos 11 campos passou a varrer também `app/Shared/*/Data/*.php`. A contagem
  segue 11: hoje não há campo de foto fora de `Domains`, e é exatamente esse futuro que o glob
  cobre.

Reprovas depois das correções: **866 verdes / 5 skipped** por diretório (Shared foi de 69 para 74),
Pint verde nos 4 arquivos tocados, `typescript:transform` sem diff em `generated.ts`.

**Review encerrada sem achado pendente.**

---

### Fechamento — 2026-08-20: a DoD provada contra a API real, e o banco de dev devolvido como estava

**Critério de aceite provado end-to-end** (nginx `:8080`, sessão Sanctum de admin, MySQL de dev),
não só por suíte:

- **DoD 1 e 2** — `PUT /api/users/108` **omitindo** `rut` e `phone` → **200**, e o `GET` seguinte
  devolveu `rut="16.982.435-5"` e `phone="+56 9 8888 0001"` intactos. O mesmo `PUT` com
  `"rut": null, "phone": null` → **200** e os dois campos `null`. O par é a prova: só o segundo ramo
  deixaria a regressão passar verde.
- **DoD 3** — `photo_url` no corpo → **422** nas duas formas (`"http://evil/x.png"` e `null`), com
  `El campo photo url no debe estar presente.`; `last_login` → **422**; no aluno,
  `current_client_id` e `enrollments_count` → **422** (as chaves que o review acrescentou).
- **DoD 4** — `POST /api/users` com RUT já cadastrado → **422** com
  `rut: "Este RUT já está cadastrado."`. A corrida **em si** não é alcançável por uma request só —
  as duas portas (check e índice) devolvem a MESMA resposta por desenho, e a tradução do índice está
  provada em `UniqueIndexCollisionTest` com as cinco mensagens reais de driver.
- **DoD 5** — dois `POST /api/budgets/14/quotes` com `"seq_in_budget": 99` no corpo gravaram **1** e
  **2**. O payload não vence a derivação sob lock.

**Resto do gate.** Backend **866 passed / 5 skipped** por diretório (Cadastros 155 · Certification 97
· Comercial 86 · Dashboard 37 · Identity 256 · Operation 144 · Shared 74 · Unit 17); a suíte unida
morreu no mesmo `memory_limit` de sempre (P-50, gatilho visto vencer de novo e registrado na ficha).
Frontend `pnpm lint` 0, `pnpm build` verde, **435 testes**. Pint `--test` **passed** nos **76**
arquivos PHP do bloco (nunca sem argumento). `typescript:transform` rodado de novo com **zero diff**
em `generated.ts`. Código morto: os dois helpers criados têm 7 e 6 chamadores, nenhum `.gitkeep`
nasceu no bloco. Leis §5: nenhuma contrariada.

**Zero resíduo no banco de dev** (a P-44 existe justamente por gates que esqueceram o próprio
rastro): o staff de sonda (`gate-bd14@lotus.cl`, id 108), o orçamento `GATE-BD14` (id 14), as duas
cotações (13, 14) e as **6** linhas de auditoria que eles geraram foram removidos com `forceDelete`.
Conferido depois: `user=0 budget=0 quotes=0`.

**Pendências.** **P-29** e **P-35** encerradas por este bloco e movidas para `encerradas.md` com o
rastro do que as fechou. **P-51** nasceu na review final e segue aberta (decisão do João). **P-50**
teve o gatilho visto vencer de novo. **P-49 ficou órfã de bloco:** a ficha ainda diz `Bloco: BD-14`,
que acabou de fechar sem absorvê-la — reagrupar é decisão do João, não heurística do agente.

**`state_basis_commit` passa de `0c8db94` a `c61e2f4`, e isso não é divergência.** `0c8db94` era o
commit contra o qual as medições do `backlog.md` foram tomadas para ESTE bloco; fechado o bloco, o
campo volta a apontar para o último commit que comprova a entrega — o segundo dos dois que
corrigiram os achados do review.

**Um ponto de estado que este fechamento NÃO resolveu:** a `feat/bd14-contrato-de-entrada` nasceu
sobre `0fe30b13`, o commit que promovia `bd17-superficie-de-arquivados` a `ready_for_planning`, e o
BD-14 sobrescreveu esse `active_work_item`. O estado fecha em `idle` porque o gate proíbe promover
por ordem óbvia; **a promoção do BD-17 é do João** (`backlog.md`, BD-17). Isso valia enquanto este
branch não via a `main`: o merge de 2026-08-20, na seção adiante, mostrou o BD-17 já promovido,
executado e fechado lá.

### Merge da `main` — 2026-08-20: a promoção pendente do BD-17 já tinha sido feita do outro lado

O João mandou trazer a `main` para este branch antes de o PR ([#62](https://github.com/Andred21/lotus/pull/62))
ser mesclado. `git merge main` sobre a base `0fe30b13` trouxe **17 commits** e abriu **dois
conflitos, os dois de documentação de estado** — `state.md` e `historico/progress.md`. **Todo o
código mesclou limpo:** o BD-14 é backend puro e o BD-17 é frontend puro, e os dois não dividem
arquivo nenhum.

**A pendência que este fechamento deixou para o João não existe mais.** A `main` promoveu, executou,
revisou e fechou o `bd17-superficie-de-arquivados` em paralelo, entre 2026-08-19 e 2026-08-20
(`6edf1224`). O ponto anotado duas vezes acima — "a promoção do BD-17 é do João" — está resolvido por
fato consumado, não por decisão nova. **Dois `active_work_item` viveram ao mesmo tempo, em linhas
diferentes**, pelo mesmo padrão já registrado no fechamento do `arquivados-roots-restantes`: o
invariante de um só vale dentro de cada branch, não entre elas.

**Quem é o último item fechado se decide por relógio de commit, não por lado do merge:** o BD-17
fechou às **14:39** (`6edf1224`) e o BD-14 às **16:04** (`2e8c8887`). Por isso
`last_completed_work_item` fica em `bd14-contrato-de-entrada` e `state_basis_commit` em `c61e2f4` —
o commit que comprova a entrega, nem o do fechamento nem o do merge.

**Doc — o que ficou de cada lado:**

- **`state.md`:** a janela de cinco fechamentos intercalou os dois lados na ordem real
  (`bd14-contrato-de-entrada` → `bd17-superficie-de-arquivados` → `arquivados-roots-restantes` →
  `identity-ativacao-acesso-redator` → `arquivados-e-restauracao`). Saiu da janela, para o git e para
  a linha de entrega no `progress-archive.md`: `bd13-listagens-e-abas`.
- **`progress.md`:** as duas linhas novas entraram em ordem de fechamento — BD-17 antes do BD-14 — e
  a mais antiga da tabela (Dashboard B1, 2026-08-16) desceu para o `progress-archive.md`, que mantém
  a janela em dez. Os dois lados já tinham arquivado a MESMA linha por conta própria (Meu Perfil
  backend, 2026-08-15), e o git mesclou isso sem duplicar.
- **`backlog.md` e `pendencias/`:** sem conflito. Cada lado removeu o seu bloco (o BD-14 aqui, o
  BD-17 lá) e a nota de "cada um saiu desta lista" ganhou o BD-14 com os débitos que ele levou (D-12
  e D-13). Nenhuma colisão de ID: a **P-51** é daqui e o maior ID da `main` é o P-50. A **P-50** ficou
  com as medições dos DOIS fechamentos — 866 testes aqui, 828 lá, e o mesmo comando documentado
  morrendo nas duas árvores.

**A P-49 continua órfã de bloco.** O merge não a reagrupa: a ficha segue dizendo `Bloco: BD-14`, e
escolher o novo hospedeiro é decisão do João.

**Suítes depois do merge:** o frontend rodou inteiro — `pnpm lint` 0, `pnpm build` verde,
**81 arquivos / 453 testes** (as 18 provas novas do BD-17 entraram junto). O backend **não foi
medido de novo, e não precisa ser**: os 17 commits da `main` não tocam um arquivo de `backend/`
(`git log 0fe30b13..main -- backend` devolve zero), então a medição do fechamento — **866 passed /
5 skipped**, por diretório, porque a suíte unida esbarra na P-50 — continua sendo a desta árvore.

**Estado: `idle`.** Próxima ação: o João escolher o próximo item do `backlog.md`. Nada foi promovido.

## Fechado em 2026-08-20 — `bd17-superficie-de-arquivados`, BD-17 dos blocos de dívida

### Seleção — 2026-08-19

**Promoção explícita do João**, do BD-17 recém-registrado: os três débitos (D-51, D-52, D-53) foram
medidos no mesmo dia, no `/revisar-frontend` da superfície inteira de arquivados contra `0c8db94`, e
entraram no backlog pelo commit `82c1d0c4` antes de qualquer plano. **Rota direta a
`ready_for_planning`, sem Context Packet** — a fonte do bloco é o próprio código medido, não Drive
nem Notion, e `context_packet` ficou `null` do começo ao fim.

**Área de trabalho: a worktree `fix-frontend`**, branch `feat/bd17-superficie-de-arquivados` a partir
de `0c8db946`. **Risco projetado BAIXO e confirmado no review:** frontend puro, sem schema, sem
`generated.ts`, sem Sanctum, auditoria, RBAC, dinheiro ou emissão de certificado; `executor: claude`.

### Execução — 2026-08-20: 3 peças novas, 6 roots adotando, 1 sítio corrigido direto

**A ordem interna do backlog foi respeitada: D-53 antes de D-51.** Corrigir a data primeiro obrigaria
a tocar 8 sítios e deixaria o nono root livre para reintroduzi-la; com a coluna compartilhada, o
`formatDate` tem um pouso só.

**As três peças, todas em `shared/`:** `archivableSource()` mais `ArchivableRow<T>`/`ListSource<T>` em
`shared/lib/archivable.ts` (`1bc35876`); `archivedColumns(t)` em `shared/ui` (`86c691a7`); e os dois
aliases de operação em `features/operation/hooks/` (`8d6a2dec`), que existem porque `useTurmas.ts` é
artesanal, não passa pelo `createCrudResource` e devolvia `UseQueryResult` cru — a assimetria que
fazia a `OperationPage` ser a única a derivar `loadError` dentro da prop.

**`archivedColumns` é FUNÇÃO, nunca componente, e isso tem catraca.** O `DataTable` do PrimeReact
resolve coluna lendo o filho **direto** (`Children.toArray`), então um componente — ou um Fragment
envolvendo as duas colunas — achataria as duas numa coluna lixo, sem `field`, **sem estourar build,
lint ou suíte**. O teste prova as duas formas lado a lado, e prova também que o `{archived && ...}`
das tabelas não deixa coluna fantasma no modo ativo.

**Seis roots adotaram em cinco commits** (`de3b362b`, `9dba76c6`, `db506f39`, `9747ad33`, `4cca8f97`,
`60dfd1cc`): as 8 declarações de `XRow` à mão sumiram, as ~84 linhas de coluna duplicada viraram uma
chamada, e o quarteto de ternários dentro das props das 6 páginas virou uma escolha só. O nono sítio
do D-51, `ArchivedQuotesList`, é layout flex e não tabela — foi corrigido direto (`1d61b287`).

**Uma correção medida entrou na spec (§11):** o `tsc` reprovou com **TS2322** e forçou o tipo de
retorno explícito `ReactElement[]` em `archivedColumns` (`ae102f11`). Sem ele a inferência abria a
porta para exatamente a forma que a catraca proíbe.

### DoD — provado na tela, não no diff

**Navegador em `en-US`, interface em `es-CL`:** a coluna "Archivado el" imprime no idioma da
**interface**, que é o defeito inteiro do D-51 (`8/19/2026` do navegador contra `19-08-2026` do resto
da tela). Teste de regressão no molde do precedente `AppFileRow.test.tsx`, medindo contra o `Intl` da
tag fixada — não contra o próprio `formatDate`, que passaria por acaso numa máquina cujo locale
coincidisse com o da interface.

**Dois débitos nasceram da medição, e nenhum é regressão deste bloco.** **D-54** — o `refetch` do
`useLoadState` faz `void query.refetch()` e engole a promise que o `AppErrorState` aguarda (Q-14); é
anterior ao bloco, e é por isso que os aliases novos nasceram **sem** ele, com o `refetch` devolvendo
a promise e um teste guardando a diferença. **D-55** — o `DataTable` não repinta as células `body` na
troca de idioma ao vivo; isolado como limitação de plataforma porque `ÚLTIMO ACCESO` (`formatDateTime`,
fora do escopo) e o `AppTag` de estado congelam igual, enquanto o `ArchivedQuotesList`, mesma
`formatDate` **fora** de DataTable, troca ao vivo. Com recarga a grafia está correta nos três idiomas
— o D-51 está pago.

### Revisão de sprint — 2026-08-20: risco BAIXO, uma lente, 2 achados 🟢, zero violação de lei

**Classificação: BAIXO risco** — uma lente, sem revisão independente do Codex.
**Fronteira do bloco provada:** `git diff main...HEAD -- backend/ frontend/src/shared/types/generated.ts`
devolve zero arquivo. **Órfãos:** nenhum — os 8 símbolos novos têm consumidor, e `useTurmas`/
`usePendingQuotes` seguem vivos pelas query keys e pelos outros hooks. **Escopo pago, medido:** zero
`toLocaleDateString()` cru em `src/`, zero `archived_at?:` declarado à mão, zero quarteto de ternário.

**Q-1 🟢, corrigido no branch** (`4c9a2580`): `usePendingQuotesPage` morava em `useTurmasPage.ts` e
quebrava o um-hook-por-arquivo dos outros 7 aliases. **Q-2 🟢, registrado como D-56**: a forma
normalizada `{items, loading, error, refetch}` passa a ser montada à mão em **5 sítios**, padrão
reincidente da mesma política que já divergiu em 2026-08-14 — o texto da linha de rule ficou guardado
na ficha, para ser escrito quando o débito for pago (escrevê-lo antes tornaria a rule falsa nos cinco
sítios).

**Dois candidatos foram descartados por serem decisão consciente já registrada** — D-54 e D-55 —, e a
observação de que o `state.md` não tinha narrativa do BD-17 caiu na verificação: **todas** as seções
deste arquivo são de item **fechado**, escritas pelo `/fechar-sprint`, não durante a execução.

### Fechamento — 2026-08-20

**Gate do frontend:** `pnpm build` verde, `pnpm lint` exit 0, `pnpm test` **81 arquivos / 453 testes**
(baseline do bloco: 77 / 435). **Backend intocado e verde assim mesmo: 828 passed / 5 skipped, 3006
asserções** — pelo binário direto com `memory_limit` elevado, porque o comando que o `CLAUDE.md` §6
documenta morre no meio: é a **P-50**, reproduzida aqui com pico de 127,00 MB. **Pint e
`typescript:transform` não se aplicam** — zero arquivo de `backend/`, zero DTO.

**A P-03 apareceu pelo gatilho dela, e não fechou:** o `docker compose up -d` desta árvore não sobe o
`mysql` porque o `lotus-mysql-1` do main tree já ocupa a porta 3307. A suíte não precisa dele (sqlite
`:memory:`), então o `app` subiu com `--no-deps`; o que **não** dá para refazer nesta sessão é a prova
de navegador, que depende da API com dado real. Ela está feita e datada acima, contra `1d61b28`, e o
único arquivo de renderização que mudou desde então foi o tipo de retorno de `archivedColumns`.

**Estado: `idle`.** Próxima ação: o João escolher o próximo item do `backlog.md`. Nada foi promovido.

## Fechado em 2026-08-19 — `arquivados-roots-restantes`, Próximos blocos item 1

### Seleção — 2026-08-18

**Primeiro item de "Próximos blocos" (`backlog.md:101`), promovido explicitamente pelo João** com o
estado em `idle` e `active_work_item` `null`. O gate do `/planejar-bloco` reprovou pelo motivo de
sempre — **décima terceira** vez: o argumento `arquivados-roots-restantes` era **slug inventado por
mim no turno anterior**, não slug promovido, e `active_work_item` estava `null`.

**Três decisões dele fecharam o gate:** o slug `arquivados-roots-restantes`; a rota **direta a
`ready_for_planning`, sem Context Packet novo**; e **main tree**, partindo de
`feat/arquivados-e-restauracao@6fd0ad8` e não da `main`.

**O gate pegou um erro meu de escopo, e ele é o registro mais importante desta seleção.** Ao oferecer
as opções eu descrevi o escopo como `Budget`/`Quote`, `Redator`, **`Student`** e `Turma`/`Enrollment`
— montado sobre os 8 roots do Context Packet de 2026-08-18. A linha 101 do backlog diz outra coisa:
**`Budget`, `Quote`, `User`, `Redator`, `Turma` e `Enrollment`**, com `Student` em **"Fora de
escopo"** por não ter `destroy` hoje. Eu **incluí `Student`** e **omiti `User`**. O João escolheu
seguir o backlog, e o escopo do bloco são os **seis roots** da linha 101. A medição do próprio turno
confirmou o motivo do backlog: `students` é `apiResource` com `index/store/show/update` apenas
(`Identity/routes.php:46`), então arquivar aluno seria superfície nova com regra a inventar — não
replicação.

**Por que a branch não nasce da `main`.** `App\Shared\Concerns\ArchivesChildren`,
`LoadsCascadedChildren`, `useArchivedPage`, `ArchiveSwitch` e o `archived` do `createCrudResource`
existem **só** na `feat/arquivados-e-restauracao`, que segue sem merge por decisão do João. Nascer da
`main` significaria reimplementar ou conflitar. A branch `feat/arquivados-roots-restantes` foi criada
de `6fd0ad8` ANTES deste commit, seguindo o precedente do bloco anterior.

**`state_basis_commit` passa de `3d02a46` a `6fd0ad8`, e isso não é divergência.** `3d02a46` era o
baseline escrito quando o bloco anterior entrou em `ready_for_review`; os dois commits seguintes
(`1e07786` correções do review, `3d7e95c` fechamento) e o `6fd0ad8` desta sessão vieram depois. Com
`active_work_item` `null` não havia trabalho ativo cujo baseline pudesse derivar.

**Por que não há Context Packet novo.** O packet
`context-packets/2026-08-18-arquivados-e-restauracao.md` já foi gerado **sobre os 8 aggregate roots**,
não sobre os dois executados, e as fontes externas (Notion H.5.1–H.5.4 + Drive) foram esgotadas nele
— inclusive a ausência medida de documento funcional no Drive. O molde de decisão vive em
`specs/archive/2026-08-18-arquivados-e-restauracao-design.md` e a mecânica em código. Recuperação
externa não se repete sem fonte nova.

**`context_packet` aponta para o packet do bloco anterior, e isso é obedecer o invariante, não
reciclar por preguiça.** O invariante diz que, quando o trabalho depende de contexto externo, o
campo **não pode ser `null` em `ready_for_planning`**. O packet cobre os 8 roots, então é fonte
válida para estes seis; herdá-lo declarado é mais honesto que apagar a dependência escrevendo
`null`.

**Um commit fora de bloco entrou antes desta promoção.** `6fd0ad8` (`fix(cors)`) fecha o lado de
aplicação da **P-45**: `allowed_origins` tratava `FRONTEND_URL` como valor único e o `.env` de dev já
é lista (`5173,5174`). Não é deste bloco nem do anterior — era o WIP do João que atravessou os dois,
declarado na seleção anterior. Com ele, `php artisan test` dá **717 passed / 5 skipped** sem precisar
de `FRONTEND_URL` no comando. Pint também limpou a formatação pré-existente da linha `paths`.

### Medição da abertura — 2026-08-18, sobre `6fd0ad8`, não herdada

Sete medições, feitas antes do brainstorming e registradas para ele.

1. **Gates de arquivamento que já existem, por root.** `Budget` recusa se houver cotação **aprovada**
   (`DeleteBudgetAction:20`, 422 "Recuse-a antes"); `Quote` recusa `status === Approved`
   (`DeleteQuoteAction:19`); `Turma` recusa `status !== EmAndamento`
   (`Turma::assertAcademicallyWritable():143`, RN-15); `Enrollment` recusa pela turma
   (`RemoveEnrollmentAction:11`); `User` recusa o último superadmin ativo (`DeleteStaffUserAction` +
   `SuperadminGuard`) e o controller ainda faz `abort_unless($user->type === 'admin', 404)`
   (`UserController:60`). **`Redator` não tem gate nenhum** — `RedatorController:53-58` chama
   `$redator->delete()` cru, sem Action.
2. **Só dois dos seis roots cascateiam com a marca.** `Client` e `Course` usam `markAndDelete`
   (feitos). `Budget → quotes`, `Redator → documents + user` e `Student → user` cascateiam com
   `delete()` cru, **sem `archived_with_parent`**. `Turma` e `Enrollment` **não têm hook `deleting`
   nenhum**: arquivar turma hoje deixa matrículas, documentos e o pivot ativos.
3. **A coluna existe em 5 tabelas** — `client_addresses`, `client_contacts`, `users`,
   `course_modules`, `course_certificate_templates`. Faltariam ao menos `quotes` e `files`; `users`
   já tem e é reaproveitada por `Redator` e `Student`. **O bloco toca schema**, então o planejamento
   lê `docs/adrs.md` e `docs/der-fisico.md`.
4. **O gate de Operação torna a lista de Arquivados estruturalmente pequena.** `Concluida` é estado
   **terminal** (enum, D5) e `assertAcademicallyWritable` exige `EmAndamento`, então turma concluída
   e suas matrículas **nunca** chegam a Arquivados. Coerente com o peso legal; confirmar no
   brainstorming se é o comportamento desejado antes de construir a tela.
5. **`Certificate` é o piso legal e NÃO é soft-deletable.** `Certificate extends Model` sem
   `SoftDeletes`, com `enrollment()`, `course()` e `redator()` os três `belongsTo(...)->withTrashed()`.
   O certificado sobrevive ao arquivamento de tudo que o originou e lê os pais arquivados. Isso
   **valida** o modelo e impõe que arquivar `Redator` ou `Course` não quebre essa leitura.
6. **Redator arquivado some da turma em silêncio.** `turma_redator` é pivot cru (`id`, `turma_id`,
   `redator_id`, `timestamps`) — sem `deleted_at`. A FK é `restrictOnDelete` ("redator com turma não é
   apagado", lição #15), o que barra **hard** delete, não soft. `Turma::redatores()` é
   `belongsToMany` **sem `withTrashed`** (`Turma.php:82`), então a linha do pivot fica viva e a turma
   simplesmente para de listá-lo. Três saídas possíveis: gate, cascata do pivot, ou `withTrashed` na
   relação.
7. **Os dois restores automáticos seguem sem decisão.** `StudentResolver:71-79` restaura `User` e
   `Student` ao reencontrar o RUT na importação; `EnrollStudentAction:38` restaura a matrícula ao
   re-matricular. Com `*.restore` virando permissão por agregado, existem dois caminhos que
   restauram **sem permissão e sem intenção do usuário**. Pendência aberta desde o Context Packet.

**Débito com gatilho vencido, entra por construção:** `budget.confirmDeleteBody` e
`quote.confirmDeleteBody` dizem *"Esta acción no se puede deshacer."* — deixa de ser verdade no
instante em que `Budget`/`Quote` ganharem restore. Ficou registrado como gatilho no bloco anterior.

**Débito ligado, não vencido:** a **D-37** (backfill de `archived_with_parent`, publicada como `D-34` antes do merge da `main`) tem gatilho no
primeiro deploy, não neste bloco. Cada tabela nova da medição 3 amplia o alcance dela — registrar,
não resolver.

**Risco de review projetado: ALTO.** O bloco **toca schema** (colunas novas), **toca RBAC**
(permissões `*.restore` por agregado), **toca `generated.ts`** e **toca dado com peso legal**
(`Turma`, `Enrollment` e os documentos do `Redator`). A classificação final é do `/revisar-sprint`,
não desta promoção.

**Estado: `ready_for_planning`.** Próxima ação: brainstorming das decisões abertas, depois plano.

### Brainstorming e spec — 2026-08-18: sete decisões, e a medição achou um 500 alcançável

**O bloco não era o que o backlog previa, e a medição é que mostrou.** A linha 101 diz *"replicar é
ligar os hooks, a Action, o endpoint e a tela, não reescrever a semântica"*. Isso descreve `Budget`,
`User` e `Redator` — e é falso para os outros três. Os seis roots se separam em **três classes**:
replicação limpa (lista de topo + `createCrudResource`: `Budget`, `User`, `Redator`), lista de topo
fora da fábrica (`Turma`, com `useTurmas` artesanal) e **sem lista de topo** (`Quote` e `Enrollment`,
que vivem dentro do detalhe do pai).

**O achado que justifica o bloco inteiro: restaurar uma turma pode dar 500.** `turmas.active_quote_id`
é coluna gerada STORED `CASE WHEN deleted_at IS NULL THEN quote_id END` com `UNIQUE`, e
`Quote::turma()` é `hasOne` **sem `withTrashed`**, então `CreateTurmaAction:25` deixa criar turma
nova sobre a cotação de uma arquivada — por desenho, dito em texto no comentário da migration.
Restaurar a primeira estoura `SQLSTATE[23000]`. É o **primeiro conflito de unicidade alcançável** do
tema: a D4 do molde ("conflito não é alcançável") vale para `Client`, `Course` e também `Quote` —
`CreateQuoteAction:22` deriva `seq_in_budget` com `withTrashed()`, medido —, e é falsa só para
`Turma`.

**O segundo achado tem peso legal e é silencioso.** `turma_redator` não tem `deleted_at` e
`Turma::redatores()` é `belongsToMany` sem `withTrashed` (`Turma.php:82`). Arquivar um redator deixa
a linha do pivot viva e o faz **desaparecer** de três sítios — a listagem
(`TurmaQueryBuilder::LISTING:26`), o painel de emissão (`EmissionPanelQuery:94`) e
`CertificateEligibility:118`, que passa a **recusar a emissão de certificado** de turma concluída que
ele ministrou. Nada no código avisa.

**As sete decisões do João:**

1. **D1 — gate de conflito na `RestoreTurmaAction` → 422.** Aceita escrever a primeira
   `ValidationException` nova desde a **D-07** e reabri-la, porque a alternativa é 500 em operação de
   usuário sobre dado com peso legal.
2. **D2 — `Turma` ganha a cascata que nunca teve** (`enrollments` + `files`). Pivot fora.
3. **D3 — `Redator` ganha gate** (turma em andamento → 422) **e `redatores()` passa a `withTrashed`**.
   Os dois são necessários: o gate cobre turma em andamento, o `withTrashed` cobre a concluída, que é
   onde a emissão acontece.
4. **D4 — os dois restores automáticos ficam automáticos**, como exceção declarada com teste. A
   permissão guarda a ação Restaurar da tela, não todo caminho que revive uma linha.
5. **D5 — `Quote` e `Enrollment` têm Arquivados dentro do detalhe do pai**, com endpoints escopados.
   Os dois têm `DELETE` próprio hoje, então sem superfície de restauração o registro ficaria
   inalcançável para sempre.
6. **D6 — um bloco, três fases por módulo** (Commercial → Identity → Operation), um DoD no fim.
7. **D7 — o RBAC espelha o guard do arquivar: cinco permissões novas, não seis.** `User` staff **não
   ganha permissão nova** — seu `destroy` é guardado por `identity.access.manage`, que é
   `SEGREGATED`, e um `identity.user.restore` normal deixaria restaurar mais frouxo que arquivar.
   `identity.user.restore` cobre `Redator`, porque o módulo já usa `identity.user.*` para os três
   tipos de ator.

**Quatro decisões derivadas, tomadas por mim e declaradas na spec:** três colunas novas (`quotes`,
`files`, `enrollments`; `users` reaproveitada); as cascatas passam a marcar e **três Actions ganham
transação que não tinham** (`DeleteQuoteAction`, `DeleteTurmaAction`, e a `ArchiveRedatorAction` que
nasce) porque enumera-e-apaga sem transação é check-then-act; a lista de arquivados de `User` filtra
`type === 'admin'` espelhando o `abort_unless` do `destroy`, senão os usuários de cliente, redator e
aluno arquivados pelas cascatas vazam na tela de staff; e a **dívida de copy do molde é paga** —
`budget.confirmDeleteBody` e `quote.confirmDeleteBody` param de dizer "no se puede deshacer", cujo
gatilho era exatamente este bloco.

**A auto-revisão da spec achou três defeitos e os corrigiu inline.** Um glob (`useBudgetQuotes*`) no
lugar de path exato; a sigla `D10` colidindo entre esta spec e o molde; e uma **lacuna real** — o
binding do restore aninhado. `->scopeBindings()` resolve `{enrollment}` por `$turma->enrollments()`,
que é escopada por `deleted_at IS NULL`, então matrícula arquivada daria **404 antes de chegar à
Action**. A spec passou a exigir `onlyTrashed()` explícito no binding.

**O frontend não migra nada, e isso foi medido:** `useArchivedPage` aceita `ArchivableResource`
**estrutural** (`useArchivedList` + `useRestore`), não a fábrica. `Turma` satisfaz o contrato à mão
no `useTurmas.ts` artesanal, e os aninhados fecham o id do pai no próprio hook.

**Risco reavaliado: segue ALTO.** Schema (3 colunas), RBAC (5 permissões), `generated.ts` e dado com
peso legal — agora com um item a mais que a promoção não previa: o bloco **toca o caminho de emissão
de certificado**.

**Estado: `planning`.** Próxima ação: escrever o plano.

### Plano — 2026-08-18: 15 tasks, executor Claude, e a escrita achou oito coisas que a spec não podia saber

**`docs/superpowers/plans/2026-08-18-arquivados-roots-restantes.md`**, 15 tasks em três fases
(Commercial 1–6, Identity 7–10, Operation 11–14, fechamento 15). Cada task tem paths exatos, o código
inteiro de cada passo, o comando de verificação com a saída esperada e o commit — nada de "similar à
Task N".

**Escrever o plano contra o código exigiu oito decisões derivadas (P1–P8), todas declaradas no
próprio plano.** As três que mudam trabalho:

- **P7 — três telas expõem a rota de arquivar sem ter botão nenhum.** `DELETE /api/redatores/{redator}`,
  `DELETE /api/users/{user}` e `DELETE /api/turmas/{turma}` existem no backend, mas `RedatoresTable`,
  `Admin/UsersTable` e `TurmasTable` **não têm** ação de arquivar, e `api/useTurmas.ts` não tem
  mutação de DELETE. Uma visão de Arquivados sozinha nasceria impossível de exercitar pela interface —
  o DoD da lei §8 não teria como ser cumprido. As Tasks 10 e 14 trazem **as duas metades**, no molde
  exato do `ClientRowActions`. **É escopo que a spec não pediu**; se o João preferir o escopo estrito,
  as duas tasks perdem o botão de arquivar e aquelas fases passam a ser provadas por `curl`.
- **P4 — nascem dois QueryBuilders.** `Budget` monta `with([...])` solto no controller e
  `Identity/QueryBuilders/` está **vazio**. A lição Q-8 (a lista de Arquivados mostra o registro como
  ele estava no instante do arquivamento) exige `asOfArchiving`, que é método de trait e mora em
  builder. `BudgetQueryBuilder` e `RedatorQueryBuilder` nascem; `QuoteQueryBuilder` e
  `TurmaQueryBuilder` ganham `withArchivedListingData()`; `EnrollmentQueryBuilder` não ganha nada
  (matrícula é folha).
- **P6 — a turma arquivada mostraria `0 alumnos`.** `TurmaData::fromModel` lê
  `enrolled_count: $turma->enrollments_count` **sem fallback**, e `withCount('enrollments')` conta só
  as ativas — depois da cascata D2, toda turma arquivada apareceria vazia. O `withArchivedListingData`
  reescreve a contagem com o mesmo predicado do trait. É o Q-8 aplicado a um `withCount`.

As outras cinco: **P1** (o path `useBudgetQuotes.ts` da spec §4 não existe — o arquivo é
`useQuotes.ts`), **P2** (as duas mensagens novas saem em **es-CL**, por precedente de
`Turma::assertAcademicallyWritable()`, e são duas linhas se o João decidir a D-07 no outro sentido),
**P3** (`RestoreEnrollmentAction` aplica a RN-15, simétrica com `RemoveEnrollmentAction:12`), **P5**
(`Redator::turmas()` nasce, inversa de `Turma::redatores()`, para o gate D3) e **P8** (`lockRow` entra
em `Redator` e `Turma`, onde a cascata nasce inteira neste bloco, e **não** entra em `Budget`/`Quote`,
onde o caminho de arquivar já existia com transação e sem lock — acrescentar mutex só no restore
criaria assimetria pior que a que resolve).

**Nenhuma chave de locale nova.** O bloco `archive.*` dos três arquivos cobre confirmar, toasts,
colunas e ações. A única mudança de copy é a **D11**: os dois `confirmDeleteBody` de `budget` e
`quote`, que diziam *"Esta acción no se puede deshacer."* e deixam de ser verdade na Task 3.

**`generated.ts` tem commit próprio, no fim.** As Tasks 5, 10 e 14 rodam `typescript:transform` para o
`tsc` enxergar os DTOs novos, mas não o commitam: três commits deixariam o arquivo em três estados
intermediários e o manifesto do transformer fora de sincronia em dois deles. Task 15, um commit, seis
tipos.

**Handoff: `executor: claude`, risco projetado ALTO.** O bloco toca quatro leis do §5 (tipos gerados,
RBAC, fronteira de features, DoD provado) e tem três pontos que exigem julgamento fora do plano: a
Task 7 muda `Turma::redatores()`, lida por Operation e Certification, e manda **ler a asserção** de
qualquer teste que vire vermelho; a P7 é escopo declarado que o João pode cortar; e a P2 reabre a
D-07.

**Estado: `ready_for_execution`.** Próxima ação: `/executar-bloco arquivados-roots-restantes`, por
instrução posterior do João. Ordem obrigatória: a Task 1 (colunas + permissões) precede tudo, e dentro
de cada fase o backend precede o frontend.

### Execução — 2026-08-19

Técnica `subagent-driven-development` a partir da Task 2 — a restrição de AgentTool caiu no meio do
bloco e o João pediu a troca; a Task 1 saiu inline, sob `executing-plans`. Main tree pela P-03.
Ledger task a task em `.superpowers/sdd/progress.md`, com implementador e revisor próprios por task.

**A Task 1 achou um gap do plano, e ele é de guardrail.** `PermissionI18nParityTest` exige paridade
exata entre `PermissionCatalog::descriptions()` e as chaves `perm.*` das três locales — permissão
nova sem tradução reprova a suíte. O plano registrou "nenhuma chave de locale nova" pensando no bloco
`archive.*`; `perm.*` é outro namespace e as cinco permissões novas o obrigam. As cinco chaves
entraram no mesmo commit da Task 1, ao lado de cada `*_delete` correspondente. Sem isso a Task 15
descobriria o vermelho no fim, com cinco fases de distância da causa.


### DoD end-to-end — 2026-08-19 (Task 15): as três fases encadeadas, provadas no navegador

Chromium contra a API real e a MySQL de desenvolvimento. O frontend do main tree subiu na **5174** —
a 5173 é o `pnpm dev` do worktree `fix-frontend` do João, e provar a tela nela teria provado o
código de outro branch. O `.env` já previa a porta.

**Fase 1 — Comercial.** O primeiro alvo (`Scap 1`) recusou com **422** e uma frase em PORTUGUÊS:
*"Orçamento com cotação aprovada não pode ser excluído. Recuse-a antes."* É gate pré-existente e
correto (`DeleteBudgetAction:21`), mas a frase está hard-coded na Action e fora do idioma da tela —
achado registrado abaixo. Refeito em `Scap 8`, com cotação e anexo criados pelo próprio app:
arquivar levou cotação e anexo com `archived_with_parent = true`; Arquivados mostrou **`Quotes = 1`**
com a cotação já soft-deletada (a contagem as-of-archiving); restaurar devolveu os três totais
(**42 / 0 / 0 UF**), a cotação e o `anexo-dod.pdf`, com a marca limpa.

**Fase 2 — Identity, e o caso com peso legal (D3).** Nenhum redator do banco tinha só turma
concluída, então Ana Reyes saiu da turma 6 (em andamento, que ficou com Juan Morales) — ação do
próprio app, desfeita no fim. Com só a turma 3 (concluída), arquivá-la passou o gate; a cascata
levou `user#4` e o REUF. **Em `/certificados`, o diálogo de emissão listou `Redator: Ana Reyes` —
arquivada — e a emissão respondeu `201`**, gerando `LOT-2026-1005` (`redator_id = 3`, status
`emitido`, com UUID de validação). É o `Turma::redatores()->withTrashed()` da Task 7 provado onde
importa: sem ele o certificado não sairia. Restaurar devolveu redator, usuário e REUF com a marca
limpa, e Ana voltou à turma 6.

**Fase 3 — Operação.** Turma 2 (`Scap 4 - Cot 1`, 8 alunos, 3 documentos) arquivada pelo botão da
linha (P7): cascata de 8 matrículas e 3 documentos, todas com marca. Arquivados mostrou
**`Students = 8`** com as oito já soft-deletadas. Restore devolveu **200 — não 201** — e trouxe as
onze peças com marca zerada; o detalhe mostrou os 8 alunos e o switch local da D5. Arquivar e
restaurar UMA matrícula fechou o ciclo: a lista de arquivadas veio escopada pela turma, com data e
autor, e o restore (`POST /api/turmas/2/alunos/13/restore` → **200**) invalidou as duas listas.

**D10 na tela.** Com `user#5` (`type = redator`) arquivado, `/administracion` → Arquivados mostrou
**"No archived records"**. Usuário de redator não vaza para a lista de staff.

**O gate D1 na MySQL real.** A suíte roda em sqlite, então a premissa de banco foi conferida no
motor de verdade: `turmas.active_quote_id` existe como coluna gerada
`(case when (deleted_at is null) then quote_id end)` com o índice `turmas_active_quote_id_unique`
(`Non_unique = 0`). É o que torna o gate da `RestoreTurmaAction` um 422 em vez de um 500.

**O que ficou no banco de desenvolvimento.** Uma cotação (`Scap 8 - Cot 1`, 42 UF, pendente) e um
anexo em `Scap 8`, e o certificado `LOT-2026-1005` — artefatos que o próprio roteiro do DoD manda
criar. O anexo de teste que subiu em `Scap 1` foi removido. Todo o resto voltou ao estado anterior:
Ana Reyes na turma 6, Carlos Fuentes ativo, turma 2 e suas onze peças vivas.

### Achados fora do escopo do bloco, para a triagem do review

- **`DeleteBudgetAction:21` responde em português numa interface es-CL**, com a frase hard-coded na
  Action em vez de locale. Pré-existente; é a mesma D-07 que a spec deste bloco reabriu para as duas
  frases novas (que saíram em es-CL).
- **Requisição não autenticada sem `Accept: application/json` responde 500** (`Route [login] not
  defined`) em vez de 401. No `laravel.log` desde 2026-08-16, não é regressão deste branch.
- **Aviso do React `Each child in a list should have a unique "key" prop` no `TableBody`** do painel
  de emissão de certificados. Fora dos arquivos deste bloco.

### Encerramento da execução — 2026-08-19

Quinze tasks provadas, em **28 commits** sobre `6fd0ad8`. Backend **795 passed / 5 skipped**;
frontend `lint`, `build` e **391 testes** limpos. `backend/config/cors.php` não foi tocado por
nenhum commit do bloco — o único commit que o altera é `6fd0ad8`, do João, que é a base.

Os tipos gerados entraram num commit só, no fim (`fdc043e`): 30 inserções, zero remoções, com o
manifesto junto.

Dois desvios do plano, ambos registrados no ledger com a evidência:

1. **O Step 6 da Task 14, ao pé da letra, reprova o `pnpm lint`.** As colunas do rastreio mais a de
   ações levaram `TurmasTable.tsx` a 185 linhas contra a régua de 150 (catraca do D8 do B2). O
   implementador parou em vez de partir o arquivo sozinho; parti eu, em `c2e6c37` — cinco corpos de
   célula para `TurmaCells.tsx`, tabela em 143 linhas, comportamento intacto.
2. **O plano afirmou duas vezes que o `lockRow` fecha a janela contra quem escreve filho, e o código
   não faz isso** — no redator (Task 7) e na turma (Task 11). Os comentários dizem o que o código
   faz, e a P-47 passou a cobrir os dois roots. **O plano não é fonte sobre o comportamento do
   código.**


### Review — 2026-08-19: risco ALTO, duas lentes, seis achados e zero violação de lei

**Classificação ALTO e a segunda lente foi acionada.** Schema (3 colunas), RBAC (5 permissões),
`generated.ts` e o caminho de emissão de certificado — quatro dos gatilhos da skill num bloco só.
Codex rodou read-only sobre `6fd0ad8..HEAD` contra plano, spec e leis §5; os seis achados dele foram
verificados por mim no código antes de qualquer um entrar no relatório.

**Órfãos: zero**, nos dois lados. **Leis §5: nenhuma violação** — sem Repository, sem regra em
controller, cascata instância a instância, `generated.ts` regenerado com manifesto no mesmo commit,
`ValidationException` nas duas frases novas, zero `primereact` direto e zero import cruzado em
`features/`, financeiro não gateia nada. Suítes conferidas na hora: backend **795 passed / 5
skipped**, frontend **391 testes**.

**Seis achados, nenhum 🔴:**

1. **Q-1 🟡 P — `RestoreQuoteAction:34-47` restaura cotação sem exigir orçamento ativo.** A rota é
   plana e a Action não olha o pai, então cotação de orçamento arquivado volta sozinha: some da tela
   (o binding do pai dá 404) mas segue aprovável por API, e cotação aprovada origina turma. É o
   raciocínio da própria **D10** — aplicado a `User` e não a `Quote`.
2. **Q-2 🟡 P — `QuotesList.tsx:44-59`.** `nameLost` e o `InlineLoadState` com Reintentar existem só
   no ramo ativo; o ramo `archived` volta a pintar `—` em silêncio quando o GET de cursos falha,
   justamente na tela que existe para reconhecer a cotação antes de restaurar. É o defeito do BD-6
   reentrando pela porta nova.
3. **Q-3 🟡 M — o kit de arquivados está copiado por root em três camadas:** 6 `*RowActions.tsx` (397
   linhas), 6 hooks `use*Archived`, e o par `toArchive` + `ConfirmDialog` em cinco Pages.
   **Reincidente (2ª sprint)** — proposta de regra para `.claude/rules/frontend-fsliced.md`
   apresentada ao João junto do relatório.
4. **Q-4 🟢 P — o teste 9 da spec §5 não foi escrito, e o código faz o contrário do que ele
   prometia:** `useQuotes.ts:21` invalida `budgetsApi.keys.all`, não a chave do pai.
5. **Q-5 🟢 P — `RestoreTurmaAction:40-55` é check-then-act:** trava a turma que volta e pergunta
   sobre a cotação, que ninguém trava. Mesma classe da **P-47**, ator diferente (criador de irmã, não
   escritor de filho) — a ficha atual não alcança.
6. **Q-6 🟢 — o gate D3 não vale na volta.** Arquivar turma, arquivar redator, restaurar turma
   devolve turma em andamento com redator arquivado. Fecha com gate no restore ou com declaração na
   spec, como a exceção da D4.

**Três achados do Codex foram descartados, com razão registrada:** a audit `restored` duplicada sob
concorrência é simetria deliberada e comentada (decisão consciente não é achado); o `—` do cliente em
`ArchivedBudgetData` é pré-existente e aparece igual na visão ativa, com o erro já escalando; e o
redator no restore de turma entrou rebaixado a 🟢 porque a emissão segue íntegra pelas três peças da
D3. **Zero divergência de julgamento entre as duas lentes.**

**Estado: `blocked`, `resume_state: reviewing`.** Próxima ação: o João aprova o que entra. Somente
achado aprovado vira código.


### Correções do review — 2026-08-19: os seis achados aprovados, em seis commits

O João aprovou **Q-1 a Q-6**. Nenhum foi deferido para o backlog.

**Q-1 — o restore da cotação passou a exigir orçamento ativo.** `RestoreQuoteAction` lê
`$quote->budget->trashed()` e recusa com **422** em es-CL. O teste que provava a limpeza da marca
virou dois: o 422 do gate e o caminho que ele obriga a usar (restaurar o pai devolve a cotação com
`archived_with_parent` em `false`) — sob o gate, cotação marcada implica orçamento arquivado, então
o antigo cenário deixou de ser alcançável.

**Q-5 e Q-6 saíram no mesmo commit, porque tocam a mesma Action.** `Quote::lockRow()` nasceu e os
DOIS caminhos que decidem sobre a cotação a travam: `CreateTurmaAction` — que também moveu as duas
checagens para dentro da transação — e `RestoreTurmaAction`. É o **primeiro eixo com tomador dos dois
lados** desde que a P-47 foi aberta. O segundo gate da turma recusa restaurar turma **em andamento**
com redator arquivado; turma concluída fica de fora, porque é nela que o certificado é emitido e a
emissão já lê redator arquivado pelo `withTrashed` da D3.

**Q-2 — o aviso de nome perdido passou a valer nos dois modos** do `QuotesList`, com o cálculo sobre
a lista VISÍVEL e o `InlineLoadState` extraído para um nó reaproveitado — para não haver um terceiro
sítio onde esquecer.

**Q-4 — o critério 9 da spec §5 existe e o código passou a cumpri-lo.** `useRestoreQuote` recebe o
`budgetId` e invalida o detalhe do pai (que alcança a lista de arquivadas por prefixo) mais a lista
de orçamentos, cujos totais mudam. As outras mutações seguem em `keys.all`: nascem dentro do detalhe
do pai, onde não há outro orçamento montado. O teste vive em `quoteKeys.invalidatedByRestore` e
reprova contra o código antigo.

**Q-3 — o kit de arquivados virou um só, e a regra foi escrita.** Nascem `useArchiveToasts` (interno,
fora do barrel), `useArchiveAction`, `ArchiveRowActions` e `ArchiveConfirmDialog`; `useArchivedPage`
absorveu os toasts do restore e continua propagando os callbacks de quem chama. Os oito hooks de
página caíram de **370 para 162 linhas**, os seis `*RowActions` viraram adaptadores que só chamam
`can()` e passam **booleanos** — `shared/ui` não importa `shared/hooks` —, e os cinco blocos de
`ConfirmDialog` viraram cinco chamadas de cinco linhas. Saldo do commit: **603 linhas a menos, 403 a
mais**. O padrão reincidente virou o item **"Kit de arquivados"** em `.claude/rules/frontend-fsliced.md`.

**Verificação depois das correções:** backend **797 passed / 5 skipped** (era 795: +3 testes novos,
−1 que deixou de ser alcançável); frontend **394 testes em 67 arquivos**, `lint` e `build` limpos.
Zero `primereact` direto e zero import cruzado em `features/`. Nenhuma peça nova órfã. `generated.ts`
não foi tocado — nenhum DTO mudou.

**O que NÃO foi feito, e é do fechamento:** a prova no navegador dos dois 422 novos (cotação sob
orçamento arquivado; turma com redator arquivado) e das três telas que o Q-2/Q-3 tocaram. As suítes
provam os endpoints e o `pnpm build` prova os tipos; o DoD da lei §8 pede a tela, e esta sessão não
teve navegador. **Entra no `/fechar-sprint` como item obrigatório, não como opcional.**



### Fechamento — 2026-08-19: os dois 422 novos provados no navegador, e a `main` andou por baixo

**O item obrigatório que o review deixou para cá foi cumprido, no Chromium contra a API real e a
MySQL de desenvolvimento.** O frontend do main tree subiu na **5174** de novo — a 5173 é o `pnpm dev`
do worktree do João —, sessão de admin, interface em **es-CL**.

**O 422 do Q-6 é alcançável pela interface, e o roteiro é o da própria ficha.** Turma 2
(`Scap 4 - Cot 1`, em andamento, 8 alunos, redator Pedro Soto) arquivada pelo botão da linha — a
cascata marcou as **8 matrículas** (`archived_with_parent = 1`, medido no banco). Com a turma dele
arquivada, `/personas` deixou arquivar **Pedro Soto** (o gate da D3 só enxerga turma viva, por
desenho). Em `/operacion` → Arquivados, a linha veio como estava no instante do arquivamento —
**8 alunos** (P6) e o redator **arquivado ainda visível** (`withTrashed` da D3) — e **Restaurar
devolveu `POST /api/turmas/2/restore` → 422** com a frase da Action em es-CL: *"Un redactor de esta
clase está archivado: restáuralo antes de restaurar la clase."* Restaurado o redator (200), a mesma
turma voltou (200) com as 8 matrículas e a marca zerada.

**O 422 do Q-1 NÃO é alcançável pela interface, e isso é a razão de o gate existir — foi provado nos
dois passos.** Arquivado o orçamento `Scap 8`, a cascata marcou a cotação (`archived_with_parent =
1`); abrir `/comercial/presupuestos/8` devolveu **`GET /api/budgets/8` → 404** (*"No query results
for model … Budget 8"*), porque o binding do pai é padrão — a lista de arquivadas da cotação vive
dentro do detalhe e some junto. A rota que sobra é a **plana**, e ela foi exercida do contexto da
própria página (mesma sessão, mesmo `Origin`, mesmo CSRF): `POST /api/quotes/11/restore` → **422**,
envelope RFC 7807 com
*"El presupuesto de esta cotización está archivado: restáuralo primero."* Restaurar o orçamento pela
tela (200) devolveu a cotação com a marca limpa.

**Q-2 e Q-4 também foram provados na tela, e não por leitura.** Com `http://localhost:8080/api/courses*`
roteado para 500, a aba **Arquivados** do detalhe passou a mostrar *"No se pudo procesar la respuesta
del servidor."* + **Reintentar** ao lado da cotação com `—` no lugar do nome — o ramo que antes
pintava o traço em silêncio. Removida a rota, **Reintentar** trouxe *"Trabajos en líneas energizadas
220kV"* de volta. E o restore da cotação atualizou o **detalhe do pai sem reload**: `0 UF / 0
cotizaciones` viraram `42 UF / 1` no mesmo instante — a invalidação da chave do pai que o critério 9
da spec pedia.

**Q-3 exercitado nas telas, não só nos testes:** os diálogos de arquivar de turma, redator, cotação e
orçamento saíram todos do `ArchiveConfirmDialog` único, com o toast *"Registro archivado."* do
`useArchiveAction`; as listas de Arquivados de `/operacion`, `/personas`, `/administracion`,
`/cursos` e `/comercial` renderizaram pelo `useArchivedPage`. **Zero erro de console** em toda a
sessão. A **D11** apareceu onde devia: o diálogo da cotação diz *"Podrás restaurarla desde
Archivados."*, e o do orçamento avisa que *"Sus cotizaciones se archivarán junto con él."*

**Zero resíduo.** Tudo que o roteiro arquivou foi restaurado: turma 2 e suas 8 matrículas, Pedro
Soto (`redatores.id = 2`), o orçamento 8 e a cotação 11 com `archived_with_parent = 0`. O banco de
dev terminou o gate como começou.

**Resto do gate.** Backend **797 passed / 5 skipped** (2942 asserções); frontend `pnpm lint` exit 0,
`pnpm build` verde e **67 arquivos / 394 testes**; `pint --test` **`passed`** nos **54 arquivos PHP**
do bloco (nunca sem argumento); `typescript:transform` rodado de novo **sem drift** — `git diff` em
`shared/types/` vazio, então o `generated.ts` do commit `fdc043e` está em sincronia e não foi editado
à mão. Código morto: varredura nos **41 arquivos criados pelo bloco** (fora testes) não achou nenhum
sem consumidor; os `.gitkeep` de `features/*/stores|api|hooks` seguem alheios e não foram tocados.
Leis do §5: zero `primereact` em `features/`, zero import cruzado entre features, zero
`abort(4xx)` novo (o único do repositório é o `abort(404)` público pré-existente), nenhum Repository,
nenhum trigger de banco.

**Pendências.** A **P-45** cumpriu a sprint de rastro e saiu de `encerradas.md`. A **P-47** já tinha
sido reescrita pelas correções do review e cobre os dois eixos. Três fichas mexidas por medição
deste gate: a **P-35** (o gatilho venceu **pela metade** — o bloco tocou `Quote`, `DeleteQuoteAction`
e `RestoreQuoteAction`, mas **não** `CreateQuoteAction`, então a simetria do `$fillable` não foi
absorvida), a **P-44** (as telas de Arquivados deram um **segundo palco** às sondas: `E2E Gate
Redator 1/2` em `/personas`, `GATE T7` em `/cursos`, dois clientes de sonda em `/comercial` — nada
disso é deste bloco e nada foi apagado) e a **P-48**, que nasce aqui: o `title` do envelope RFC 7807
é português nos seis ramos enquanto os `detail` novos são es-CL. **Não é bug vivo** — `problemMessage`
não lê `title` — e traduzir é a decisão de idioma que a D-07 espera.

### A divergência que o fechamento encontrou e NÃO resolve: a `main` fechou outro bloco em paralelo

`origin/main` está **56 commits à frente** da base deste branch (`6fd0ad8`) e contém o
`feat/identity-ativacao-acesso-redator` inteiro, fechado pelo João em **2026-08-19 16:05**
(`967cc618`, merge `f2d74da7`). O `state.md` da `main` diz `workflow_state: idle` com
`last_completed_work_item: identity-ativacao-acesso-redator`; o deste branch dizia
`ready_for_closure` para `arquivados-roots-restantes`. **Dois `active_work_item` viveram ao mesmo
tempo, em linhas diferentes** — o invariante de um só valeu dentro de cada branch, não entre elas.

**O fechamento não escolheu por heurística e não importou nada da `main`:** o estado deste branch,
o plano, a spec, os 36 commits e o `progress.md` concordam entre si sobre a etapa do bloco, então o
gate rodou sobre o que existe aqui. O que fica para a decisão do João, no merge:

1. **`backlog.md` conflita nos dois sentidos.** A `main` ainda traz o item 1 na redação **anterior**
   aos dois blocos de arquivamento ("tornar o lifecycle de archive/restore explícito") — ela nunca
   recebeu nem o `arquivados-e-restauracao` nem este —, e já removeu o item de **ativação de acesso
   do redator**, que neste branch continua listado (renumerado para 3 por este fechamento, porque a
   regra manda remover **somente** o item concluído).
2. **`pendencias/` conflita.** Na `main` a **P-45** segue **aberta**; aqui ela foi encerrada dentro do
   `arquivados-e-restauracao` e o rastro saiu agora. A **P-48** não colide: o maior ID da `main`
   também é o P-47.
3. **`progress.md` tem dez linhas dos dois lados, com conjuntos diferentes** — a `main` tem a linha
   do bloco de identidade e não tem as dos dois blocos de arquivamento.
4. **`state.md` vai conflitar inteiro**, e a janela de cinco fechamentos difere.

Nada disso é regressão deste bloco: nasce de a `feat/arquivados-e-restauracao` seguir sem merge por
decisão do João, com este branch nascendo dela. **Reconciliar é decisão dele, não do fechamento.**

### Merge da `main` — 2026-08-19: a divergência acima foi resolvida por instrução do João

O João mandou trazer a `main` para este branch antes do PR. `git merge origin/main` (base
`b758068b`) trouxe os 56 commits do `identity-ativacao-acesso-redator` e abriu **10 conflitos** —
6 de doc, 3 de componente e 1 de manifesto. Suítes depois do merge: **828 passed / 5 skipped**
(3006 asserções) no backend, **77 arquivos / 435 testes**, `lint` 0 e `build` verde no frontend.

**Código — três conflitos, três composições, nenhum "escolhe um lado":**

1. **`QuotesList.tsx`** — a `main` tinha o `InlineLoadState` inline com `t(courses.errorHint)`; este
   branch tinha o mesmo nó **extraído** em `avisoDeNome`, porque o Q-2 o reusa nos dois modos. Ficou a
   extração daqui **com o `errorHint` de lá**: o `useLoadState` da `main` escolhe a dica por status
   (403/404/genérico), e o nosso literal `'common.loadErrorHint'` era mais burro.
2. **`RedatoresTable.tsx`** — a `main` pôs o botão de **reenviar convite** na célula de ações; este
   branch trocou a célula inteira pelo `RedatorRowActions` do kit. A célula agora tem os dois, e o
   convite **só aparece na lista ativa**: o `User` do redator desce com a cascata, então reenviar
   acesso a um redator arquivado não é ação que exista. Coluna de `8rem` para `10rem`.
3. **`PeoplePage.tsx`** — a `main` desceu o dado para `RedatoresTab`/`StudentsTab` (D-04: com o hook
   acima das abas, o `renderActiveOnly` não alcançava e a tela buscava as duas listas). Ficou a
   estrutura de lá, e **a fiação de arquivados deste branch desceu junto** para a `RedatoresTab` —
   `useRedatoresArchived`, o `toArchive`, as props de modo e o `ArchiveConfirmDialog`. A casca voltou
   a não ter hook de dado nenhum.

**`generated.ts` e o manifesto foram regenerados, não resolvidos à mão** — `typescript:transform`
sobre o backend já mesclado, que é a única fonte válida (lei §5.3). O `RedatorData` da `main` ganhou
`is_active`, e o fixture do `RedatorRowActions.test.tsx` passou a trazê-lo: o `tsc -b` reprovou
primeiro, o teste foi corrigido depois.

**Três colisões de ID, resolvidas pelo precedente da P-35 (quem renumera é quem ainda não publicou
na `main`):**

- **`D-34` → `D-37`** — a `main` publicou um `D-34` (gate RBAC do Dashboard atravessando o seam como
  `null`) e um `D-35`; o backfill de `archived_with_parent` deste branch ficou com o próximo livre, e
  as três citações em `state.md`/`progress.md` acompanharam.
- **`P-47` → `P-49`** — a `main` publicou uma `P-47` (os 7 redatores do seed sem a role `redator`); a
  ficha do `lockRow` meio mutex é a renumerada.
- **`P-48` foi retirada** — era duplicata da **D-36** da `main`, que já registrava o envelope RFC 7807
  não localizado desde o BD-13. A medição do nosso fechamento (o 422 com `title` em PT e `detail` em
  es-CL no MESMO envelope) foi **enxertada na D-36**, que é a ficha dona do assunto.

**Doc — o que ficou de cada lado:**

- **`backlog.md`:** o item de arquivamento sumiu (entregue nos dois blocos desta linha) e o de
  **ativação de acesso do redator** também (entregue na `main`) — sobraram Roles/permissões e
  Hardening. O texto do B2 passou a ser o da `main`: o bloqueio do valor da view do Redator **caiu**.
- **`pendencias/`:** a **P-45** continua **encerrada**, e agora com prova de código em vez de
  histórico — depois do merge o `explode` existe nos dois sítios que leem `FRONTEND_URL`
  (`tests/TestCase.php:25` e `config/cors.php:22`). As duas fichas da `P-44` (sondas nas telas de
  Arquivados, daqui; rastro do gate do identity, de lá) ficaram as duas.
- **`progress.md`:** as quatro entregas novas entraram em ordem de data e as duas mais antigas
  desceram para o `progress-archive.md`, que também perdeu **3 linhas duplicadas** — os dois lados
  tinham arquivado as mesmas entregas por conta própria.
- **`state.md`:** a janela voltou a cinco fechamentos, intercalando os dois lados
  (`arquivados-roots-restantes` → `identity-ativacao-acesso-redator` → `arquivados-e-restauracao` →
  `bd13-listagens-e-abas` → `bd16-perfil-e-kit-compartilhado`). Saíram da janela, para o git e para o
  `progress-archive.md`: `dashboard-frontend-analitico-e-redator`, o trabalho fora de bloco de
  2026-08-17 e `meu-perfil-frontend`.

**O merge achou uma coisa que nenhum dos dois lados tinha:** juntas, as duas suítes passam de
**828 testes** e estouram o `memory_limit` de **128M** do container — o `docker compose exec -T app
php artisan test` do `CLAUDE.md` §6 morre com `Allowed memory size … exhausted` no
`ManualTurmaTest`. Não é defeito de teste (o `--filter` passa em 2,35s) nem do merge: o pico é
**129 MB**, um megabyte além do default. Pelo binário direto com `-d memory_limit=1G` a suíte fecha
verde. Virou a **P-50**, travada em decisão do João, porque `docker/php/uploads.ini` cai em `conf.d`
e vale para o PHP-FPM de produção também.

**Estado: `idle`.** O backlog não promove nada sozinho: o próximo item é escolha explícita do João.
