# Design — Pessoas · Alunos (módulo novo)

- **Work item:** `bloco-alunos-modulo`
- **Feature:** `pessoas-alunos`
- **Data:** 2026-07-27
- **Context packet:** `docs/superpowers/context-packets/bloco-alunos-modulo.md` (`status: partial`)
- **Fontes:** prints do protótipo anexados pelo João em 2026-07-27 (`PROTO`); Drive
  `tela-pessoas.md` (`1NFgZxUmCLynk8q1Rsg-3cP-973740V0V`) e `modulo-gestao-pessoas.md`
  (`1Q5cP4DE2JwGABULxEJDq-eUsXK8TA86A`); Notion `Tasks · Lotus Fase 2` slices `7.2.4`, `7.2.6–7.2.7`,
  `7.4.6–7.4.8`; código em `89a5d12`.

## 1. Problema

A aba `Alunos` de `PeoplePage` é um empty state fixo e **não existe endpoint de aluno**. O domínio tem
só `Identity/Models/Student.php`, `Identity/Models/StudentClientLog.php` e os serviços
`StudentResolver` / `StudentClientLinkService` / `StudentLookup`, todos consumidos pela matrícula.

Consequência prática: hoje o aluno só nasce pela planilha de matrícula
(`StudentResolver::resolveByRut`, chamado por `EnrollStudentAction`) e **nome digitado errado na
planilha não tem caminho de correção**. O Drive canônico diz o oposto do que o código faz — nele esta
tela é o cadastro mestre ("criar, visualizar e editar", RF-ALU-01..07).

## 2. Escopo

**Dentro:** listagem, detalhe, criação e edição de aluno; histórico de vínculo com clientes;
histórico de turmas/matrículas do aluno; a tela completa (aba, tabela, dialog) no padrão `shared/ui`
entregue em 2026-07-27.

**Fora:** importação por planilha e o `StudentResolver` (já entregues, não se tocam); troca de cliente
pela tela; remoção de aluno; certificados; qualquer alteração na RN-10, no schema de
`student_client_logs` ou no módulo Redatores.

## 3. Decisões

### D1 — O bloco expõe `index`, `show`, `store` e `update`. Sem `destroy`.

`enrollments.student_id` é `restrictOnDelete` e `Student::deleting` arrasta o `User` junto; apagar
aluno com matrícula é perda de rastro com peso legal. Não foi pedido. Vai para o backlog.

### D2 — Criação incluída, alinhada ao Drive.

A primeira leitura do João foi "leitura + edição". Ao ver que o Drive coloca o cadastro mestre nesta
tela (RF-ALU-01) e que o nascimento por planilha é o desvio, decidiu **incluir a criação**
(2026-07-27). A spec fica alinhada à fonte canônica.

### D3 — Cliente é obrigatório na criação; a edição não toca vínculo.

`CreateStudentAction` exige `client_id` e chama `StudentClientLinkService::link()`, de modo que todo
aluno nasce com `current_client_id` e com a primeira linha de `student_client_logs` — exatamente o
que a matrícula já faz. `UpdateStudentAction` altera **só** os campos do `User`; trocar aluno de
cliente continua sendo ato da matrícula. No dialog, o campo cliente fica somente-leitura em modo
edição.

`students.current_client_id` é nullable, então aluno sem vínculo é representável — mas nenhum caminho
deste bloco cria um.

### D4 — `CreateStudentAction` não delega ao `StudentResolver`.

O resolver tem semântica "existe? associa : cria", correta para a planilha e **errada** para o
cadastro manual, onde RUT já existente tem de virar 422 e não associação silenciosa. As duas Actions
reusam os mesmos serviços-fonte (`UserProvisioner` para o `User` inativo e a unicidade de RUT com
`withTrashed`; `StudentClientLinkService` para o vínculo), então a regra não duplica.

### D5 — Dois DTOs, com papéis distintos.

- `StudentData` (`#[TypeScript]`) — contrato único de entrada e saída da listagem: `id` (`Optional`),
  `name`, `rut` (`ValidRut`), `email` (obrigatório — `users.email` é NOT NULL), `phone`, `client_id`
  (obrigatório no `store`); na saída, `current_client_id`, `current_client_name` e `enrollments_count`.
