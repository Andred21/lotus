# BD-8 · Rastro, unicidade e gate no eixo de peso legal — desenho

> Spec do bloco `rastro-unicidade-e-gates`, aprovada pelo João em 2026-08-12, por seções
> (§1+§2, depois §3+§4).
> Origem: `docs/superpowers/backlog.md` (BD-8) — achados 1, 2 e 3 da revisão de arquitetura do
> backend de 2026-08-12, lente única (Claude), com as decisões do grilling do mesmo dia já fechadas.
> O relatório daquela revisão **não é versionado** (vive em `/tmp`); a evidência que importa está
> transcrita aqui e no backlog.

## 1. Problema

Os três achados atacam a mesma superfície — **quem pode assinar um certificado** — e por isso andam
juntos. Toda medição abaixo foi reconferida no código nesta sessão, não herdada do agente que
produziu o relatório.

### 1.1 Escrita de pivot sem rastro

`grep -rnE '->(sync|syncWithoutDetaching|attach|detach|toggle|updateExistingPivot)\(' app/` devolve
**exatamente cinco** linhas, e nenhuma delas audita:

| Arquivo | Linha | Pivot |
|---|---|---|
| `Operation/Actions/DesignateRedatorAction.php` | 20 | `turma_redator` |
| `Operation/Actions/RemoveRedatorAction.php` | 13 | `turma_redator` |
| `Catalog/Http/Controllers/CourseRedatorController.php` | 18 | `course_redator` |
| `Identity/Actions/CreateRedatorAction.php` | 61 | `course_redator` |
| `Identity/Actions/UpdateRedatorAction.php` | 66 | `course_redator` |

`grep -rn auditSync app/` → **zero**. Os métodos existem no pacote
(`vendor/owen-it/laravel-auditing/src/Auditable.php:683,709,747,789`).

As 14 asserções sobre `audits` em `tests/` cobrem 6 `auditable_type` (`client_address`,
`client_contact`, `course_certificate_template`, `course_module`, `file`, `user`) e **dois** eventos
(`deleted` 8×, `updated` 3×). Zero asserção de `sync`/`attach`/`detach`, zero sobre `turma` ou
`redator`. O rastro dos dois pivots não é fraco: não existe.

`docs/der-fisico.md:49` **afirma o contrário** — "a designação usa `auditSync`". Doc e código
divergem hoje; este bloco resolve pelo lado do código.

Os dois pivots são portas de emissão: `turma_redator` é lido pela porta 6 do
`CertificateEligibility.php:118`, e `course_redator` é a habilitação da RN-09 que decide quem pode
ser designado.

### 1.2 `course_certificate_templates` sem unicidade

`database/migrations/2026_07_08_172639_courses.php:25` é `unsignedInteger('version')` cru. É o
**único** par sequência-por-pai do schema sem índice: `(budget_id, seq_in_budget)`,
`(turma_id, student_id)`, `(turma_id, redator_id)` e `(course_id, redator_id)` têm o seu.

`CertificateTemplateData.php:20` é `#[Required] public int $version`, sem `rules()`: o número é
input do cliente nos três caminhos de escrita.

Com empate, `CertificateTemplateResolver.php:39-44` (`orderBy('version')->get()->keyBy('course_id')`)
escolhe **pela ordem que o banco devolver** — e esse template decide `valido_ate`
(`IssueCertificateAction:36-38`) e a cidade de emissão (`CertificateTemplateResolver:55-64`).

### 1.3 Gate de turma concluída em cinco grafias

`Turma::assertAcademicallyWritable()` (`Turma.php:113`) existe e é chamado por três caminhos.
Outros quatro escrevem a condição à mão, com **quatro mensagens diferentes**, três delas em PT-BR
num app es-CL. E quatro caminhos não perguntam nada:

- **Usam o método:** `StoreTurmaDocumentAction:22`, `DeleteTurmaDocumentAction:17`,
  `RecordEnrollmentResultAction:14`.
- **Escrevem à mão:** `EnrollStudentAction:24`, `ImportStudentsAction:29`,
  `RemoveEnrollmentAction:13`, `ConcludeTurmaAction:23`.
- **Sem gate:** `UpdateTurmaAction`, `DesignateRedatorAction`, `RemoveRedatorAction`,
  `DeleteTurmaAction`.

