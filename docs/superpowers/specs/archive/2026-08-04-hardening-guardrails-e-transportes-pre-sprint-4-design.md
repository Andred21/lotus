# Spec — Hardening · guardrails e transportes pré-Sprint 4 (H.3.1, H.4.6, H.4.7, H.4.8)

> Bloco: `hardening-guardrails-e-transportes-pre-sprint-4` · Data: 2026-08-04
> Context Packet: `docs/superpowers/context-packets/hardening-guardrails-e-transportes-pre-sprint-4.md`
> Recorte do item 1 do `backlog.md`. Entrega **4** das 7 tasks abertas.

## §1 · O que este bloco é

Dois guardrails e duas extrações de transporte. **Nenhuma das quatro corrige defeito visível ao
usuário** — nos dois lugares que ganham mecanismo, o estado atual já está correto. É a mesma forma do
H.4.1 do bloco anterior: o valor não é consertar, é impedir que o próximo caso nasça errado.

Isso define o DoD antes de qualquer task: **suíte verde não prova este bloco.** Um guardrail só vale
depois de ser visto reprovando contra uma sonda fresca, e reprovando **pelo motivo certo** (lição
10). Falha pelo motivo errado é `BLOCKED`, não prova.

### Corte, e o critério dele

Critério do João: **fechar o que é barato e não precisa de prova visual**, isolando os refactors
grandes em blocos próprios.

| Task | Medição | No bloco? |
|---|---|---|
| H.3.1 | 6 URI patterns / **7 rotas** com ≥2 bindings; 5 já guardadas, 1 é N:N legítima | ✅ |
| H.4.6 | 8 `app()` em DTO, em 2 famílias distintas | ✅ |
| H.4.7 | **7** `new FormData()`; 6 de forma simples, 1 complexo | ✅ |
| H.4.8 | 443 chaves × 3 locales, **zero diff** | ✅ |
| H.4.4 | 9 tabelas, 932 linhas | ❌ backlog |
| H.4.5 | 7 aliases puros de 6 linhas | ❌ backlog |
| H.4.9 | 1 factory; `Course::create` 53× em 76 testes | ❌ backlog |

**H.4.5 saiu deste bloco por decisão do João em 2026-08-04**, depois de o brainstorming já ter
resolvido o mérito. A conclusão técnica **fica registrada e não se perde**: eliminar os 7 aliases
`useXPage` regrediria a fronteira de query-em-componente zerada em 2026-08-03 — `useCrudPage` chama
`resource.useList()` por dentro, então matá-los moveria a query para `CommercialPage`, `CatalogPage`,
`PeoplePage` e `AdministracionPage`, e **passaria no lint atual**, porque o seletor
`CallExpression[callee.object.name=/Api$/][callee.property.name=/^use[A-Z]/]` casa
`budgetsApi.useList()` mas não `useCrudPage(budgetsApi)`. Quando H.4.5 for executado, a resposta é
"justificar, e fechar o escape do seletor" — não "eliminar". Vai para o `backlog.md` com essa nota,
para o próximo bloco não reabrir a análise do zero.

> **O nome do bloco descreve o corte, não o item.** Trocado de
> `hardening-estrutural-pre-sprint-4-restante` para o atual pela mesma razão: com H.4.4, H.4.5 e
> H.4.9 abertos, "restante" prometia o que não se entrega.

## §2 · Decisões

**D1 — Branch no main tree, sem worktree.** O bloco toca `backend/` (D5, D9), e a pendência **P-03**
manda main tree para toque de backend. Branch a partir do `main`.

**D2 — Cada guardrail é provado nos dois sentidos, com sonda temporária.** Sonda entra, o gate
reprova, a mensagem é conferida, a sonda sai, a árvore fica limpa. Vale para D6 (backend) e D13
(vitest). Sem isso a task não fecha, mesmo com a suíte verde.

