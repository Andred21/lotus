# Bloco 59 — rastro de auditoria

Horários em America/Santiago (UTC−3 em novembro). Nenhuma senha, token ou e-mail completo de
terceiro neste arquivo (spec §6). A troca e a limpeza de senha gravam linha em `audits` com
`old_values`/`new_values` vazios (`password` fora do `$auditInclude`) e sem autor quando vindas do
`tinker`; o rastro do que e por quê é este arquivo (spec D8).

## Fase A — ensaio local

**Quando:** 2026-11-07, 17:15–17:21. **Onde:** stack da lane 59 (offset +1: API em `:8081`, SPA em
`:5174`, Mailpit em `:8026`), banco do seed. **Contas:** 2 (redator, 1 turma: turma 1) e 5 (redator,
0 turma). **Quem:** a sessão, sozinha (local, sem efeito externo).

### Impressão digital

| Momento | Conta 2 | Conta 5 |
|---|---|---|
| H0, antes da troca (17:15) | `hash=b0297c51 sessoes=0 logins=1` | `hash=bbc4a7d3 sessoes=0 logins=0` |
| Depois da troca (17:15) | `hash=ecb3bf40 sessoes=0` | `hash=694ae0b0 sessoes=0` |
| Antes da limpeza (17:20) | `hash=ecb3bf40 sessoes=3 logins=5` | `hash=694ae0b0 sessoes=2 logins=3` |
| Depois da limpeza (17:20) | `hash=35ac8909 sessoes=0 logins=5` | `hash=6ee9e362 sessoes=0 logins=3` |

As três impressões diferem por conta, e a limpeza zerou as sessões abertas no ensaio. Login com a
senha de teste da conta 2 depois da limpeza: `POST /api/login -> 422`, `GET /api/me -> 401`.
`convites=1 resets=0` nas duas, inalterado (o seed emite um convite por redator).

### Checklist §4.3

| Item | Conta 2 (1 turma) | Conta 5 (0 turma) |
|---|---|---|
| 1. Login e menu | login 200; menu lateral: Dashboard, Operations; painel próprio do redator (`/api/dashboard/metricas` 200 por desenho: o controller monta o painel do redator) | login 200; mesmo menu |
| 2. Lista de turmas | 1 turma, a dela | "No classes yet." |
| 3. Turma própria | abas Configuration, Students, Redator, Documentation, Conclusion. Oferece: Record result (por aluno), Upload/Delete de documento, Open/Download manual. Esconde: concluir ("You do not have permission to conclude classes"). Mostra sem poder usar: Add student, Import sheet, link Budget · Quote — ticket 02 | — |
| 4. Turma alheia pela URL | — | `/operacion/turmas/1`: "The requested resource does not exist."; API 404 em `GET /api/turmas/1`, `/alunos` e `/documents` |
| 5. Módulos sem permissão | API 403 em `/api/budgets`, `/api/users`, `/api/clients`, `/api/certificates`, `/api/redatores`, `/api/courses`, `/api/turmas/pendientes-configuracion`. SPA: `/comercial`, `/personas`, `/administracion`, `/cursos` e `/comercial/presupuestos/1` mostram o cabeçalho do módulo e "You do not have permission for this action"; `/certificados` fica com o título e um cartão vazio — ticket 01 | mesmos 403 |
| 6. Logout | volta a `/login`; `/operacion` depois do logout redireciona a `/login` | idem |

Console do redator: 403 em `GET /api/turmas/pendientes-configuracion` (lista) e `GET /api/courses`
(turma), pedidos que a SPA dispara sem a permissão — ticket 02.

### Escrita (só local, D14)

| Conta | Requisição | Esperado | Obtido |
|---|---|---|---|
| 2 | `POST /api/turmas/1/conclude` | 403 | 403 |
| 2 | `POST /api/turmas/1/alunos` | 403 | 403 |
| 2 | `PUT /api/turmas/1` | 403 | 403 |
| 2 | `DELETE /api/turmas/1` | 403 | 403 |
| 5 | `POST /api/turmas/1/documents` | 404 | 404 |
| 5 | `DELETE /api/turmas/1/documents/8` | 404 | 404 |
| 5 | `PUT /api/turmas/1/alunos/1/resultado` | 404 | 404 |
| 2 | Record result pela SPA (nota 6.5, 95 %) | aceito | aceito, tabela atualizada |
| 2 | Upload "Tests / assessments" pela SPA | aceito | "Document uploaded.", `files.id=18` |

### Sonda local

`Mail::raw` pelo `tinker` da lane, com o mailer forçado ao Mailpit, para um endereço `@prismusai.com`
e um `@gmail.com`: as duas no Mailpit às 17:20. Prova só o comando; a entrega real é a Fase D.

### Defeitos

Três tickets em `tickets/`, nenhum corrigido neste bloco (spec §4.3):

- `01-rotas-de-modulo-sem-guarda-para-redator.md`
- `02-turma-do-redator-oferece-acoes-de-admin.md`
- `03-texto-de-admin-e-sobreposicao-na-lista-de-turmas.md`

Nenhuma falha de autorização: toda recusa esperada veio da API.

## Fase B — pedido de production access à AWS