- `StudentDetailData` — só saída, usada pelo `show`: os campos acima + `links: StudentClientLogData[]`
  + `turmas: StudentTurmaData[]`.

Separar evita carregar logs e matrículas de todos os alunos na listagem. Projeção read-only em classe
própria tem precedente no repo: `EnrollPreviewData`, `PendingQuoteData`, `MovedStudentData`.

### D6 — Identity projeta matrícula importando `Operation\Models\Enrollment`.

Consistente com o que já existe entre domínios (`Catalog\Models\Course` importa `Identity\Models\Redator`;
`Commercial\Models\Client` importa `Identity\Models\User`). A alternativa — endpoint de matrículas do
aluno servido por Operation — obrigaria a tela a compor duas queries sem ganho real.

### D7 — Rota `students`, não `alunos`.

Casa com o model `Student` e evita o hack `->parameters()` que `redatores` precisou (o inflector inglês
gera `redatore`). **Divergência declarada:** o Drive escreve `GET /api/alunos`. A rota de UI segue em
espanhol (`/personas`, aba `Alumnos`), conforme a rule de vocabulário.

### D8 — Permissões `identity.user.*` reusadas.

`view` para index/show, `create` para store, `update` para update, via `HasMiddleware` — mesmo desenho
do `RedatorController`, que é a outra extensão 1:1 de `User` na mesma tela. Não nasce
`identity.student.*`. Em contrapartida, a descrição em `PermissionCatalog` e as chaves `perm.*` dos 3
locales passam a citar alunos; hoje dizem só "usuários e redatores", e deixá-las como estão faria a
tela de Roles mentir sobre o alcance da permissão.

Custo aceito: quem enxerga redator passa a enxergar aluno.

### D9 — O detalhe é modal, como o protótipo.

A escolha inicial foi página própria; os prints mostraram um modal com `×` e botão `Editar` no
cabeçalho, e o Drive concorda ("modal de visualização com histórico"). Revertido em 2026-07-27. Fica
simétrico com a aba irmã (`RedatorDialog`) e não cria rota nova.

### D10 — Certificados ficam fora, nos dois lugares.

`app/Domains/Certification/` é só pasta vazia e não existe migration de `certificates` — é o Bloco 7.
Portanto **somem a coluna `CERTIFICADOS` da listagem e o card `CERTIFICADOS EMITIDOS` do detalhe**,
ambos presentes no protótipo. Card vazio foi rejeitado explicitamente: afirmar "sem certificados"
quando a verdade é "o módulo não existe" é a falha silenciosa que o D16 do bloco visual fechou, e aqui
o dado tem peso legal.

### D11 — Aba `Alumnos` passa a ser a primeira.

Como no print. Hoje `Redatores` vem primeiro.

## 4. Contrato de API

`Identity/routes.php`, dentro do grupo `auth:sanctum`:

```php
Route::apiResource('students', StudentController::class)
    ->only(['index', 'store', 'show', 'update']);
```

| Verbo | Rota | Permissão | Retorno |
|---|---|---|---|
| GET | `/api/students` | `identity.user.view` | `StudentData[]` |
| GET | `/api/students/{student}` | `identity.user.view` | `StudentDetailData` |
| POST | `/api/students` | `identity.user.create` | `StudentData` |
| PUT | `/api/students/{student}` | `identity.user.update` | `StudentData` |

Controller fino: route-model-binding na leitura, Action injetada na escrita, resposta sempre por
`fromModel`. Erro sobe ao handler global RFC 7807 — nada de `abort(422)` no controller.

`StudentTurmaData` projeta, por matrícula: identificação da turma (`quote_code`, já que turma não tem
código próprio — P-13 segue aberta), nome do curso, data e `approval_status`.

## 5. Tela

Tudo em `features/identity`; nenhum componente novo em `shared/ui`.

