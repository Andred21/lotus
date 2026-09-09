# Medições — item 22 (`dominio-decisoes-de-rbac-e-semantica`)

> Task 9 do plano `docs/superpowers/plans/archive/2026-09-03-dominio-decisoes-de-rbac-e-semantica.md`.
> Medido contra o container `app` de pé (reiniciado no meio da sessão — ver §7), banco de dev
> existente mutado temporariamente para as provas de `D-16` e `D-09` e devolvido ao estado
> original em cada caso (ver §5 e §6). Browser real (Firefox via `playwright-cli`) usado para as
> partes "na tela" da prova, além da API crua.

## 1. Suíte inteira — antes e depois

```
docker compose exec -T app php artisan test
```

**1189 passed / 5 skipped (9162 assertions)**, `Duration: 89.45s`.

A spec (`design.md` §7) registra a `main` (commit `182be2ab`, ponto de onde este branch abriu) em
**1175 passed / 5 skipped**. Diferença: **+14**, reconciliada exatamente pela soma que o próprio
ledger (`.superpowers/sdd/progress.md`) já registrou task a task — nenhum número novo, só a soma:

| Task | O que muda a suíte backend | Contagem final registrada no ledger | Delta |
|---|---|---|---|
| main (182be2ab) | — | 1175 / 5 | — |
| 1 | `RolePermissionCrudTest` (2 testes dedicados de N+1, ator próprio) | 1179 / 5 | +4 |
| 2 | Front-only | 1179 / 5 | +0 |
| 3 | Rota nova entra no mecanismo genérico de `ListQueryBudgetTest` (2 linhas, sem ator dedicado) | 1183 / 5 | +4 |
| 4 | Front-only | 1183 / 5 | +0 |
| 5 | `PipelineQueryTest`/`DashboardEndpointTest` ganham assertdowns em métodos já existentes, não métodos novos — sem delta de contagem | 1183 / 5 | +0 |
| 6 | Front-only (rótulo de locale) | 1183 / 5 | +0 |
| 7 | `ContatoPrincipalTest` novo (3 testes) menos 2 testes obsoletos removidos + 1 reescrito (líquido +1) | 1184 / 5 | +1 |
| 8 | `PrimaryContactTest` ganha os testes de recusa 422 (líquido +5 depois de **7** edições comportamentais em **dois** arquivos — ver a errata abaixo) | 1189 / 5 | +5 |
| **Total** | | **1189 / 5** | **+14** |

**Errata de 2026-09-04 (achado Q-1 do review).** A linha da Task 8 dizia "os 4 que quebravam", e
eram **7 métodos em dois arquivos** — `PrimaryContactTest` e `PrimaryAddressTest`, este último nem
citado. O plano autorizava editar **exatamente quatro** testes existentes, nomeados nas Tasks 1 e 5
(Global Constraint, linha 20), e o Step 8 da Task 8 mandava **PARAR** e levar ao João qualquer
teste de cliente que quebrasse por mandar contatos sem principal. O gate foi atravessado: as
edições estão semanticamente certas, mas a decisão era do João e a medição registrou menos do que
houve. O resíduo concreto — `test_cliente_sem_principal_e_valido` apagado sem substituto, deixando
o POST `/api/clients` sem prova direta do 422 que a D-16 manda valer no create — foi fechado no
mesmo review por `ContatoPrincipalTest::test_criar_sem_nenhum_principal_e_422` e
`::test_criar_com_exatamente_um_principal_passa`. Fica aqui, e não em `pendencias/`, porque não
sobra nada aberto para um gatilho fechar: o que resta é o rastro.

Com as correções dos cinco achados do review (Q-1 a Q-5), a suíte vai a **1192 passed / 5 skipped
(9195 assertions)**: +3 sobre os 1189 desta tabela — os dois testes de create acima mais
`ContatoPrincipalTest::test_a_guarda_le_o_estado_de_depois_do_lock_e_nao_o_do_binding` (Q-2). O
`ListQueryBudgetTest` fica em zero líquido: perdeu o teste dedicado de `api/roles/assignable` e
ganhou o mesmo caso como data set do provider genérico.

Re-rodada agora (fim da Task 9, depois do reinício de Docker — §7): **idêntica**, 1189 passed / 5
skipped. Nenhuma regressão entre o fim da Task 8 e o fim da Task 9 — esperado, já que a Task 9 "não
escreve código de produção" (a própria Interfaces dela).