Os quatro sem gate são o furo com consequência medida: `UpdateTurmaAction:16-21` grava
`local_aplicacao`, primeira fonte da cidade do certificado; `DesignateRedatorAction` escreve o pivot
que a porta 6 lê; e o `DeleteTurmaAction.php:8-9` **se autodenuncia** no docblock —
"Home para futuras guardas do 6d (blindagem pós-conclusão RN-15) — hoje sem gate".

## 2. Decisões

As D1–D8 vêm do grilling de 2026-08-12 e **não se reabrem**. As D9–D16 nasceram neste
brainstorming.

### D1 — `auditSync` nos cinco call-sites, `course_redator` incluído

Habilitação é porta de emissão pela RN-09: quem pode ser designado decide quem assina. Auditar só
`turma_redator` deixaria metade da porta no escuro.

### D2 — Sem backfill

O rastro começa no deploy. Audit sintética inventaria `user_id` e data que ninguém executou — é
falsificar evidência em tabela de peso legal.

### D3 — A guarda estática entra no mesmo bloco

Correção sem catraca volta na primeira Action nova. A guarda é o que transforma a decisão em lei.

### D4 — `version` deixa de ser input

Derivada por `MAX(version)+1` sob `lockForUpdate`, na forma que o ADR-17 já provou em
`seq_in_budget`. Custo de contrato medido como **zero**: `grep version frontend/src` não devolve
nada e `templates` já fica fora do payload da tela de curso (`useCourseForm.ts:13-14`).

### D5 — `unique(course_id, version)` cru, sem `deleted_at` na chave

Número de versão não se reaproveita depois de arquivar — mesmo argumento do ADR-17. Banco de dev
conferido em 2026-08-12: 1 template, zero duplicatas; a migration sobe limpa.

### D6 — `UpdateTurmaAction` fecha total depois de concluída

As quatro colunas (`modalidade`, `local_aplicacao`, `start_date`, `end_date`).

**A pergunta que o backlog deixou aberta foi respondida pelo João neste brainstorming: não se abre
caminho de correção novo.** Correção rara segue o caminho que a conclusão errada já segue —
suporte, com o rastro que a auditoria de cada escrita deixa. O precedente é do próprio domínio:
`ConcludeTurmaAction:12-14` declara a conclusão TERMINAL, "não existe caminho de reversão". E o
certificado emitido **congela** `start_date`/`end_date`/`modalidade`
(`CertificateSnapshotBuilder:64-68`), então editar depois não corrige documento nenhum: só cria
divergência entre o papel e o registro.

### D7 — `RemoveRedatorAction` também fecha

Turma concluída com certificado emitido tem o redator no snapshot; remover depois cria contradição
entre documento e registro.

### D8 — Mensagem única

As quatro mensagens inline morrem e sobra a do `assertAcademicallyWritable()`. O `detail` do
RFC 7807 muda em 4 telas — consequência aceita.

### D9 — `PUT /api/templates/{id}` edita in-place; `version` é imutável

Decisão do João. O PUT segue editando a mesma linha (`layout_config`, `validity_months`) e o
`version` que venha no payload é **ignorado**, exatamente como o `sort_order` de módulo já é
(`UpdateCourseAction:42-43`). O número nasce no create e nunca muda.

Descartado: PUT arquivar a linha e criar a próxima versão (versionamento de verdade). Muda o
contrato do endpoint — passaria a devolver `id` novo — e gera linha por salvada de layout, sem
demanda medida.

### D10 — Escritor único: Action nova, e `version` fora do `$fillable`

Decisão do João. `CreateCertificateTemplateAction` é o único lugar que grava o número; os três
chamadores passam por ela. `version` sai do `$fillable` do model (e **fica** no `$auditInclude`), de
modo que `create(['version' => 2])` de qualquer outro ponto simplesmente não grava o número: o
bypass morre no model, não na convenção.

É o precedente literal do `created_at` de `LoginLog` (bloco `last-login`): "a data do acesso não se
forja por mass assignment". Aqui, o número de versão de um documento legal também não.

Descartados: só um service `nextVersionFor` com `version` seguindo fillable (o quarto sítio de
amanhã volta a mandar o número); e evento `creating` no model — locality máxima, mas a trava rodaria
fora de transação no caminho do controller e viraria **no-op silencioso** em SQLite, cicatriz que o
repositório já registra em `Client.php:107`.

