# Spec — Hardening estrutural pré-Sprint 4 · restante (H.3.1, H.4.5–H.4.8)

> Bloco: `hardening-estrutural-pre-sprint-4-restante` · Data: 2026-08-04
> Context Packet: `docs/superpowers/context-packets/hardening-estrutural-pre-sprint-4-restante.md`
> Item 1 do `backlog.md`, parte restante. Entrega **5 das 7** tasks abertas.

## §1 · O que este bloco é

Três guardrails e duas extrações. **Nenhuma das cinco corrige defeito visível ao usuário** — nos
três lugares que ganham mecanismo, o estado atual já está correto. É a mesma forma do H.4.1 do bloco
anterior: o valor não é consertar, é impedir que o próximo caso nasça errado.

Isso define o DoD antes de qualquer task: **suíte verde não prova este bloco.** Um guardrail só vale
depois de ser visto reprovando contra uma sonda fresca, e reprovando **pelo motivo certo** (lição
10). Falha pelo motivo errado é `BLOCKED`, não prova.

**O nome do work item promete mais do que o corte entrega.** `...-restante` sugere as 7 tasks; este
bloco faz 5. **H.4.4** (`SearchableTableFrame`) e **H.4.9** (builders de teste backend) seguem no
item 1 do `backlog.md`, por decisão do João no brainstorming de 2026-08-04. Registrado aqui para não
virar afirmação falsa no fechamento — o mesmo cuidado que o bloco anterior teve ao fechar 3 de 9.

### Corte, e o critério dele

Critério do João: **fechar tudo que é barato e não precisa de prova visual**, isolando os dois
refactors grandes num bloco próprio. A medição sustenta o corte — as duas tasks excluídas são as
únicas de porte:

| Task | Medição | Natureza | No bloco? |
|---|---|---|---|
| H.3.1 | 6 rotas com pai+filho; 5 já guardadas, 1 é N:N legítima | guardrail | ✅ |
| H.4.5 | 7 aliases puros idênticos de 6 linhas | decisão + mecanismo | ✅ |
| H.4.6 | 8 `app()` em DTO, em 2 famílias distintas | piloto pequeno | ✅ |
| H.4.7 | 6 pontos montando `FormData`; 5 com a mesma forma | extração pequena | ✅ |
| H.4.8 | 443 chaves × 3 locales, **zero diff** | guardrail | ✅ |
| H.4.4 | 9 tabelas, 932 linhas | refactor + prova na tela | ❌ |
| H.4.9 | 1 factory; `Course::create` 53×, `Quote::create` 34× em 76 testes | infra de teste | ❌ |

## §2 · Decisões

**D1 — Branch no main tree, sem worktree.** O bloco toca `backend/` (D5, D9), e a pendência **P-03**
manda main tree para toque de backend. Branch a partir do `main`.

**D2 — Cada guardrail é provado nos dois sentidos, com sonda temporária.** Sonda entra, o gate
reprova, a mensagem é conferida, a sonda sai, a árvore fica limpa. Vale para D3 (backend), D7
(ESLint) e D11 (vitest). Sem isso a task não fecha, mesmo com a suíte verde.

**D3 — H.3.1 entrega guardrail e unificação, não correção.** A medição não achou rota nested
desguardada. O que existe é dois mecanismos para a mesma garantia. `git diff` de comportamento
observável fica vazio: todo caminho que devolvia 404 continua devolvendo 404, com o mesmo status.

**D4 — As 3 rotas planas ficam planas.** `PUT|DELETE /addresses/{address}`, `/contacts/{contact}` e
`/templates/{template}` não têm o pai na URL. Não há posse a cruzar porque a requisição nunca nomeia
um pai, e a permissão (`commercial.client.update`, `catalog.course.update`) é global — quem pode
editar um cliente pode editar qualquer um. **Aninhá-las mudaria o contrato de 6 endpoints e os
callers do frontend sem nenhum ganho de segurança hoje**, com cliente e aluno fora do login pela
RN-01. Decisão consciente, registrada; não é buraco esquecido.

**D5 — Os 3 `abort_unless` viram `->scopeBindings()`.** Lição 14: quando existe mecanismo do
framework, ele vence a instrução em código. As quatro relações necessárias existem e são `MorphMany`
(`Budget::files()`, `Quote::files()`, `Redator::documents()`, `Turma::files()` — conferidas, não
supostas), e `Route::enforcesScopedBindings()` existe no Laravel 13.8 instalado, que é o que torna o
guardrail de D6 legível em vez de convencional.

**D6 — O guardrail lê a rota, não o texto do controller.** `NestedRouteOwnershipTest` varre
`Route::getRoutes()`, seleciona toda rota com **≥2 bindings de model** e exige
`enforcesScopedBindings()`. Allowlist de exatamente **1** entrada, com motivo:
`turmas/{turma}/redatores/{redator}` (POST e DELETE) é relação **N:N** — o redator não pertence à
turma, e `scopeBindings` tentaria resolver `$turma->redator()`, que não existe. Ler o controller em
vez da rota devolveria o problema do bloco anterior: regex que atravessa comentário e reprova por
menção.

