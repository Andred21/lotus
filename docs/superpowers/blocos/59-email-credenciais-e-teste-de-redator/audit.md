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