## 2. `generated.ts` e Pint

```
docker compose exec -T app php artisan typescript:transform
git diff --stat frontend/src/shared/types/generated.ts
```

Diff **vazio** — já commitado nas Tasks 1, 3 e 5, como o plano previa.

```
cd backend && ./vendor/bin/pint --test app
```

```json
{"tool":"pint","result":"passed"}
```

```
./vendor/bin/pint --test app tests
```

```json
{"tool":"pint","result":"fail","files":[
  {"path":"tests/Feature/Cadastros/RedatorModelTest.php","fixers":["binary_operator_spaces"]},
  {"path":"tests/Feature/Cadastros/FileModelTest.php","fixers":["binary_operator_spaces"]},
  {"path":"tests/Feature/Cadastros/ClientDataValidationTest.php","fixers":["binary_operator_spaces"]},
  {"path":"tests/Feature/Identity/AuthTest.php","fixers":["binary_operator_spaces"]},
  {"path":"tests/Feature/Identity/RbacAuthTest.php","fixers":["binary_operator_spaces"]}
]}
```

**Nota de medição, fora do escopo deste bloco:** os cinco arquivos são os mesmos já identificados
como dívida pré-existente da `main` no audit do item 26 (§3 de `2026-09-02-item26-medicoes.md`).
Confirmado de novo aqui: `git log --oneline main..HEAD -- <cada um dos cinco>` devolve vazio para
todos — nenhuma das nove tasks deste bloco os tocou. `pint --test app` (sem `tests/`) é o escopo que
a Global Constraint do plano pede e o que decide o DoD; passa limpo.

Frontend:

```
pnpm lint   →  0 achados
pnpm build  →  verde (tsc -b && vite build)
pnpm test   →  128 arquivos / 760 testes passed
```

## 3. `D-10` — `GET /api/roles` deixa de ser porta de enumeração

Fixture temporária: usuário `qa-admin-comum@lotus.cl` (`type=admin`, role seedada `admin` — sem
`identity.access.manage`) e sessão com `admin@lotus.cl` (`superadmin`, seed de dev). Autenticação via
`POST /sanctum/csrf-cookie` + `POST /api/login`, `Origin`/`Referer: http://localhost:5174` (domínio
stateful real do runtime deste worktree — ADR-13).

**Como `admin` comum:**

```
GET /api/roles              → 403
{"type":"https://lotus.cl/errors/forbidden","title":"Acceso denegado","status":403,
 "detail":"No tiene permiso para realizar esta acción.","instance":"/api/roles"}

GET /api/roles/assignable   → 200
[{"id":2,"name":"admin"},{"id":5,"name":"qa-somente-identity"},
 {"id":3,"name":"redator"},{"id":1,"name":"superadmin"}]
```

Sem chave `permissions` na segunda resposta — confirmado pela forma literal do array.

**Como `superadmin`:**

```
GET /api/roles → 200, lista completa com `permissions` (array) e `is_system` por role
(ex.: "admin" com 36 permissões, "superadmin" com 38, a role customizada "qa-somente-identity"
com as 2 que lhe foram dadas)
```

**Na tela** (Firefox, `playwright-cli`), confirmado por snapshot de acessibilidade:

- `admin` comum: `/administracion` abre sem erro (`heading "Administration"` presente), `tablist`
  contém **só** a aba `"Users"` — nenhuma aba de Roles.
- `superadmin`: `tablist` contém as duas abas, `"Users"` e `"Roles & permissions"`.
- O select de role do diálogo de usuário (`superadmin` → botão "New user") **continua populado**
  por dado real do `assignable`: aberto o combobox, a lista mostra `admin`, `qa-somente-identity`,
  `superadmin` — a role customizada criada só para esta medição aparece ali, provando que a lista
  vem do endpoint, não de um enum estático.

## 4. `D-11` — o lookup de empresa deixa de atravessar o gate comercial

Fixture temporária: role `qa-somente-identity` (`identity.user.view` + `identity.user.create`,
**sem** `commercial.client.view`, confirmado por `Role::hasPermissionTo` antes do teste), atribuída
ao usuário `qa-role-teste@lotus.cl`.