**D7 — H.4.5 justifica os aliases, e a justificativa vira mecanismo.** Os 7 `useXPage` ficam. A
justificativa **não é a lição 3** (que fala de wrapper guardando fronteira de import proibido); é a
fronteira de query-em-componente, zerada em 2026-08-03. `useCrudPage` chama `resource.useList()` por
dentro: matar os aliases moveria essa query para dentro de `CommercialPage`, `CatalogPage`,
`PeoplePage` e `AdministracionPage`, e **passaria no lint atual** porque o seletor
`CallExpression[callee.object.name=/Api$/][callee.property.name=/^use[A-Z]/]` casa `budgetsApi.useList()`
mas não `useCrudPage(budgetsApi)`. O escape é fechado no `eslint.config.js`.

**D8 — A invariante que D7 protege, medida:** hoje nenhum componente de feature hospeda query de
recurso. `StaffUserDialog` e `StudentDialog` importam `usersApi`/`studentsApi`, mas **só para
`keys.all`** (chave de invalidação) — não é query, e segue permitido.

**D9 — H.4.6 pilota na família 1, e a família 2 fica por razão registrada.** Os 8 `app()` em DTO são
duas coisas diferentes:

- **Família 1 — DTO calculando valor de domínio:** `BudgetData`+`BudgetSummaryService` (status e
  totais em UF — dinheiro) e `TurmaData`+`TurmaHabilitacaoService`. É aqui que o service locator é
  cheiro real.
- **Família 2 — assinatura de URL na serialização:** `photo_url` ×4 (`UserPhotoService`) e
  `download_url` ×2 (`UploadFileAction::temporaryUrl`).

O piloto é **`BudgetData`**. A família 2 fica: `photo_url` é `#[Computed]`, assinar URL é concern de
serialização, e empurrar o assinador para todo chamador provavelmente piora o código — soma-se que
já houve falso positivo do resolver do spatie exatamente ali (Q1 de 2026-08-01, o
`CannotSetComputedValue` que não dispara com propriedade promovida no construtor).

**D10 — H.4.7 centraliza transporte, não payload.** `postMultipart` cobre os 5 pontos de forma
idêntica (campos simples + 1 `File` → POST → unwrap). `useRedatorForm` **fica fora**: ele monta
array (`course_ids[]`) e chave polimórfica (`documents[type]`), e entrega o `FormData` pronto para
uma mutation de CRUD alheia. Cobri-lo exigiria um serializador genérico de payload — a forma de
domínio do redator vazando para o transporte, contra o non-goal do item 1. As mutations mantêm
`useMutation`, query keys e invalidação próprias.

**D11 — H.4.8 mora no vitest.** Os 3 JSON são do frontend e a comparação não envolve backend nenhum;
`pnpm test` é o gate que quem edita locale já roda. `PermissionI18nParityTest` **não se move** — ele
compara o `PermissionCatalog` (PHP) contra as locales, é dono de um dos lados, e movê-lo exigiria
exportar o catálogo para o front, mudança de contrato fora do escopo.

**D12 — H.4.7 é o único risco real, e exige prova além do build.** São caminhos de upload de
documento com peso legal, e a falha da lição 6 é **silenciosa**: `Content-Type` fixado faz o `File`
virar `{}` e o upload chegar vazio com 201/204 de sucesso. Build e lint não veem isso. Exige upload
real, contra a API, em pelo menos **2** dos 5 pontos adotados — um de foto (`photoResource`, 204) e
um de documento (`useTurmaDocuments` ou `useCommercialFiles`, 201 com corpo).

## §3 · Detalhe por task

### H.3.1 — posse em rota nested

Estado medido das 6 rotas com pai+filho:

| Rota | Hoje | Depois |
|---|---|---|
| `DELETE turmas/{turma}/documents/{file}` | `->scopeBindings()` | inalterada |
| `DELETE turmas/{turma}/alunos/{enrollment}` | `->scopeBindings()` | inalterada |
| `DELETE budgets/{budget}/files/{file}` | `abort_unless(...404)` | `->scopeBindings()` |
| `DELETE quotes/{quote}/files/{file}` | `abort_unless(...404)` | `->scopeBindings()` |
| `DELETE redatores/{redator}/documents/{document}` | `abort_unless(...404)` | `->scopeBindings()` |
| `POST\|DELETE turmas/{turma}/redatores/{redator}` | nada (N:N) | allowlist com motivo |

O `abort_unless` sai do controller junto com a entrada do `scopeBindings` — no mesmo commit, para o
endpoint nunca ficar sem nenhum dos dois. Nome do parâmetro casa a relação: `{file}` → `files()`,
`{document}` → `documents()`.

### H.4.5 — fechar o escape do lint

Padrão novo no `no-restricted-syntax` sobre `src/features/*/components/**`, pegando
`useCrudPage(<algo>Api)`. Texto correspondente na `.claude/rules/frontend-fsliced.md`, dizendo
**por que** os aliases existem — a fronteira de query — e não repetindo a lição 3, que trata de
outra coisa.