### D11 — `nextVersionFor` conta os arquivados (`withTrashed`)

Não é detalhe de implementação, é o que faz a D5 funcionar: `UpdateCourseAction:36` soft-deleta
todos os templates e recria. Sem os arquivados na conta, o `MAX` voltaria a 1 e o `unique` cru
recusaria a segunda salvada. Forma literal do `CreateQuoteAction:21-25`.

### D12 — Sync que não muda nada não grava audit

Decisão do João. Medido: `Auditable.php:831-840` zera os dois lados quando o diff é vazio e **ainda
dispara** o `AuditCustom`, e `config/audit.php:104` tem `empty_values => true`. Como
`UpdateRedatorAction:66` roda `courses()->sync` em **toda** edição de redator, a tabela `audits`
ganharia uma linha de evento `sync` com `old_values`/`new_values` vazios por salvada sem mudança.

É o mesmo argumento que matou o audit por login no bloco anterior, numa tabela cuja retenção segue
aberta (P-02/P-30). O helper compara antes e só chama o pacote quando há diferença.

Descartados: `auditSync` direto aceitando o ruído; e curto-circuito só na designação, que deixaria
os dois `courses()->sync` gravando linha vazia a cada edição de cadastro.

### D13 — A audit cai no model que o usuário tocou

`course_redator` passa a ser auditado por **dois** `auditable_type`: `course` quando a habilitação
é editada pela tela de curso, `redator` quando é pela ficha do redator. Não se unifica de propósito
— a audit registra o ato de quem agiu, e forçar tudo pelo lado do curso mentiria sobre qual tela foi
usada. Consequência declarada: investigar "quem habilitou este redator" exige ler os dois lados.

### D14 — O gate mantém nome e mensagem verbatim

`assertAcademicallyWritable()` e o texto
`'La clase ya fue concluida: el registro académico está bloqueado (RN-15).'` ficam **byte a byte**
como estão. Dois testes afirmam o texto literal (`EnrollmentResultTest:150-151`,
`IssueCertificateTest:107`) e renomear seria churn sem ganho. O que muda é o **docblock**: hoje
promete "todo caminho de escrita acadêmica" e passa a valer para toda escrita na turma e nos filhos
dela.

Consequência declarada e medida: `ConcludeTurmaAction` troca a chave de erro `status` por `turma`.
Nenhum teste afirma `errors.status` para turma, e `FormErrorSummary.tsx:62-67` renderiza **qualquer**
chave que não tenha input mapeado na tela — a mensagem continua visível. As três mensagens PT-BR de
matrícula viram o es-CL da RN-15: o app é chileno, então é correção, não regressão.

### D15 — `DeleteTurmaAction` entra no gate

Decisão do João, ampliando o achado. Arquivar turma concluída com certificado emitido é a mesma
contradição que fechou a D7 — o documento aponta para um registro escondido. O próprio docblock do
arquivo já reservava o lugar.

### D16 — Sem sonda de concorrência MySQL, declarado e não silenciado

O `ProbesMysqlConcurrency` existe e o `CertificateNumberTest:45` o usa, mas aqui o `unique` é a
defesa de **integridade**: sem lock, a corrida vira 500, não duplicata. O `seq_in_budget` — mesmo
padrão, mesmo ADR-17 — também não tem sonda. Fica fora, e este parágrafo é o registro de que foi
escolha, não esquecimento.

## 3. As peças

### 3.1 `App\Shared\Audit\PivotAudit`

Namespace `Audit/` nasce aqui; `app/Shared/` já tem 11 irmãos (`Casts`, `Concerns`, `Data`,
`Exceptions`, `Files`, `Http`, `Office`, `Pdf`, `Rules`, `Support`, `Validation`).

```php
PivotAudit::sync(Model&Auditable $model, string $relation, array $ids): void
PivotAudit::syncWithoutDetaching(Model&Auditable $model, string $relation, array $ids): void
PivotAudit::detach(Model&Auditable $model, string $relation, int|array $ids): void
```

Cada método lê o conjunto atual da relação, compara com o desejado e só então chama
`auditSync`/`auditSyncWithoutDetaching`/`auditDetach` do pacote. Sem diferença, retorna sem escrever
(D12). O tipo é a interseção `Model&Auditable` — quem não implementa o contrato do pacote não
compila.

