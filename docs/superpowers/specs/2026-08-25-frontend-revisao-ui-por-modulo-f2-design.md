# Design — Revisão de UI por módulo (item 16, fatia 2)

**Data:** 2026-08-25 · **Work item:** `frontend-revisao-ui-por-modulo-f2` · **Lane:** `lane-c`
**Árvore:** worktree `../fix-frontend` · **Branch:** `refactor/frontend-revisao-ui-f2`
(a partir de `origin/main@7fa1cb0a`)
**Fonte:** `backlog.md` item 16 (o que sobrou da fatia 1); fichas `D-38`, `D-57`;
`audits/2026-08-23-lotus-ui-review-operacion.md` §"Revisão da Task 9" e
§"Pendências abertas ao fechar a Task 9".
**Context packet:** `null` — o item é `Contexto: não por padrão` e a fatia 1 nasceu de medição
local; não há fonte externa a recuperar.

## Problema

A revisão de UI pelo navegador cobriu quatro superfícies: Dashboard e `/perfil` antes do item 16, e
Dashboard `ready-redator` + Operação na fatia 1. **Cinco continuam sem passar pela rubrica** —
Comercial, Certificados, Cursos, Pessoas e Administração. Cada passada anterior achou defeito de
wrapper que nenhuma leitura de código tinha achado (6 dos 8 achados de 2026-08-22 moravam em
`shared/ui`), então o valor está em olhar a tela, não o diff.

A fatia 1 também deixou dívida nomeada: a run de Comercial não foi executada (corte explícito do
João em 2026-08-23), três Minors do review da Task 9 ficaram abertos, a ficha da recusa em espanhol
de `Turma.php:200` nunca foi escrita, e as fichas `D-38`/`D-57` seguem no backlog.

## Escopo desta fatia

Duas superfícies, **em série** — run, correção dos `C`, próxima run:

| # | Superfície | Rota / papel | Jornada |
|---|---|---|---|
| 1 | Comercial | `/comercial` → `/comercial/presupuestos/:id`, papel **admin** | abas do módulo, lista, busca/filtro, abrir orçamento, cotações |
| 2 | Certificados | `/certificados`, papel **admin** | abas do módulo, lista, busca/filtro, emissão e validação em leitura |

Serial, e não duas runs seguidas, pela razão que a fatia 1 mediu: corrigir o achado de wrapper antes
da run seguinte impede que o mesmo defeito ocupe dois relatórios.

Índice e detalhe formam **uma jornada só** — é como o operador navega, e o detalhe é onde a
densidade mora. Certificados não tem rota de detalhe própria; a jornada fecha no índice mais os
diálogos que ele abre.

Mais as dívidas nomeadas da §"Dívidas" e a herança da §"Herança da fatia 1".

## Fora desta fatia

- **Cursos (`/cursos`), Pessoas (`/personas`), Administração (`/administracion`)** e o wizard
  `/operacion/turmas/nueva/:quoteId` — fatia 3 do mesmo item, com a mesma mecânica.
- Acessibilidade, foco e overflow: item 8 (`frontend-hardening-final`), que paga as fichas `D-*`.
- Redesenho de tela: Administração é o item 9.
- O `scrollable` dos `ModuleTabs` de Pessoas e Administração — sem tela medida nesta fatia.

## Decisões

### D1 — papel único: admin

Comercial e Certificados são módulos de admin; o redator não alcança `/comercial`. Rodar as duas
runs só como admin evita repetir o provisionamento de acesso da fatia 1 (Task 3), cujo resíduo — a
role `redator` concedida ao usuário 1 — **segue no banco de dev** e não foi devolvido (a Task 13
Step 1 morreu de obsolescência: os 7 redatores do seed carregam a role pela migration de backfill
que chegou da `main` em `fa1abdf1`, e executá-la desfaria o backfill).

### D2 — D-57 vira enum de verdade na cadeia, não docblock