**Conta:** SES `sa-east-1`, perfil `lotus`. **Quem:** o João roda toda escrita na AWS; a sessão lê
(`sesv2 get-account`). Support API indisponível (plano Basic: `SubscriptionRequiredException`).

| Quando | Fato | Readback |
|---|---|---|
| 2026-11-07 ~17:25 | `put-account-details --production-access-enabled`, `TRANSACTIONAL`, site `https://app.lotusotec.cl`, descrição em português | 17:27: `DENIED`, caso `179408306900526`, `prod=false` |
| 2026-11-07 ~18:20 | A AWS pede, em resposta automática, seis itens (URL, tipo, volume, origem dos destinatários, bounce/complaint, amostra); o João responde no caso, em inglês | 18:22: `DENIED` |
| 2026-11-08 ~14:58 | Segunda resposta no mesmo caso | `DENIED` |
| 2026-11-13 ~13:30 | O João encerra o caso para abrir outro; `put-account-details` com descrição nova em inglês e site `https://lotusotec.cl` → `ConflictException` (HTTP 409) duas vezes | conta inalterada: `DENIED`, mesmo caso, site antigo |
| 2026-11-13 ~15:35 | Caso reaberto pelo console, com a descrição nova completa e o pedido de nova revisão ou de limpeza da revisão presa | 15:36: `DENIED`, `prod=false` |

O 409 é a revisão `DENIED` presa à conta: nenhuma operação da `sesv2` a limpa, e a orientação da
AWS no aws-cli#6652 é resolver pelo suporte no console. A descrição enviada em 11-13 cobre os seis
itens pedidos; o texto fica no ledger local do bloco. Sem aprovação, a Task 5 (sondas, docs, Fase D)
não roda.

## Fase C — teste do redator em produção

**Quando:** 2026-11-13, 16:01–16:25. **Onde:** `https://app.lotusotec.cl`. **Contas:** 252 (redator,
12 turmas: 31–42) e 253 (redator, 0 turma). **Quem:** o João roda `trocar-senha` e `limpar-senha` em
terminal próprio e digita o login; a sessão conduz o checklist num Chromium visível e lê a
impressão digital.

**Trava de só leitura (D14):** antes do login, um `context.route` no navegador aborta toda
requisição que não seja `GET`/`HEAD`/`OPTIONS`, salvo `POST /api/login` e `POST /api/logout`. Provada
na própria página: `POST`, `PUT`, `PATCH` e `DELETE` bloqueados no cliente, `GET /sanctum/csrf-cookie`
204. Nenhuma requisição de escrita saiu do navegador no checklist; toda chamada à API registrada foi
`GET`.

### Impressão digital

| Momento | Conta 252 | Conta 253 |
|---|---|---|
| H0, antes da troca (2026-11-07) | `hash=15d4b19e sessoes=0 logins=0` | `hash=89a7ef4d sessoes=0 logins=0` |
| H1, depois da troca (16:01) | `hash=e722ee72 sessoes=0 logins=0` | `hash=ca2600f2 sessoes=0 logins=0` |
| H2, depois da limpeza (16:25) | `hash=1b739373 sessoes=0 logins=2` | `hash=c99e9dc8 sessoes=0 logins=1` |
| H3, conferência (16:26) | igual a H2 | igual a H2 |

As três impressões diferem por conta, a limpeza deixou zero sessão e `convites=0 resets=0` ficou
inalterado: nenhum e-mail saiu. `login_logs` da janela (sem IP): 252 às 16:04:56 e 16:06:05, 253 às
16:18:01, todos Chrome — os logins digitados pelo João (o 252 entrou duas vezes antes do checklist).

### Checklist §4.3

| Item | Conta 252 (12 turmas) | Conta 253 (0 turma) |
|---|---|---|
| 1. Login e menu | menu lateral: Painel, Operação; painel do redator (`/api/dashboard/metricas` 200) | mesmo menu |
| 2. Lista de turmas | `GET /api/turmas` 200, `total=12` (10 por página) | "Nenhuma turma ainda.", `total=0` |
| 3. Turma própria | `/operacion/turmas/31`: abas Configuração, Alunos, Redator, Documentação, Conclusão; só leitura, nenhum botão acionado | — |
| 4. Turma alheia pela URL | não aplicável: toda turma de produção é do 252 (coberto na Fase A) | `/operacion/turmas/31`: "O recurso solicitado não existe."; `GET /api/turmas/31` 404 |
| 5. Módulos sem permissão | 403 em `/api/clients`, `/api/budgets`, `/api/redatores`, `/api/users`, `/api/courses`; SPA mostra "Você não tem permissão para esta ação." em `/comercial`, `/personas`, `/administracion`, `/cursos`; `/comercial/presupuestos/1` → `GET /api/budgets/1` 404; `/certificados` só título, sem chamada à API — ticket 01 | mesmos resultados |
| 6. Logout | volta a `/login`; `/operacion` depois do logout redireciona a `/login` | idem |

Console: 403 em `GET /api/turmas/pendientes-configuracion` (lista) e `GET /api/courses` (turma),
nas duas contas — o mesmo do ensaio local, já no ticket 02. Nenhum defeito novo, nenhuma gravação
acidental, nenhuma falha de autorização.