**Um fato do pacote que vale registrar, porque contraria a intuição herdada do bloco anterior:** a
armadilha do `$auditInclude` **não** se aplica a pivot. `Auditable.php:262` desvia para
`getCustomEventAttributes()` quando `isCustomEvent`, então o filtro de atributos não zera o diff da
relação. O `$auditInclude` de `Turma`, `Course` e `Redator` fica como está.

### 3.2 Os cinco call-sites

| Arquivo | Hoje | Vira | `auditable_type` |
|---|---|---|---|
| `DesignateRedatorAction:20` | `$turma->redatores()->syncWithoutDetaching([$id])` | `PivotAudit::syncWithoutDetaching($turma, 'redatores', [$id])` | `turma` |
| `RemoveRedatorAction:13` | `$turma->redatores()->detach($id)` | `PivotAudit::detach($turma, 'redatores', $id)` | `turma` |
| `CourseRedatorController:18` | `$course->redatores()->sync($ids)` | `PivotAudit::sync($course, 'redatores', $ids)` | `course` |
| `CreateRedatorAction:61` | `$redator->courses()->sync($ids)` | `PivotAudit::sync($redator, 'courses', $ids)` | `redator` |
| `UpdateRedatorAction:66` | `$redator->courses()->sync($ids)` | `PivotAudit::sync($redator, 'courses', $ids)` | `redator` |

Os dois de `Identity` seguem **dentro** da transação que já existe nas duas Actions.

### 3.3 A guarda estática

Terceiro caso no `tests/Feature/Shared/PersistenceLawsTest.php`, no molde dos dois que já estão lá:
`ScansPhpSource`, comentários strippados por `token_get_all`, varredura de `app/` **inteiro** — a
lei não abre exceção para `Shared/`, e foi assim que a §5.1 e a §5.2 foram escritas.

Reprova `->sync(`, `->syncWithoutDetaching(`, `->attach(`, `->detach(`, `->toggle(` e
`->updateExistingPivot(`. Allowlist de **um** arquivo: `app/Shared/Audit/PivotAudit.php`, que é onde
as chamadas cruas passam a ser legítimas.

A guarda **nasce verde** depois das cinco correções — as cinco linhas da §1.1 são hoje as únicas
ocorrências em `app/`. Como toda guarda deste repositório, ela não corrige nada: impede a próxima
violação de entrar sem ninguém ver.

### 3.4 Schema

Migration nova, `database/migrations/2026_08_12_000002_add_unique_to_course_certificate_templates.php`
(o `000001` do mesmo dia é a `login_logs`):

```php
Schema::table('course_certificate_templates', function (Blueprint $table) {
    $table->unique(['course_id', 'version']);
});
```

`down()` derruba o índice pelo nome padrão
(`course_certificate_templates_course_id_version_unique`). A migration original de
`2026_07_08_172639_courses.php` **não** é editada: o banco de dev já a rodou, e reescrever migration
aplicada é o caminho para dois ambientes com schemas diferentes.

### 3.5 O caminho do `version`

**`CreateCertificateTemplateAction`** em `app/Domains/Catalog/Actions/`:

```php
public function execute(Course $course, CertificateTemplateData $data): CourseCertificateTemplate
```

Abre `DB::transaction`, deriva o número na forma literal do `CreateQuoteAction:21-25`

```php
$next = (int) CourseCertificateTemplate::withTrashed()
    ->where('course_id', $course->id)
    ->lockForUpdate()
    ->max('version') + 1;
```

e grava com `version` e `course_id` por **atribuição explícita** (não por mass assignment, que a
D10 fechou).

**Model** (`CourseCertificateTemplate.php:21-26`): `version` sai do `$fillable`; segue no
`$auditInclude`.

**DTO** (`CertificateTemplateData.php:19-20`): `#[Required] public int $version` vira
`public int|Optional $version`, espelhando o `id` da linha acima. A projeção de saída continua
trazendo o número sempre, porque ele vem do model.

**Os três chamadores:**

| Sítio | Hoje | Vira |
|---|---|---|
| `CourseTemplateController::store:19` | `certificateTemplates()->create($data->toArray())` | delega à Action |
| `CreateCourseAction:28-32` | idem, num laço | delega à Action, no laço |
| `UpdateCourseAction:35-40` | soft-delete de todos + laço de `create` | soft-delete de todos + laço delegando à Action |