A ficha pede que `RedatorTurmaPendenciaData.missing_types`, `TurmaComplianceData.missing_types` e
`TurmaData.missing_document_types` deixem de ser `string[]`. Trocar só o `@var` faria o
`generated.ts` afirmar algo que o PHP não garante — o valor em runtime continuaria string. A
correção sobe a cadeia inteira:

- `TurmaHabilitacaoService::for()` filtra `TurmaDocumentType::cases()` em vez de `::values()`;
- `HabilitacaoStatus` recebe e devolve `array<TurmaDocumentType>`;
- os consumidores que hoje leem string passam a projetar `->value` onde precisam de texto:
  `ConcludeTurmaAction` (mensagem de recusa), `OperationMetricsQuery` (o `implode` da frase de
  pendência), `RedatorScopeQuery`, `TurmaData`;
- os três DTOs tipam o enum, `typescript:transform` regenera, e
  `turmaDocumentTypeLabel(type: TurmaDocumentType)` deixa de aceitar `string`. **O fallback
  `key ? t(key) : type` morre**: ele existia só porque o `tsc` não alcançava o call site.

**Extensão medida, decidida junto:** `TurmaComplianceData.present_types` é o mesmo defeito no mesmo
DTO (`OperationMetricsQuery` projeta `TurmaDocumentType::values()` filtrado). Entra na mesma
correção — deixar um campo tipado com o enum ao lado do irmão em `string[]` seria a divergência com
outro nome.

**Consequência de árvore:** o bloco deixa de ser frontend puro. O gate P-03 **não é disparado** — a
ficha foi paga pelo `compose-por-worktree` em 2026-08-24, e esta árvore sobe stack própria.

### D3 — D-38 mantém o adiamento da fatia 1; a fatia 2 escreve a ficha

A pendência chega pronta do backend como
`Documentación obligatoria incompleta: MANUAL, PRUEBAS, EVALUACION_REDATOR.`
(`OperationMetricsQuery.php:137`) e `PendingList.tsx:30` a imprime crua. A fatia 1 já decidiu (D1 da
spec dela): **o backend manda as partes, o cliente compõe**, e a execução pertence ao item 7
(`hardening-i18n-e-erros-api`), que instala o `Accept-Language` junto de `D-18` e `D-36`.

Essa decisão **nunca foi escrita na ficha** — a Task 12 que a escreveria foi cortada. A fatia 2
grava a decisão e o ponteiro para o item 7. **Nenhuma linha de código muda por causa da D-38.**

### D4 — os Minors 2 e 3 se corrigem no `AppDataTable`, não na tabela onde apareceram

Os dois nasceram na `TurmasTable` da fatia 1 — a coluna de ações presa cobre o realce de hover da
linha e esconde a sombra de rolagem da direita. **Deixaram de ser defeito de uma tabela:** o item
17 espalhou a coluna presa para 12 tabelas em 2026-08-24. A correção mora no wrapper e alcança
todas de uma vez, pela mesma disciplina da fatia 1 — achado de wrapper corrige-se no wrapper, nunca
no call site.

### D5 — quem classifica é a rubrica

`references/review-rubric.md` classifica; `frontend-design` é lente complementar e, em conflito com
uma rule de `.claude/rules/`, **a rule vence e o conflito é avisado ao João**, não resolvido em
silêncio. Destino por classe:

- **`C`** — fecha no mesmo bloco, com medida antes/depois na tela;
- **`B`** — corrige se couber no escopo; senão vira ficha `D-*` no `backlog.md`;
- **Falso positivo** — entra no relatório com o motivo do descarte, para não voltar na passada
  seguinte.

### D6 — o `scrollable` continua sendo pedido por quem mediu