**D3 — H.3.1 entrega guardrail e unificação, não correção.** A medição não achou rota nested
desguardada. O que existe é dois mecanismos para a mesma garantia. Todo caminho que devolvia 404
continua devolvendo 404, com o mesmo status.

**D4 — As 3 rotas planas ficam planas.** `PUT|DELETE /addresses/{address}`, `/contacts/{contact}` e
`/templates/{template}` não têm o pai na URL. Não há posse a cruzar porque a requisição nunca nomeia
um pai, e a permissão (`commercial.client.update`, `catalog.course.update`) é global — quem pode
editar um cliente pode editar qualquer um. Aninhá-las mudaria o contrato de 6 endpoints e os callers
do frontend **sem ganho de segurança hoje**, com cliente e aluno fora do login pela RN-01.

**D4b — A task do Notion H.3.1 é corrigida no fechamento.** A task descreve `addresses`, `contacts`,
`templates` e `files` como se os quatro tivessem o mesmo risco de posse cruzada. **Três deles são
rotas shallow** e não representam o risco descrito: sem pai na URL, não existe o acesso cruzado que a
task quer barrar. Deixar a task como está mantém no Notion uma afirmação que o código nega — lição
13, agora numa fonte externa. No fechamento, a task recebe: o recorte real (só `files`, em 5 rotas,
já guardadas), a decisão D4 e o mecanismo entregue. **Write externo, por ID
(`39dbc9603dfa81f39e52ec6033137656`), na base canônica `e64b7d57-d000-4433-b652-a410e75193cc`** — e
só depois de o João aprovar o texto.

**D5 — Os 3 `abort_unless` viram `->scopeBindings()`.** Lição 14: quando existe mecanismo do
framework, ele vence a instrução em código. As quatro relações existem e são `MorphMany`
(`Budget::files()`, `Quote::files()`, `Redator::documents()`, `Turma::files()` — conferidas, não
supostas).

**D6 — O guardrail lê a rota pela assinatura, e silêncio reprova.** `NestedRouteOwnershipTest` varre
`Route::getRoutes()` e usa **`signatureParameters()`** para achar as rotas com ≥2 parâmetros tipados
como model — **não regex sobre a URI**. Regex sobre URI erraria nos dois sentidos: `{file}` não diz
que é model, e `users/{user}/photo` tem um binding só apesar de parecer nested. A assertiva é:

> toda rota com ≥2 bindings de model declara **`scopeBindings()` ou `withoutScopedBindings()`** —
> explicitamente, uma das duas.

**Sem allowlist no teste.** A isenção mora na rota, no vocabulário do framework, via
`->withoutScopedBindings()` com o motivo em comentário ao lado. `enforcesScopedBindings()` e
`preventsScopedBindings()` existem no Laravel 13.8 instalado (linhas 1277 e 1281 de
`Routing/Route.php`), e a segunda distingue *declarado false* de *não declarado* — que é o que
permite reprovar o silêncio. Uma lista dentro do teste envelheceria longe da rota; um `->without…`
na própria rota é lido por quem a edita.

**D7 — H.4.6 pilota na família 1.** Os 8 `app()` em DTO são duas coisas:

- **Família 1 — DTO calculando valor de domínio:** `BudgetData`+`BudgetSummaryService` (status e
  totais em UF — dinheiro) e `TurmaData`+`TurmaHabilitacaoService`.
- **Família 2 — assinatura de URL na serialização:** `photo_url` ×4 (`UserPhotoService`) e
  `download_url` ×2 (`UploadFileAction::temporaryUrl`).

O piloto é **`BudgetData`**: dinheiro, 4 call sites, todos do próprio controller, sem cascata.

**D8 — Destino explícito do `TurmaData`.** Ele é o **outro** caso da família 1, e fica **fora deste
bloco**, não indefinido. Razão: `TurmaData::fromModel` tem mais consumidores que o `BudgetData`, e o
ponto do piloto é medir o custo da técnica com o menor raio possível. Seu destino é decidido por D9,
não por uma sessão futura sem critério.