**`CourseTemplateController::update:26`** segue editando in-place, com
`$data->except('id', 'version')` (D9).

**Contrato:** `generated.ts` muda uma linha — `version: number` vira `version: undefined | number` —
e é **regenerado** por `php artisan typescript:transform`, nunca editado (lei §5.3).

**Consequência aceita:** `PUT /api/courses/{id}` **com** `templates` no payload faz a versão subir a
cada salvada (v1 arquivada, v2 nova), porque o replace nested cria linhas novas. Hoje é caminho de
API, não de tela: `useCourseForm.ts:13-14` não manda `templates`.

### 3.6 O gate, em onze caminhos

| Situação | Caminhos |
|---|---|
| Já usam (não mudam) | `StoreTurmaDocumentAction:22`, `DeleteTurmaDocumentAction:17`, `RecordEnrollmentResultAction:14` |
| Escrevem à mão → adotam | `EnrollStudentAction:24`, `ImportStudentsAction:29`, `RemoveEnrollmentAction:13`, `ConcludeTurmaAction:23` |
| Sem gate → ganham | `UpdateTurmaAction`, `DesignateRedatorAction`, `RemoveRedatorAction`, `DeleteTurmaAction` |

`RemoveEnrollmentAction` chama pelo `$enrollment->turma`. No `DesignateRedatorAction` o gate vem
**antes** do `assertEligible` da idoneidade: turma concluída recusa por estado, sem avaliar o
redator.

`ImportStudentsAction` mantém o gate no topo mesmo com `EnrollStudentAction` gateando por linha —
recusar a planilha inteira de uma vez é a resposta certa, e não é o mesmo que recusar 40 linhas uma
a uma.

### 3.7 Docs tocados

- `docs/der-fisico.md:35` — a linha de `course_certificate_templates` ganha o `UNIQUE(course_id, version)`.
- `docs/der-fisico.md:49` — a afirmação sobre `auditSync` deixa de ser falsa sem precisar de edição;
  fica como está.
- `docs/adrs.md` (ADR-17) — uma linha registrando o segundo consumidor do padrão. **Não** é ADR
  nova: é o mesmo padrão aplicado de novo.

## 4. Provas (DoD comportamental)

Cada correção nasce de um teste **visto vermelho**. Nada aqui fecha por "pacote instalado" ou por
suíte verde (lei §5.8).

1. **A audit da designação existe.** Asserção sobre a linha em `audits`
   (`auditable_type` = `turma`, `auditable_id`, `event` = `sync`), **nunca** sobre
   `assertDatabaseHas('turma_redator', …)` — essa já passa hoje e não discrimina nada. Mutação que
   reprova: devolver a chamada crua ao call-site.
2. **A audit da remoção existe**, com `event` = `detach`, pelo mesmo critério.
3. **A audit da habilitação existe pelos dois lados** — um caso pelo `CourseRedatorController`
   (`auditable_type` = `course`) e um pelo `UpdateRedatorAction` (`auditable_type` = `redator`),
   que é a D13 provada em vez de prometida.
4. **No-op não grava (D12).** Designar o mesmo redator duas vezes produz **uma** linha de audit.
   Mutação que reprova: chamar `auditSyncWithoutDetaching` direto, sem a comparação do helper.
5. **A guarda estática pega uma violação real.** Nasce verde; a prova é por sonda — reintroduzir
   `->sync(` cru num arquivo de `app/` faz o caso reprovar nomeando o arquivo.
6. **O banco recusa o par duplicado.** O duplicado entra por **INSERT direto**, não pela API: pela
   API a derivação torna a duplicata inalcançável, e é esse o ponto. O caso afirma a exceção do
   banco.
7. **A derivação acerta a sequência, inclusive depois de arquivar.** Três templates seguidos pelo
   endpoint dão 1, 2 e 3; arquivando todos e criando o próximo, dá **4** — o caso que existe para
   discriminar o `withTrashed()` da D11. Mutação que reprova: tirar o `withTrashed()`, que devolve
   a sequência a 1 e estoura o `unique`.
8. **`version` do payload é ignorado.** `POST` com `version: 99` cria a versão derivada; `PUT` com
   `version: 7` devolve o template com a versão original. Mutação que reprova: devolver `version` ao
   `$fillable`.