Os quatro `ModuleTabs` (Comercial, Certificados, Pessoas, Administração) seguem sem a prop. Esta
fatia liga a de **Comercial e Certificados**, e só se a régua transbordar medido em 1440x900 ou
390x844. Não por padrão no wrapper: `p-tabview-scrollable` troca a nav por um contêiner com
`overflow: hidden`, e o efeito disso em tela não medida é suposição — foi o que o review da fatia 1
desfez.

## Herança da fatia 1

Entram os três, por decisão do João:

1. **Minor 2** — a coluna fixa de ações cobre o realce de hover da linha (`AppDataTable`, D4);
2. **Minor 3** — a coluna fixa esconde a sombra de rolagem da direita (`AppDataTable`, D4);
3. **Minor 5** — `items-baseline` reposiciona o slot `actions` do `DetailHeader`; aparece no detalhe
   do orçamento da run 1;
4. **Ficha `D-*` nova** — `Turma.php:200` devolve a recusa em espanhol fixo (a metade da UI-01 fora
   do fence da fatia 1). A ficha entra no `backlog.md` apontando para o item 7; a correção não é
   desta fatia.

## Ambiente

Esta árvore **não tem `.env` na raiz**, então hoje ela reclamaria as portas do main tree — o
`fix-frontend-app-1` está no ar sem `nginx`/`mysql` publicados, exatamente por isso. Offsets em uso:
`+0` no main tree, `+1` em `../lotus-infra`. Esta árvore fica em **offset +2**:

```
LOTUS_DEV_HTTP_PORT=8082
LOTUS_DEV_DB_PORT=3309
LOTUS_DEV_MAILPIT_PORT=8027
LOTUS_DEV_MINIO_PORT=9004
LOTUS_DEV_MINIO_CONSOLE_PORT=9005
LOTUS_DEV_VITE_PORT=5175
```

Mais duas condições já medidas por fichas abertas:

- **P-57** — a imagem `app` desta worktree precisa ser reconstruída; a antiga é anterior ao
  `memory-cli.ini` e o comando do `CLAUDE.md` §6 fatala por memória nela;
- **P-58** — `frontend/.env` precisa adotar o molde de `frontend/.env.example`; o `VITE_API_URL`
  legado reprova 3 casos de `tests/compose-dev.test.ts`, que não afasta esse arquivo.

Nenhuma das duas é regressão desta fatia; são pré-condições de árvore, declaradas aqui e não
descobertas no gate.

## Artefatos

Um relatório por superfície em `docs/superpowers/audits/`, datado, no molde vigente: §1 escopo e
limites da run (incluindo estados não testados e falsos positivos), §2 `report.txt` **verbatim**, §3
o que foi feito com ele. A evidência bruta fica em `.artifacts/ui-review/`, coberta pelo
`.gitignore`.

## Gate

O bloco toca `backend/`, então o gate é o completo, não o de frontend puro:

- `pnpm lint` 0, `pnpm build` verde, `pnpm test` sem regressão sobre a baseline da branch;
- suíte do backend pelo comando do `CLAUDE.md` §6, na imagem reconstruída;
- `./vendor/bin/pint` nos arquivos PHP tocados (host, de dentro de `backend/`);
- `typescript:transform` sem drift **depois** de o `generated.ts` regenerado ser commitado.

## DoD

1. Comercial e Certificados têm relatório datado em `audits/` e **nenhum achado `C` aberto**, cada
   correção medida na tela antes e depois.
2. `EVALUACION_REDATOR` e os irmãos deixam de ser `string` no `generated.ts`: os quatro campos
   (`missing_types` ×2, `missing_document_types`, `present_types`) carregam `TurmaDocumentType`, e
   `turmaDocumentTypeLabel` recebe o enum sem fallback.
3. Nas tabelas com coluna de ações presa, o realce de hover alcança a linha inteira e a sombra de
   rolagem da direita fica visível — provado na tela, não no diff.
4. As fichas `D-38` e a nova de `Turma.php:200` registram decisão e destino no `backlog.md`; a
   `D-57` sai do backlog no fechamento.