```
GET /api/clients                    → 403
{"type":"https://lotus.cl/errors/forbidden","title":"Acceso denegado","status":403,
 "detail":"No tiene permiso para realizar esta acción.","instance":"/api/clients"}

GET /api/students/client-options    → 200
[{"id":4,"legal_name":"CGE"},{"id":5,"legal_name":"Empresa Eléctrica 1 S.A."}, ...]
```

**Na tela**, autenticado como `qa-role-teste`: `/personas` → aba "Students" → botão "New student"
abre o diálogo, e o dropdown "Company" **lista** as empresas reais (`CGE`, `Empresa Eléctrica 1
S.A.`, ...) — mesma forma da resposta crua acima, confirmando que a tela usa o lookup novo e não
o endpoint comercial vetado.

## 5. `D-16` — o funil ganha o sétimo balde

Nenhuma turma concluída do seed de dev tinha zero matrícula aprovada (as 501 turmas `concluida`
existentes têm entre 12 e 13 aprovadas de 15-16). Prova por mutação temporária e reversível:
todas as 13 matrículas `aprobado` da turma id=3 viradas para `reprobado` (ids capturados antes:
21-33; as duas que já eram `reprobado`, 34 e 35, ficaram intocadas).

**Funil antes** (`GET /api/dashboard/metricas`, sessão superadmin), os 7 baldes:

```
quote_pending                 1
quote_approved_without_turma  2
turma_in_progress             2
turma_ready_for_conclusion    1
concluded_pending_issuance    1
fully_issued                  500
concluded_without_issuance    0
soma: 507
```

**Depois de virar a turma 3:**

```
concluded_pending_issuance    0   (-1 — turma 3 era a que estava com emissão pendente)
fully_issued                  500 (intocado)
concluded_without_issuance    1   (+1 — exatamente a turma 3)
soma: 507
```

A soma dos sete baldes **não muda** (507 nos dois momentos) — a turma 3 migrou de um balde para
exatamente outro, confirmando partição exclusiva sem duplicar nem perder item do funil.

**Na tela** (Firefox, superadmin, locale `en` desta sessão), screenshot do widget "Commercial and
operating funnel" com a mutação ainda ativa:

```
Quote pending                    1
Approved without a class         2
Class in progress                2
Ready to conclude                1
Concluded, to issue              0
Fully issued                     500
Concluded, nothing to issue      1
```

Sétimo balde em posição **terminal** (última da lista), como a spec exige (D-16, "última posição").
Rótulo bate exato com a chave `pipeline.concluded_without_issuance` do locale — já conferido
caractere a caractere na Task 6.

**Restauração:** as 13 matrículas voltaram a `aprobado` (mesmos ids). `GET /api/dashboard/metricas`
depois: os 7 baldes **idênticos** à medição "antes" (diff Python de ambos os JSONs, vazio).

## 6. `D-09` — o backend passa a exigir um principal

Sessão superadmin, cliente de dev id=1 (2 contatos: à época do começo desta Task, "Rodrigo Cáceres"
não-principal e "Marcela Herrera" principal — ver §7 sobre por que os ids não são os originais da
Task 7).

```
PUT /api/clients/1, todos os contatos com is_primary:false  → 422
{"type":"https://lotus.cl/errors/validation","title":"Error de validación","status":422,
 "detail":"El cliente necesita exactamente un contacto principal. (y 1 error más)",
 "instance":"/api/clients/1",
 "errors":{"contacts":["El cliente necesita exactamente un contacto principal."], ...}}
```

`detail` bate exato com a chave `commercial.client.primary_contact_required` em `es_CL` (Task 8).

```
DELETE /api/contacts/8  (Marcela, o principal corrente)  → 204

GET /api/clients/1 depois:
  [(2, "Rodrigo Cáceres", is_primary=true)]
```

Promoção automática confirmada: com um único contato restante, ele vira principal — sem chamada
nenhuma além do DELETE.

**Restauração pela rota real** (não Eloquent direto, para não repetir o bug descrito em §7):
`POST /api/clients/1/contacts {"name":"Marcela Herrera","is_primary":true}` → `201`. O serviço
demove Rodrigo pela mesma Action que o app usa (`ensureExactlyOne`), confirmado pelo GET seguinte:

```
[(2, "Rodrigo Cáceres", is_primary=false), (9, "Marcela Herrera", is_primary=true)]
```