| Arquivo | Papel |
|---|---|
| `shared/api/studentsApi.ts` | `createCrudResource<StudentData>('students')` (ADR-18) |
| `features/identity/api/useStudentDetail.ts` | `useQuery(['students', id])` → `StudentDetailData` |
| `features/identity/hooks/useStudentsPage.ts` | `useCrudPage(studentsApi)` |
| `features/identity/hooks/useStudentForm.ts` | `useEntityForm` |
| `features/identity/components/Student/StudentsTable.tsx` | tabela + toolbar |
| `features/identity/components/Student/StudentDialog.tsx` | detalhe e form |
| `features/identity/components/PeoplePage.tsx` | ordem das abas + montagem |

**Listagem** — `useTableFilter` com `searchable` em nome e RUT, `AppCardToolbar` (busca à esquerda;
`Nuevo alumno` à direita, sob `can('identity.user.create')`), `footerCount` para a faixa
`1–3 de 3 alumnos`. Colunas: nome (`AppAvatar` de iniciais + nome + email abaixo), RUT em monospace,
cliente actual, turmas em negrito, e o olho à direita. Cliente nulo vira `— Sin cliente` esmaecido,
nunca célula em branco.

**Detalhe** — `CrudDialog` unificado view/edit/create. Em view: `DetailHeader` com avatar, nome, RUT e
`Editar`, e as `FormSection` `Datos personales`, `Vínculo con empresas` (uma linha por log, com
período e marca `Actual` no aberto) e `Historial de turmas` (`AppDataTable` com código, curso, data e
`AppTag` — verde `Aprobado`, vermelho `Reprobado`, âmbar `Pendiente`). Em create/edit: nome, RUT,
email, teléfono e cliente (somente-leitura no edit, por D3).

**Estados** — o dialog busca o detalhe por conta própria, então mostra skeleton durante o load e
`AppErrorState` na falha. Seção vazia por erro de rede é proibida (D16).

**i18n** — chaves `student.*` nos 3 locales, idênticas entre si, `es-CL` como referência de rótulo.

## 6. Riscos e lições aplicadas

- `typescript:transform` muda a forma dos tipos e quebra consumidores na hora: a task que regenera
  ajusta os consumidores **no mesmo commit**.
- Tabela em card segue `useTableFilter` + `AppCardToolbar` + `footerCount`; não reintroduzir
  `AppCardFooter` junto de tabela nem `emptyMessage` condicionado a `loading` (regra da
  `frontend-fsliced.md`, oriunda do Q-6).
- `can()` é conveniência de interface; a autorização é do middleware (ADR-07).
- O backlog chama a tabela de `student_client_links`; o schema real é `student_client_logs`
  (`StudentClientLinkService` é o nome do **serviço**). O backlog é que está errado.

## 7. Definition of done

Comportamental, provado na tela contra a API real — build verde não basta:

1. Criar aluno pela tela e confirmar, no banco, o `User` inativo `type=aluno`, o `Student` com
   `current_client_id` e **a primeira linha de `student_client_logs` com `ended_on` nulo**.
2. Repetir o cadastro com o mesmo RUT e receber 422 com a causa, não associação silenciosa.
3. Editar o nome e reabrir o detalhe já com o valor novo; confirmar que o vínculo não mudou.
4. Abrir o detalhe de um aluno vindo do `OperationDemoSeeder` e conferir vínculo atual, vínculo
   anterior com período fechado e histórico de turmas com o estado correto.
5. Derrubar a API e provar que listagem e dialog mostram erro, não vazio.
6. Chamar os 4 endpoints sem a permissão correspondente e receber 403.

## 8. Handoff de execução

- **Backend → Codex.** `paths_autorizados`: `backend/app/Domains/Identity/**`, `backend/tests/**`.
  DTOs, as duas Actions, controller, rotas, middleware, descrição do `PermissionCatalog` e os testes de
  feature. As rules do projeto valem integralmente para ele; desvio é achado de revisão, não estilo.
- **Frontend → Claude.** `typescript:transform` e consumidores, `studentsApi`, hook de detalhe,
  tabela, dialog, `PeoplePage`, i18n.
- **Revisão dupla**, por decisão do João em 2026-07-27: o backend do Codex passa por revisão do
  Claude contra as rules e o `CLAUDE.md` §5; o frontend do Claude passa por revisão independente do
  Codex.