### H.4.6 — `BudgetData` sem service locator

`BudgetData::fromModel(Budget $budget, BudgetSummaryService $summary)`. Os 4 call sites são todos do
`BudgetController` (`index`, `store`, `show`, `update`), que recebe o serviço por injeção de método.
Nenhum outro arquivo chama `BudgetData::fromModel` — conferido, sem cascata.

### H.4.7 — `postMultipart`

Helper em `shared/api/`, assinatura `postMultipart<T>(url, fields)` sobre um registro de
`string | File | undefined`. **Chave com valor `undefined` é omitida do `FormData`**, não enviada
como a string `"undefined"` — é o que `useRedatorDocuments` faz hoje com `valid_until`
(`if (valid_until) fd.append(...)`), e perder isso mandaria lixo para uma coluna de data. Adotado
por: `photoResource`, `useTurmaDocuments`, `useRedatorDocuments`,
`useCommercialFiles` (2 pontos), `useImportStudents`. O comentário da lição 6 passa a existir uma vez
só, no helper, e sai dos 5 consumidores.

### H.4.8 — paridade das 3 locales

Teste vitest que achata as chaves de `en.json`, `es-CL.json` e `pt-BR.json` e compara os conjuntos
**nos dois sentidos**, nomeando as chaves divergentes na mensagem. Baseline atual: 443 em cada, zero
diff — o estado atual passa, como o sinal de aceite exige.

## §4 · Invariantes de comportamento

1. Todo endpoint que hoje devolve **404** para filho de outro pai continua devolvendo **404**.
2. Nenhum campo de resposta muda de nome, tipo ou presença. `generated.ts` sem diff.
3. Nenhum componente de feature passa a hospedar query de recurso; a invariante de D8 segue valendo.
4. Upload continua chegando como `multipart/form-data` com boundary derivado pelo axios — nunca
   `application/json`, nunca `Content-Type` fixado à mão.
5. Nenhuma chave de i18n é criada, removida ou renomeada.
6. `turmas/{turma}/redatores/{redator}` continua aceitando qualquer redator habilitado — a allowlist
   de D6 não é permissão para relaxar nada, é reconhecimento de que não há posse a checar.
7. Os 7 aliases `useXPage` continuam existindo, com 1 consumidor cada.
8. Campo opcional ausente continua **não sendo enviado** — `valid_until` vazio não vira a string
   `"undefined"` no `FormData` do documento de redator.

## §5 · Gate

**Item 0 — o critério de aceite deste bloco são os guardrails reprovando, não a suíte verde.** Os
três, com sonda fresca criada no próprio gate, conferindo a mensagem e apagando a sonda depois:

- **H.3.1:** rota nested nova com 2 bindings e sem `scopeBindings` reprova o `NestedRouteOwnershipTest`,
  citando a rota; e um DELETE cross-pai real (arquivo do budget A pela URL do budget B) devolve 404.
- **H.4.5:** `useCrudPage(clientsApi)` dentro de um componente de feature reprova o `pnpm lint`, e
  `useCrudPage(clientsApi)` dentro de `features/*/hooks/` **não** reprova (escopo correto).
- **H.4.8:** chave presente em `es-CL` e ausente em `en` reprova o `pnpm test` nomeando a chave; e o
  caso simétrico (excedente) também.

**Prova de comportamento (D12):** upload real contra a API com sessão Sanctum em 2 dos 5 pontos —
foto (204, e a URL pré-assinada devolvendo a imagem) e documento (201 com corpo, arquivo com
`size` > 0 no banco). Ver a lição 12 para os headers do curl.

**Automatizado:** suíte backend com os testes novos · `pnpm test` + `pnpm build` + `pnpm lint`
verdes · Pint nos arquivos de `backend/` tocados · `generated.ts` sem diff e nenhum DTO com forma
alterada · diff de `locales/` vazio · nenhum órfão (o helper e o teste novos com consumidor).

**Sem checkpoint visual.** Nenhuma tela muda de forma. Se durante a execução alguma mudança tocar
markup, o bloco ganha checkpoint — não se fecha prova visual pela lembrança de outro bloco.

## §6 · Fora de escopo

- **H.4.4** e **H.4.9** — seguem no item 1 do `backlog.md`.
- Aninhar `addresses`, `contacts`, `templates` (D4).
- Família 2 do service locator em DTO (D9).
- `useRedatorForm` no helper multipart (D10).
- Mover o `PermissionI18nParityTest` (D11).
- Renomear os aliases `useXPage` — o nome sugere 1 hook por página e 3 das 4 páginas usam dois, mas
  corrigir é churn de 11 arquivos sem ganho de comportamento. Não é esquecimento; foi avaliado.
- Repository sobre Eloquent, CRUD base genérico, tabela universal, split massivo de DTOs, split
  físico dos locales — non-goals herdados do item 1. `createCrudResource` (ADR-18) é contrato
  existente e permanece.