**D9 — Decisão de saída do piloto, escrita antes de executá-lo.** O piloto só é piloto se puder
falhar. Ao fim da task, contra o `BudgetData` já convertido:

| Sinal | Leitura | Consequência |
|---|---|---|
| `BudgetController` injeta o serviço sem mudar assinatura de rota, e o teste de `BudgetData` deixa de precisar de container | técnica paga | `TurmaData` entra no próximo bloco de hardening, pela mesma técnica |
| A injeção precisa atravessar ≥2 níveis de chamada, ou algum call site precisa de `app()` para obter o serviço e repassá-lo | técnica só empurra o locator para o chamador | **piloto reprovado**: reverter a task, registrar a família 1 inteira como costura aceita |
| Fica no meio (funciona, mas o ganho não aparece em teste nem em legibilidade) | inconclusivo | manter `BudgetData` convertido, **não** propagar; `TurmaData` volta ao backlog com o resultado anexado |

A leitura é do João no fechamento. O que **não** é aceitável é fechar o bloco sem responder qual das
três aconteceu — piloto sem critério de saída é refactor com nome bonito.

**D10 — A família 2 fica, com razão registrada.** `photo_url` é `#[Computed]`, assinar URL é concern
de serialização, e empurrar o assinador para todo chamador provavelmente piora o código — soma-se que
já houve falso positivo do resolver do spatie exatamente ali (Q1 de 2026-08-01, o
`CannotSetComputedValue` que não dispara com propriedade promovida no construtor).

**D11 — H.4.7 centraliza transporte, não payload.** Medição corrigida: são **7** `new FormData()`,
**6 de forma simples** (campos + 1 `File` → POST → unwrap) e **1 complexo**. `postMultipart` cobre os
6. `useRedatorForm` **fica fora**: monta array (`course_ids[]`) e chave polimórfica
(`documents[type]`), e entrega o `FormData` pronto para uma mutation de CRUD alheia. Cobri-lo exigiria
um serializador genérico de payload — forma de domínio vazando para o transporte, contra o non-goal do
item 1. As mutations mantêm `useMutation`, query keys e invalidação próprias.

**D11b — `delete` não é abstraído, e isso é decisão.** Os mesmos arquivos têm mutations de remoção
(`useRemoveBudgetFile`, `useRemoveDocument`, `photoResource.remove`, …) que são `api.delete(url)` de
uma linha. Elas **não** entram em helper: não há transporte a centralizar — nenhum `FormData`, nenhum
`Content-Type`, nenhuma armadilha da lição 6. Um `deleteResource(url)` seria alias de `api.delete`
com um nome a mais para aprender. Fica registrado para não ser lido como assimetria esquecida, e é
**sincronizado na task H.4.7 do Notion** (`3b1bc9603dfa815c991bd10373d74cf6`) no fechamento, junto
com o recorte real de 6 de 7 pontos.

**D12 — H.4.7 é o único risco real, e exige prova além do build.** São caminhos de upload de
documento com peso legal, e a falha da lição 6 é **silenciosa**: `Content-Type` fixado faz o `File`
virar `{}` e o upload chegar vazio com 201/204 de sucesso. Build e lint não veem. Exige (a) teste
direto do `postMultipart` (D13b) e (b) upload real contra a API em pelo menos **2** dos 6 pontos
adotados.

**D13 — H.4.8 mora no vitest.** Os 3 JSON são do frontend e a comparação não envolve backend nenhum;
`pnpm test` é o gate que quem edita locale já roda. `PermissionI18nParityTest` **não se move** — ele
compara o `PermissionCatalog` (PHP) contra as locales, é dono de um dos lados, e movê-lo exigiria
exportar o catálogo para o front, mudança de contrato fora do escopo.