9. **O gate recusa nos quatro caminhos novos.** Turma concluída: `PUT /api/turmas/{id}` → 422;
   `POST /api/turmas/{id}/redatores/{redator}` → 422; `DELETE /api/turmas/{id}/redatores/{redator}`
   → 422; `DELETE /api/turmas/{id}` → 422 — os quatro com a mensagem da RN-15.
10. **A ordem no `DesignateRedatorAction`.** Turma concluída **e** redator inidôneo recusa por
    estado, não por idoneidade — a asserção é sobre a mensagem, e é ela que discrimina a ordem.
11. **Os sete caminhos antigos continuam recusando**, agora com a mensagem única. Os dois testes que
    afirmam o texto literal (`EnrollmentResultTest:150-151`, `IssueCertificateTest:107`) seguem
    verdes sem edição — se precisarem de edição, o §D14 foi violado.

**E2E contra a API real** (lição 12), com sessão Sanctum por cookie + CSRF, além da suíte:

- template criado **sem** `version` → 201 com `version: 1`; o segundo → 2;
- `INSERT` direto de `(course_id, version)` repetido → recusado pelo MySQL;
- designação real gravando linha em `audits` com `new_values` **não vazio**, e a segunda designação
  **não** gravando nada;
- turma concluída recusando `PUT /api/turmas/{id}`, as duas rotas de redator e o `DELETE` da turma,
  todos `application/problem+json`;
- `typescript:transform` sem diff depois de regenerado, com o `version` opcional já no `generated.ts`.

## 5. Risco de review

**ALTO.** Três gatilhos do `/revisar-sprint` se aplicam: **schema** (índice novo), **peso legal**
(auditoria de quem assina e versão do template que decide validade e cidade) e **`generated.ts`**.
Duas lentes — Claude mais revisão independente do Codex.

Riscos próprios, os três com precedente medido neste repositório:

1. **Guarda que promete cobrir e não cobre.** É a lição literal do `PersistenceLawsTest`, cujo
   primeiro regex só pegava `->` e deixava passar a forma idiomática que a lei nomeia. A prova 5
   existe por isso, e ela é sonda, não leitura.
2. **Teste que para de discriminar.** Afirmar o pivot em vez da audit deixa o caso verde com o
   código antigo — o repositório já puniu essa classe duas vezes (A-1 e o
   `IssuableEnrollmentBuilder`). As provas 1–3 nomeiam a tabela `audits` de propósito.
3. **Derivação que regride em silêncio.** Tirar o `withTrashed()` não quebra nenhum caminho feliz:
   só quebra quando alguém arquiva e recria, que é o caminho do `UpdateCourseAction`. A prova 7
   existe inteira por causa disso.

## 6. Contexto de execução

Bloco de backend com schema → **main tree, sem worktree** (P-03). Branch
`feat/rastro-unicidade-e-gates`, criada de `18cf90a`; `state_basis_commit` é `e6c831f`, o commit que
gravou o BD-8 no backlog antes da promoção.

Roda **em paralelo** com `faixa-visivel-e-acessibilidade-dos-dialogos`, que segue `executing` na
worktree `/home/jvbat/projetos/fix-frontend` (branch `feat/dialogos-faixa-visivel-acessibilidade`).
Paralelismo autorizado explicitamente pelo João em 2026-08-12, relaxando a invariante de um
`active_work_item` só — mesma exceção declarada que valeu para `last-login`.

**P-03 não vence:** o gatilho exige dois `active_work_item` de **backend** em paralelo, e a outra
frente é frontend.

**Colisão medida:** a outra branch é frontend e este bloco não toca `frontend/src/` além do
`generated.ts` regenerado. Em doc, os dois estados voltam a conflitar em `state.md` no merge — é o
padrão conhecido, e a lição do merge de `last-login` vale aqui: resolver doc de estado por hunk
perde deleção em silêncio; medir os dois lados contra a base.

**Fora de escopo, declarado:** nenhuma tela nova; sem backfill de audit; sem sonda de concorrência
(D16); retenção de `audits` segue aberta na P-02/P-30; alunos, clientes e `SessionUserData` não
entram; o BD-9 (achados 4 e 5) é bloco separado e não se antecipa aqui.