Estado de principal único restaurado — a única diferença do estado anterior ao início desta Task é
cosmética (o id de Marcela mudou de 1 para 9 ao longo da sessão, sem significado semântico em
nenhum teste ou fixture).

## 7. Banco de dev — incidentes desta sessão e o que foi devolvido

Dois incidentes, os dois não relacionados ao código deste bloco, os dois corrigidos antes do
fechamento desta Task:

1. **Queda momentânea do Docker Desktop / integração WSL**, no meio de uma tentativa anterior de
   restaurar o cliente 1 depois da prova de `D-09` (a mesma prova de §6 já tinha sido feita uma vez
   antes desta medição final). A restauração manual daquela vez criou o novo contato "Marcela
   Herrera" direto via Eloquent (`$client->contacts()->create(...)`) em vez de pela Action —
   contornando `PrimaryContactService::ensureExactlyOne` e deixando **dois** contatos com
   `is_primary=true` simultaneamente (Rodrigo e a Marcela recriada). O comando de correção seguinte
   morreu com exit 137 (o próprio Docker caiu logo depois — sintoma consistente de um OOM/crash do
   daemon). Verificado e corrigido no início desta sessão, antes de qualquer outra medição: `tinker`
   confirmou os dois `is_primary=true`, um `update()` por instância (não query builder — mesma lei
   do §5.2) demoveu Rodrigo, e o estado de principal único foi reconfirmado antes do §6 acima
   começar. **Nenhum dado de produção** — só o banco MySQL de dev deste worktree — e nenhuma linha
   de código foi tocada para resolver isto.
2. A restauração de `D-09` documentada no §6 acima repete o MESMO padrão de risco (escrita direta
   fora da Action) se feita descuidadosamente — desta vez evitado de propósito, usando o endpoint
   real (`POST /api/clients/1/contacts`) em vez de `tinker`.

Fixtures de `D-10`/`D-11` (`qa-admin-comum@lotus.cl`, `qa-role-teste@lotus.cl`, role
`qa-somente-identity`) foram criadas duas vezes nesta sessão — uma para a prova por API, outra
(depois de limpas) para a prova na tela — e confirmadas removidas as duas vezes:
`User::whereIn(...)->count()` e `Role::where('name', 'qa-somente-identity')->count()` retornando
`0` ao final. Contagem final de roles do sistema: `3` (`superadmin`, `admin`, `redator`) — as
mesmas do seed original.

A mutação de `D-16` (§5) foi revertida e reconfirmada por diff vazio do funil inteiro, duas vezes
(uma para a prova por API, outra para o screenshot).

**Servidor Vite:** não estava de pé no início desta Task (necessário para a parte "na tela" das
provas, ausente nas tentativas anteriores por falta de ferramenta de navegador). Subido em
background só para esta Task (`pnpm dev`, porta 5174 — ADR-13) e encerrado ao final
(`http://localhost:5174/` confirmado fora do ar antes de fechar).

## 8. Resumo — DoD da spec §7

| Critério (spec §7) | Resultado |
|---|---|
| `D-10`: `admin` comum recebe 403 em `/api/roles`, 200 sem `permissions` em `/assignable`; `superadmin` segue 200 com permissões; tela sem a aba para admin comum, select de role continua populado | Fechado — §3 |
| `D-11`: role customizada sem `commercial.client.view` lista o dropdown de empresa e recebe 403 em `/api/clients` | Fechado — §4 |
| `D-16`: turma concluída sem matrícula aprovada cai em `concluded_without_issuance`, rótulo es-CL na tela, `fully_issued` não a conta, soma dos baldes = total do funil | Fechado — §5 |
| `D-09`: `PUT` sem principal → 422 localizado; `DELETE` do principal → 204 com promoção no `GET` seguinte | Fechado — §6 |
| Suíte backend verde (`main` mede 1175/5) | **1189 passed / 5 skipped** — §1 |
| Pint nos arquivos tocados | `{"tool":"pint","result":"passed"}` — §2 |
| `generated.ts` commitado, sem diff residual | Vazio — §2 |
| `pnpm lint` 0, `pnpm build`/`pnpm test` verdes | §2 |

---

*Medido por Claude, execução `subagent-driven-development` via `/executar-bloco`. Nenhuma decisão
de domínio nova nesta Task — só leitura da API real, da tela, e restauração do banco de dev.*