**D13b — `postMultipart` ganha teste direto, não só prova de ponta.** Um teste vitest sobre o helper,
assertando o que a lição 6 e o `valid_until` exigem: o corpo enviado é `instanceof FormData`; nenhum
`Content-Type` é fixado na chamada; chave `undefined` **não** aparece no corpo. Sem isso, a única
guarda do helper seria o upload manual do gate — que não roda em CI e não protege a próxima edição.

**D14 — H.4.3 é dependência real de H.4.8 e D13b, e o gate permanente precisa disso.** As duas tasks
entregam **teste vitest**; sem o runner instalado em 2026-08-04 pelo H.4.3, nenhuma das duas existe.
O `pnpm test` já entrou no gate permanente naquele bloco — `CLAUDE.md` §6 e o §Comandos da
`.claude/rules/frontend-fsliced.md` foram corrigidos no Q-3 do review, que os pegou ainda afirmando
"sem test runner ainda". **Isto se confirma no gate deste bloco, não se assume:** um grep pelos dois
arquivos, provando que citam `pnpm test`. Se a citação tiver sumido, os testes deste bloco nascem
órfãos de gate e a task não fecha.

## §3 · Detalhe por task

### H.3.1 — posse em rota nested

Estado medido — **6 URI patterns, 7 rotas** (a N:N do redator responde POST e DELETE):

| Rota | Hoje | Depois |
|---|---|---|
| `DELETE turmas/{turma}/documents/{file}` | `->scopeBindings()` | inalterada |
| `DELETE turmas/{turma}/alunos/{enrollment}` | `->scopeBindings()` | inalterada |
| `DELETE budgets/{budget}/files/{file}` | `abort_unless(...404)` | `->scopeBindings()` |
| `DELETE quotes/{quote}/files/{file}` | `abort_unless(...404)` | `->scopeBindings()` |
| `DELETE redatores/{redator}/documents/{document}` | `abort_unless(...404)` | `->scopeBindings()` |
| `POST turmas/{turma}/redatores/{redator}` | nada | `->withoutScopedBindings()` + motivo |
| `DELETE turmas/{turma}/redatores/{redator}` | nada | `->withoutScopedBindings()` + motivo |

O motivo da isenção, em comentário na rota: redator **não pertence** à turma — é N:N
(`turma_redator`), e `scopeBindings` tentaria resolver `$turma->redator()`, que não existe.

O `abort_unless` sai do controller no mesmo commit em que o `scopeBindings` entra, para o endpoint
nunca ficar sem nenhum dos dois. Nome do parâmetro casa a relação: `{file}` → `files()`,
`{document}` → `documents()`.

### H.4.6 — `BudgetData` sem service locator

`BudgetData::fromModel(Budget $budget, BudgetSummaryService $summary)`. Os 4 call sites são todos do
`BudgetController` (`index`, `store`, `show`, `update`), que recebe o serviço por injeção de método.
Nenhum outro arquivo chama `BudgetData::fromModel` — conferido, sem cascata. Fecha com a leitura de
D9.

### H.4.7 — `postMultipart`

Helper em `shared/api/`, assinatura `postMultipart<T>(url, fields)` sobre um registro de
`string | File | undefined`. **Chave com valor `undefined` é omitida do `FormData`**, não enviada
como a string `"undefined"` — é o que `useRedatorDocuments` faz hoje com `valid_until`
(`if (valid_until) fd.append(...)`), e perder isso mandaria lixo para uma coluna de data.

Os 6 pontos adotantes: `photoResource`, `useTurmaDocuments`, `useImportStudents`,
`useCommercialFiles` (2), `useRedatorDocuments`. O comentário da lição 6 passa a existir uma vez só,
no helper, e sai dos consumidores. Teste direto por D13b.

### H.4.8 — paridade das 3 locales

Teste vitest que achata as chaves de `en.json`, `es-CL.json` e `pt-BR.json` e compara os conjuntos
**nos dois sentidos**, nomeando as chaves divergentes na mensagem. Baseline atual: 443 em cada, zero
diff — o estado atual passa, como o sinal de aceite exige.

## §4 · Invariantes de comportamento

1. Todo endpoint que hoje devolve **404** para filho de outro pai continua devolvendo **404**.
2. Nenhum campo de resposta muda de nome, tipo ou presença. `generated.ts` sem diff.
3. Upload continua chegando como `multipart/form-data` com boundary derivado pelo axios — nunca
   `application/json`, nunca `Content-Type` fixado à mão.
4. Campo opcional ausente continua **não sendo enviado** — `valid_until` vazio não vira a string
   `"undefined"` no `FormData` do documento de redator.
5. Nenhuma chave de i18n é criada, removida ou renomeada.
6. `turmas/{turma}/redatores/{redator}` continua aceitando qualquer redator habilitado — o
   `withoutScopedBindings()` não relaxa nada, declara que não há posse a checar.
7. As mutations de remoção seguem como estão (D11b), incluindo suas invalidações.

## §5 · Gate

**Item 0 — o critério de aceite deste bloco são os guardrails reprovando, não a suíte verde.** Com
sonda fresca criada no próprio gate, conferindo a mensagem e apagando a sonda depois:

- **H.3.1 (a):** rota nova com 2 bindings de model e **sem** declaração reprova o
  `NestedRouteOwnershipTest`, citando a rota — o caso do silêncio, que é o que a allowlist não
  pegaria.
- **H.3.1 (b):** a mesma rota com `->withoutScopedBindings()` **passa** — prova que a saída existe e
  é explícita, não que o teste é frouxo.
- **H.3.1 (c):** DELETE cross-pai real (arquivo do budget A pela URL do budget B) devolve **404**.
- **H.4.8:** chave presente em `es-CL` e ausente em `en` reprova o `pnpm test` nomeando a chave; e o
  caso simétrico (excedente) também.

**Prova de comportamento (D12):** upload real contra a API com sessão Sanctum em 2 dos 6 pontos —
foto (204, e a URL pré-assinada devolvendo a imagem) e documento (201 com corpo, arquivo com
`size` > 0 no banco). Ver a lição 12 para os headers do curl.

**Decisão de saída do piloto (D9):** o fechamento nomeia qual dos três sinais ocorreu no H.4.6.

**Confirmação de gate permanente (D14):** grep provando que `CLAUDE.md` §6 e
`.claude/rules/frontend-fsliced.md` §Comandos citam `pnpm test`.

**Automatizado:** suíte backend com os testes novos · `pnpm test` + `pnpm build` + `pnpm lint`
verdes · Pint nos arquivos de `backend/` tocados · `generated.ts` sem diff e nenhum DTO com forma
alterada · diff de `locales/` vazio · nenhum órfão.

**Sem checkpoint visual.** Nenhuma tela muda de forma. Se durante a execução alguma mudança tocar
markup, o bloco ganha checkpoint — não se fecha prova visual pela lembrança de outro bloco.

**Writes externos, no fechamento e só com texto aprovado pelo João:** D4b (task H.3.1) e D11b (task
H.4.7), ambos por ID na base canônica.

## §6 · Fora de escopo

- **H.4.4**, **H.4.5** e **H.4.9** — seguem no item 1 do `backlog.md`. H.4.5 leva junto a conclusão
  técnica do §1.
- Aninhar `addresses`, `contacts`, `templates` (D4).
- `TurmaData` (D8) e a família 2 do service locator (D10).
- `useRedatorForm` no helper multipart (D11); mutations de `delete` (D11b).
- Mover o `PermissionI18nParityTest` (D13).
- Repository sobre Eloquent, CRUD base genérico, tabela universal, split massivo de DTOs, split
  físico dos locales — non-goals herdados do item 1. `createCrudResource` (ADR-18) é contrato
  existente e permanece.
