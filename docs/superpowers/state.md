---
schema_version: 1
active_feature: certificacao-lote-e-snapshot
active_work_item: certificacao-lote-e-snapshot
workflow_state: ready_for_closure
next_owner: claude
next_action: close_active_work_item
resume_state: null
active_spec: docs/superpowers/specs/2026-08-10-certificacao-lote-e-snapshot-design.md
active_plan: docs/superpowers/plans/2026-08-10-certificacao-lote-e-snapshot.md
context_packet: null
blocker: null
review_findings_approved: "Q-1..Q-6 (todos), aprovados pelo João em 2026-08-10"
last_completed_work_item: certificacao-frontend
state_basis_commit: d01c279
updated_at: 2026-08-10T14:30:00-03:00
---

# Estado operacional — Lotus v2

> Fonte única para descobrir a etapa atual e a próxima ação. `progress.md` registra histórico;
> `backlog.md` registra a fila. Nenhum dos dois autoriza iniciar uma fase.

## Estados válidos

| Estado | Próxima ação permitida |
|---|---|
| `idle` | escolher explicitamente um item do `backlog.md` |
| `context_required` | gerar/atualizar Context Packet com `lotus-context-packet` |
| `ready_for_planning` | executar `/planejar-bloco` para `active_work_item` |
| `planning` | continuar brainstorming/spec/plano; não implementar |
| `ready_for_execution` | executar `/executar-bloco` para `active_work_item` |
| `executing` | retomar a task pendente do plano; não replanejar |
| `ready_for_review` | solicitar code review do bloco |
| `reviewing` | tratar somente achados aprovados e repetir o review |
| `ready_for_closure` | executar `/fechar-sprint` |
| `blocked` | resolver `blocker`; depois retornar a `resume_state` |

## Invariantes

- Existe no máximo um `active_work_item`.
- `next_action` deve corresponder a `workflow_state`.
- `active_plan` é obrigatório a partir de `ready_for_execution`.
- Quando o trabalho depender de contexto externo, `context_packet` deve permanecer `null` em
  `context_required` e tornar-se obrigatório antes da transição para `ready_for_planning`.
- Mudanças de estado ocorrem somente em fronteiras duráveis e entram no mesmo commit do artefato
  que prova a transição.
- Divergência entre este arquivo, plano, spec, Git ou `progress.md` bloqueia a sessão; não escolha
  por heurística.
- O backlog nunca promove trabalho automaticamente.

## Item ativo — 2026-08-10 (`certificacao-lote-e-snapshot`)

**Item 4 do `backlog.md`, selecionado explicitamente pelo João em 2026-08-10** (`/planejar-bloco`
com o item nomeado literalmente no argumento e o estado em `idle`; o comando não promove item
sozinho). O item nasceu da **revisão de arquitetura de 2026-08-09**, com as decisões já tomadas por
ele na entrevista — a edição do `backlog.md` que criou os itens 4 e 5 estava na árvore sem commit e
entra no commit da seleção, porque é o artefato que a prova.

**Rota direta a `ready_for_planning`, sem packet, por ausência medida de fonte externa** (mesmo caso
de `profundidade-backend-b4-b7` e `profundidade-form-crud`): o item não cita Drive, Notion nem
Figma, e as fontes são o repositório mais as decisões escritas. Dispensa confirmada pelo João na
abertura.

**Uma divergência do item foi levantada e fechada antes do desenho:** o texto diz "13 decisões já
tomadas na entrevista", e o backlog escreve 6 aqui (mais 5 no item 5, total 11). **Decisão do João:
as 6 escritas são tudo** — o "13" contava a entrevista inteira, incluindo o que virou recorte e
fora-de-escopo. Nenhuma decisão perdida; a spec desenha sobre as 6 mais o que o código mediu.

**Cinco medições contra o texto do item, feitas antes de desenhar:** (1) `missingRequiredFields()`
tem exatamente 2 consumidores, ambos com a política copiada — a D4 bate com o repo; (2) **`show` não
checa snapshot hoje**, então "falha alto" é comportamento novo, não refactor, e `index` idem; (3) a
D3 muda comportamento no lote (`->first()` vira `implode(' ')`; hoje as 6 portas lançam uma mensagem
cada, então a diferença só aparece com recusa de 2+ razões); (4) `App\Shared\Validation` não existe;
(5) o Action da D1 fica **sem `DB::transaction`** de propósito — exceção declarada à regra de Action
da `backend-ddd.md`, e é o ponto do bloco.

### Brainstorming de 2026-08-10 — spec aprovada, três decisões novas

As 6 decisões da entrevista entraram sem reabertura. Só três pontos estavam abertos, e o João
fechou os três: **D7** — `missingRequiredFields()` vira privado, com `isPresentable(): bool` e
`assertPresentable(string $codigo)` adjacentes no molde `assert*`/`constrain*` do
`CertificateEligibility` (B1); **D8** — a linha corrompida **mantém o botão Ver**, que cai no estado
de erro já existente do `CertificateViewDialog` — é onde o suporte lê quais campos faltam; **D9** —
a marcação é **tag de estado** (`AppTag severity="danger"` no lugar do Vigente/Vencido), porque com
o documento corrompido o estado da linha é justamente o que não dá para afirmar.

**Consequência declarada na spec, não descoberta depois:** "corrompido" **não** vira um quinto
`CertDerivedStatus` — promovê-lo contaminaria o dropdown de filtro, os quatro contadores do rodapé e
o `CertificateViewDialog`. Filtrar por "Vigente" continua trazendo a linha corrompida cujas datas
dizem vigente. Corrupção é defeito do documento, não estado dele.

Spec: `docs/superpowers/specs/2026-08-10-certificacao-lote-e-snapshot-design.md`. Review declarado
**ALTO RISCO** (peso legal + rota pública + `generated.ts`) → duas frentes em `ready_for_review`.
Backend mais um arquivo de frontend → **main tree, sem worktree (P-03)**; zero schema, ADR/DER não
abrem.

### Plano escrito em 2026-08-10 — 7 tasks (0–6), `executor: claude`

`docs/superpowers/plans/2026-08-10-certificacao-lote-e-snapshot.md`. Branch prevista:
`refactor/certificacao-lote-e-snapshot`, a partir de `eca31e4`.

A escrita do plano achou **quatro desvios contra a spec aprovada, declarados no §Desvios** em vez de
silenciados (lição 13):

- **D-P1** — o §6 da spec descreve "uma fixture, quatro provas"; medido, **duas já são testes
  vivos** (`CertificatePdfTest.php:398,416` e `PublicCertificateTest.php:184`, ambos em 500). O
  plano cria **dois** testes (`index` marcando, `show` em 500) e trata os dois existentes como
  regressão que tem de ficar verde **sem edição** — duplicá-los seria cobertura falsa.
- **D-P2** — o guard `test_falha_inesperada_no_meio_do_lote_preserva_o_que_ja_saiu` sobrevive à
  mudança de casa **por construção, conferido e não suposto**: o dublê entra por
  `$this->instance(IssueCertificateAction::class, …)` e o Action novo recebe o
  `IssueCertificateAction` pelo construtor, do container. Por isso o arquivo de teste fica com zero
  linhas de diff, e o mutante (`DB::transaction` em volta do laço) é reprovado no endereço novo.
- **D-P3** — `App\Shared\Validation` **não cria aresta** na matriz: o `DomainDependencyTest` governa
  só `App\Domains\* → App\Domains\*`; `App\Shared\*` é transversal e já é consumido por domínios
  (precedente `App\Shared\Data\ContratanteData`, do B4).
- **D-P4** — o teste de `squash()` estende `Tests\TestCase`, não o `PHPUnit\Framework\TestCase` do
  vizinho `RutTest`: `ValidationException::withMessages()` monta um validador pela facade e precisa
  do container. Sem `RefreshDatabase` — nada toca banco.

Ordem das tasks: 0 baseline → 1 `ValidationMessages::squash()` com os dois adapters → 2
`BatchIssueCertificatesAction` → 3 gate único do snapshot → 4 `snapshot_ok` + `show` falhando alto +
docblock do D6 + `generated.ts` → 5 tag no `HistorialTable` + chave nas 3 locales → 6 gate do bloco
contra a API real.

### Execução iniciada em 2026-08-10 — `/executar-bloco`, `subagent-driven-development`

Branch `refactor/certificacao-lote-e-snapshot` a partir de `7227d04` — **não de `eca31e4`** como o
plano escreveu: `7227d04` é o próprio commit do plano, docs-only (plano + `state.md`, zero código),
e branchar antes dele deixaria o plano fora da branch que ele governa. Main tree, sem worktree
(P-03).

**Task 0** confirmou o baseline exato do plano: backend **493 passed, 1 skipped (1833 assertions)**;
frontend **13 arquivos / 47 testes**, `pnpm lint` e `pnpm build` verdes; `typescript:transform` sem
diff em `generated.ts`.

**O pré-flight do plano achou um conflito medido, decidido pelo João antes de qualquer edição
(D-E1).** O fixture do `CertificateListingTest` **não produz snapshot apresentável**: o default de
`createCertificate` é `['aluno' => ['name' => 'Juan Pérez']]`, sem a seção `curso`, e
`SnapshotCourseData::fromArray(null)` põe `name: ''` — medido no tinker,
`missingRequiredFields()` devolve `["curso.name"]`. Duas consequências contra o texto do plano: o
teste novo da Task 4 afirmaria `snapshot_ok === true` sobre um certificado que mede `false` (as duas
linhas dariam `false`, e o teste não distinguiria corrompido de são); e
`test_show_devolve_o_snapshot_persistido:84`, que passa outro snapshot igualmente sem `curso`,
viraria **500** assim que o `show` chamasse `assertPresentable()`.

**Não é uma quinta mudança de comportamento.** `show` em 500 sobre snapshot sem `curso.name` é o
item 1 da lista fechada do §5 — o fixture já era corrompido pela definição que o projeto tem hoje
(`CertificatePdfService` e `PublicCertificateData` já estouram nele; `CertificatePdfTest:43` monta a
seção `curso` justamente por isso). A listagem só nunca exercitou essas rotas. O único
`assertExactJson` do domínio é sobre `PublicCertificateData`, que não ganha campo.

**Decisão do João: reparar o fixture** — o default do `createCertificate` e o snapshot do
`test_show_devolve_o_snapshot_persistido` ganham `'curso' => ['name' => …]`. Edição **só de
fixture**: nenhuma asserção muda, os 9 testes existentes seguem provando o que provavam, e os 2
testes novos passam a isolar `aluno.name` como a única corrupção — que é a história da spec.

### Tasks 1–5 entregues — uma revisão de task por entrega

Commits, do base `7227d04`: `66e0911` (seam `ValidationMessages::squash()` com os dois adapters),
`c7fb9bf` (`BatchIssueCertificatesAction`), `8299921` (gate único do snapshot), `70c0167`
(`snapshot_ok` + `show` falhando alto + `generated.ts`) + `b2a5028` (fix do review da Task 4),
`144c857` (tag da linha corrompida no Historial + chave nas 3 locales).

**Dois mecanismos foram vistos reprovando em primeira mão, não aceitos por relatório (lição 10):**

1. **A ausência de `DB::transaction` no Action do lote.** O revisor da Task 2 foi barrado pelo
   classificador de permissão ao tentar reproduzir o mutante, e disse isso em vez de mascarar.
   Envolvi o laço do `BatchIssueCertificatesAction` num `DB::transaction` eu mesmo:
   `BatchIssueTest.php:299` reprovou com `Failed asserting that table [certificates] matches
   expected entries count of 1. Entries found: 0.` Mutante revertido, árvore limpa, verde de volta.
   O guard sobreviveu à mudança de casa com **zero linhas de diff** no arquivo de teste, que era o
   critério do refactor (D-P2 confirmado).
2. **A fonte do `snapshot_ok`.** Achado **Importante** do review da Task 4, provado pelo próprio
   revisor: com o certificado são `Revocado` e o corrompido `Emitido`, `status` era proxy
   **perfeito** de `snapshot_ok`, e o mutante `snapshot_ok: $certificate->status !==
   CertificateStatus::Emitido` — campo derivado de fonte inteiramente errada — deixava o teste **e a
   suíte inteira** verdes. É a "igualdade acidental" da `backend-ddd.md` §Testes, num campo que a
   Task 5 consome na UI. Corrigido em `b2a5028` com uma terceira linha **revogada E corrompida**, de
   modo que `Revocado` mapeia para os dois valores; mutante revisto **vermelho** (`Failed asserting
   that true is identical to false.` em `CertificateListingTest.php:145`), revertido em seguida.

**Um desvio forçado pelo schema (D-E2):** o cenário do `index` não pode ter dois `Emitido` na mesma
matrícula — `certificates_active_enrollment_unique`, sobre a coluna gerada `active_enrollment_id`,
recusa antes de a listagem responder (o primeiro RED foi `UniqueConstraintViolationException`). O
são virou `Revocado`, seguindo o precedente do próprio arquivo. Revogado produz `NULL` na coluna
gerada, e `NULL` não colide — é o que permite as duas linhas revogadas do fix acima.

### Task 6 — o gate do bloco (2026-08-10)

Executado por mim direto: é a prova do DoD do bloco, e o DoD pede comportamento contra a API real.

**Ferramentas.** Backend **498 passed, 1 skipped (1850 assertions)** — +5 testes / +17 asserções
sobre o baseline 493/1833. Frontend **13 arquivos / 47 testes**, `pnpm lint` limpo, `pnpm build`
verde. Pint `--test` **`passed`** nos **11** `.php` vivos do bloco (lista conferida antes, para o
`--test` nunca cair sem argumento — lição 9). `typescript:transform` rodado de novo: `generated.ts`
**sem diff** depois do commit da Task 4, e `git diff main...HEAD -- backend/database/` **vazio** —
zero schema, como a spec previu.

**E2e contra a API real**, `migrate:fresh --seed` no MySQL, sessão Sanctum por cookie + CSRF
(`Origin` e `Accept` obrigatórios, `XSRF-TOKEN` reextraído do jar depois do login, que o rotaciona).

1. **Portas destravadas pela própria API:** o seed fresco deixa a turma 3 com
   `emission_blocked: 'sin_plantilla'`; `PUT /api/courses/2` criando o template v1 com
   `layout_config.city = 'Santiago'` e `validity_months: 24` zerou o bloqueio (`null`). A turma é
   `online` com `local_aplicacao: null`, então a cidade do template era mesmo obrigatória. Os
   `modules` foram **omitidos** do payload de propósito — coleção nested `Optional`, ausente não
   mexe — e voltaram intactos.
2. **Emissão individual** em `enrollments/21` → **201 `LOT-2026-1000`**, `snapshot_ok: true`.
3. **Lote `[22, 21, 23, 24]`** com a falha provocada (21 já tinha vigente) → **200** com relatório
   por item: `LOT-2026-1001`/`1002`/`1003` **contíguos**, sem buraco onde o item falho ficou — a
   recusa **não consumiu número de sequência** —, e a falha **nomeada**
   (`Ya existe un certificado vigente para esta matrícula.`). `[25, 25]` → **422** problem+json, o
   `distinct` vivo.
4. **`aluno.name` corrompido direto na coluna** do certificado 2 (`UPDATE … JSON_SET`), com o resto
   do JSON conferido byte a byte como intacto. As seis chamadas:

   | Chamada | Resultado |
   |---|---|
   | `GET /api/certificates` | **200**, `snapshot_ok: false` **só** na linha corrompida |
   | `GET /api/certificates/2` (corrompido) | **500** `application/problem+json`, `detail` nomeando `LOT-2026-1001` **e o campo faltante** |
   | `GET /api/certificates/2/pdf` | **500** problem+json, mesmo `detail` |
   | `GET /api/publico/certificados/{uuid}` **sem cookie** | **500** problem+json, mesmo `detail` |
   | `GET /api/certificates/1` (são) | **200**, `snapshot_ok: true` |
   | `GET /api/certificates/1/pdf` (são) | **200 `application/pdf`** |

   Controle extra: a rota pública do certificado **são**, sem cookie, segue **200**. E a página 1 do
   PDF são foi inspecionada com `pdftoppm` — nome, RUT, cliente, curso, vigência, QR e assinatura
   todos impressos. O gate único não fechou o caminho feliz.

**O que o gate NÃO provou, sem maquiagem:** **a tag da linha corrompida não foi vista renderizada.**
O host WSL não tem browser utilizável (Playwright sem as bibliotecas de sistema, limitação herdada
de 2026-08-08). A prova aqui é o `snapshot_ok` na API real, o `pnpm build`/`pnpm lint` e a paridade
das três locales; **o checkpoint visual fica com o João.**

**Estado do banco de dev:** `migrate:fresh --seed` do gate mais as mutações do e2e (template v1 do
curso 2 com `city: Santiago`, certificados `LOT-2026-1000`…`1003`, e o `aluno.name` do
`LOT-2026-1001` **deixado corrompido de propósito** para o checkpoint visual do João encontrar a
linha marcada). Nada é fixture de código; `migrate:fresh --seed` devolve o cenário canônico.

### Três Minor abertos, dois deles decisão do João, para o review herdar

- **Minor-2 (decisão do João — o plano manda o texto).**
  `CorruptedSnapshotException.php:18` afirma "**A listagem é a exceção deliberada, e é a única.**" A
  frase é **falsa**: `store()` e `revoke()` também projetam `CertificateData` sem passar pelo gate.
  O texto está mandado **verbatim pelo plano, na linha 793**, então a contradição é do plano, não da
  implementação — não corrigi unilateralmente.
- **Minor-4 (decisão do João — escopo).** `certificatesApi.ts:68-71` / `IssuedDialog` consomem o
  certificado por um caminho que **não passa pelo `show` gateado**. Fechar isso seria uma **quinta**
  mudança de comportamento, e o §5 da spec é lista **fechada** de quatro.
- **Minor-3 (técnico, sem decisão pendente).** `CertificateData.php:49-50` acessa
  `$certificate->snapshot` duas vezes; com `withoutObjectCaching` no cast, são dois decodes do JSON
  por certificado listado.

Evidência task a task em `.superpowers/sdd/progress.md`. Review **ALTO RISCO** pela spec (peso legal
+ rota pública + `generated.ts`) → duas frentes: lente Claude com o gabarito do projeto + Codex
read-only sobre `7227d04..HEAD`.

### Review de sprint — 2026-08-10: duas frentes, 6 achados, todos aprovados e corrigidos

**ALTO RISCO** conforme a spec → lente Claude com o gabarito do projeto + `mcp__codex__codex`
read-only sobre `7227d04..HEAD`. Órfãos **zero** (`missingRequiredFields` privado com 2 chamadores
internos, `isPresentable` 1, `assertPresentable` 3, `ValidationMessages` 2, o Action do lote 1, e os
imports `Redator`/`Enrollment` do controller seguem usados pelo `store`). Leis §5 limpas. **Sem
divergência de fato entre os revisores**: o Codex viu 5 dos 6 e eu confirmei cada um no código antes
de aceitar — com o escopo do Q-3 corrigido (ele disse "`curso.name` ou `emissor.name`"; medi, e
`emissor.name` já tem quem o mate). O Q-1 nenhuma das duas lentes tinha visto antes desta rodada.

**O achado que o gate não podia ter pego (Q-1 🟡)** — `ProblemDetails::detailFor()` troca o `detail`
de **todo 500** por `'Ocorreu um erro inesperado. Tente novamente.'` quando `app.debug` é falso. A
D8 promete o contrário: a linha corrompida mantém **Ver**, o `CertificateViewDialog` imprime
`error.detail` no `AppErrorState`, "é onde o suporte lê quais campos faltam". Em produção o suporte
lia "erro inesperado" — sem código, sem campo. **Nem a suíte nem o e2e viam**, e o motivo foi
medido: `backend/.env` tem `APP_DEBUG=true` e **não existe `.env.testing`**, então os dois provaram a
D8 num caminho que a produção não percorre. Nasce `App\Shared\Exceptions\PublicDetail`, interface
marcadora para a exceção cuja mensagem foi escrita para quem lê a resposta; o default segue
mascarando e só quem declara passa. No mesmo achado, a mensagem saiu de **PT-BR** para **es-CL** —
ela agora chega à tela de um usuário chileno, e todas as recusas irmãs deste diff já estavam em
espanhol. Guarda nova com `config(['app.debug' => false])`, **vista vermelha primeiro**, com o
diff literal `+'Ocorreu um erro inesperado. Tente novamente.'`.

**Os outros cinco:**

- **Q-2 🟡** (lição 13, o Minor-2 herdado) — o docblock afirmava "**a listagem é a exceção
  deliberada, e é a única**", e `store()`/`revoke()` também projetam `CertificateData` sem gate. O
  texto vinha **verbatim do plano, linha 793**; com a aprovação do João foi corrigido, nomeando os
  dois e o motivo de ficarem fora (são eco de escrita, não apresentação do documento — quem
  apresenta é `show`, o PDF e o QR), sem virar a quinta mudança de comportamento.
- **Q-3 🟡** — a política obrigatória tem três campos e **`curso.name` não tinha quem o matasse**:
  `aluno.name` morre em 3 testes, `emissor.name` no `CertificatePdfTest:384`, e remover `curso.name`
  deixava a **suíte inteira** verde. A terceira linha do teste da listagem (a revogada **e**
  corrompida, que existe para quebrar a correlação `status`×`snapshot_ok`) passa a corromper
  `curso.name` em vez de `aluno.name` — fecha o buraco sem teste novo e sem perder o poder
  discriminante. Mutante **visto vermelho** (`Failed asserting that true is identical to false.`),
  revertido em seguida.
- **Q-4 🟢** (o Minor-3 herdado) — `CertificateData::fromModel` lia `$certificate->snapshot` duas
  vezes; com `withoutObjectCaching` no cast são dois decodes de JSON por linha de uma listagem que
  não pagina. Variável local; não reabre o bug do cache de casts, que era do Eloquent e não da
  variável.
- **Q-5 🟢** — `test_show_de_snapshot_corrompido_falha_alto` afirmava só status e content-type;
  passa a afirmar o `detail` que nomeia o certificado e o campo, que é exatamente o texto de que a
  D8 depende.
- **Q-6 🟢** — o seam `ValidationMessages::squash()` tinha unit test, a **fiação** dele no Action do
  lote não tinha nenhuma: voltar para `->first()` ficava verde. Teste novo com recusa de duas
  razões; mutante **visto vermelho** (`-'La clase no está concluida. El redactor no está designado
  en esta clase.'` / `+'La clase no está concluida.'`), revertido em seguida. Não é bug vivo — as
  seis portas emitem uma mensagem cada —, é guarda contra a regressão.

**Não viraram achado, por serem decisão consciente registrada:** o **Minor-4** (o `IssuedDialog` lê
o certificado por caminho não-gateado, porque `useIssueCertificate` semeia `detailKey` com a resposta
do POST — fechar seria a quinta mudança de comportamento); a **tag não vista renderizada**, que é
limitação declarada do gate e segue com o João; e o corrompido **não** virar um quinto
`CertDerivedStatus`, com filtro e contadores continuando a classificar a linha pelas datas —
consequência declarada na spec.

**Placar pós-correção: 500 passed, 1 skipped (1858 assertions)** — +2 testes / +8 asserções sobre os
498/1850 do gate, que eu reconferi antes de revisar em vez de herdar do relatório. Pint `passed` nos
5 arquivos novos/editados do fix. **Uma exceção honesta:** `ProblemDetails.php` reprova no Pint, e
**já reprovava antes desta edição** — conferido rodando `pint --test` sobre a versão de `HEAD`, com a
mesma lista de fixers. É dívida de estilo pré-existente num arquivo que o bloco não tinha tocado;
reformatá-lo inteiro seria ruído de diff (lição 9), então ficou. `pnpm lint`, `pnpm build` e
`pnpm test` (13 arquivos / 47 testes) verdes; `typescript:transform` **sem diff** em `generated.ts` —
nenhum DTO mudou de forma. Correções no commit `d01c279`.

## Último item fechado — 2026-08-08 (`certificacao-frontend`)

### Gate de fechamento — 2026-08-08

**O item 0 foi refeito contra a API real, não herdado do gate de execução:** as correções
Q-1..Q-9 entraram depois do e2e da Task 11 e mexeram exatamente nos caminhos do painel e do lote
(o Q-3 reapontou os testes de invariante para o `EmissionPanelQuery`; o Q-5 mudou o contrato do
batch). `migrate:fresh --seed` no MySQL — desta vez sem a negação de permissão que travou a
Task 11 —, sessão Sanctum por cookie + CSRF (lição 12: `Origin` e `Accept` obrigatórios, XSRF
reextraído do cookie jar pós-login).

**A cadeia inteira do §5 da spec, pela API:**

1. **As portas do painel destravadas uma a uma:** o seed fresco não tem template no curso 2 e o
   painel respondeu `emission_blocked: 'sin_plantilla'` com a turma 3 **visível** (o contrato
   D-P3); `POST /api/courses/2/templates` moveu o bloqueio para `plantilla_sin_ciudad` (porta 5);
   `layout_config.city = 'Santiago'` zerou (`null`). Motivo sempre calculado no servidor (D-P1) —
   o cliente nunca re-derivou porta. Os 15 alunos no painel, todos com RUT string não-nulo (Q-3).
2. **Resultado acadêmico:** `PUT /api/turmas/4/alunos/36/resultado` com `"6,9"` → **200** com a
   vírgula chilena de volta na resposta; `grades.final = []` → **422** RFC 7807 es-CL
   (`La nota final debe ser un número o un texto no vacío.`); e a turma **concluída** recusando
   com **RN-15** — o primeiro ensaio contra a turma 3 levou 422 por comportamento correto, não
   por defeito.
3. **Emissão individual** com `redator_id` (D11) → **201 `LOT-2026-1000`**, snapshot congelado
   com a razão social (`Enel Distribución`).
4. **PDF com `description` de 3.689 chars** (alongada pela própria API de curso, preservando o
   template — coleção `Optional` intocada): **200 `application/pdf`, 2 páginas, A4
   (594.96 × 841.92 pts)**; `pdftoppm` da página 1 inspecionada — descrição clampada com
   reticências visíveis, QR + assinatura (Ana Reyes) + disclaimer ancorados na página 1.
5. **Historial → Revocar → Reemitir:** listagem 200; `POST .../revoke` com motivo → **200
   revocado**; a rota pública passou a dizer `revocado` com `revoked_at` presente e
   `revocation_reason` **ausente**; reemissão no mesmo enrollment → **201 `LOT-2026-1002`**,
   uuid novo — só possível por ser revocado (D8).
6. **Batch `[26, 23, 31]`** com a falha provocada (31 já tinha vigente) → **200** com relatório
   por item: os dois emitidos com números **contíguos** `LOT-2026-1003`/`1004` (a falha não
   consumiu número — invariante §4.5) e a falha **nomeada**
   (`Ya existe un certificado vigente para esta matrícula.`); `[26, 26]` → **422** — o
   `distinct` do Q-5 vivo na API.
7. **Validação pública sem cookie, sem CSRF e sem `Origin`:** 200 para emitido e para revocado;
   **404 RFC 7807** para uuid inexistente.
8. **Manual da turma 3:** **200 `application/pdf`, 1 página, A4** — a dívida do Letter segue paga.

**Demais itens:** suíte **493 passed, 1 skipped (1833 assertions)**, idêntica ao placar declarado
· frontend **13 arquivos / 47 testes**, `pnpm lint` e `pnpm build` verdes · Pint `passed` nos
**26** `.php` vivos do bloco · `typescript:transform` **sem diff** em `generated.ts` · código
morto zero (sem `.gitkeep`/TODO novos; `/certificados` não referencia mais `ModulePlaceholder`) ·
leis §5 limpas (o único hit do grep cross-feature é docblock; zero import real).

**O que o gate NÃO provou, herdando a decisão do João:** os Steps 1 (tela real) e 5 (checkpoint
visual) seguem não executados — nenhuma tela do módulo foi vista renderizada por ninguém. O
conteúdo do QR (`frontend_url + /validar/{uuid}`) fica com a prova do gate de execução: não há
decodificador de QR no host (`zbarimg`/`cv2` ausentes) e nenhum Q tocou o Blade.

**Pendências revisadas:** a **P-15 teve o gatilho vencido e foi reescrita** — o bloco entregou o
módulo próprio e **não tocou** listagem/detalhe do aluno; a decisão de expor coluna/card lá segue
com o João (revisar 2026-09-30). Nenhuma outra venceu (P-04 reavalia 2026-08-15; P-03 sem dois
backends em paralelo), nenhuma fechou, nenhuma nasceu.

**Arquivamento:** plano → `plans/archive/2026-08-08-certificacao-frontend.md`; spec do bloco →
`specs/archive/2026-08-08-certificacao-frontend-design.md`; e a spec base
`2026-08-05-certificacao-sprint-4-design.md` **arquivada junto** — este bloco era o último
consumidor dela, fechando o arquivamento assimétrico de 2026-08-07. Entrega registrada no
`progress.md` (a de 2026-08-02/redator desceu ao `progress-archive.md` para manter dez); item 1
removido do `backlog.md` com renumeração dos seguintes, e a linha "Certificados" dos módulos
marcada entregue.

**Estado do banco de dev:** `migrate:fresh --seed` do gate + mutações do e2e (template v1 do
curso 2 com `city: Santiago`, `description` do curso 2 alongada para 3.689 chars, resultado da
matrícula 36, certificados `LOT-2026-1000`…`1004` com o 1000 revocado). Nada é fixture de código;
o cenário canônico volta com `migrate:fresh --seed`.

**Item 1 do `backlog.md`, selecionado explicitamente pelo João em 2026-08-08** (`/planejar-bloco`
com o item nomeado literalmente no argumento — "Certificação · frontend (módulo próprio)" — e o
estado em `idle`; o comando não promove item sozinho). É o que sobrou do Bloco 7 depois do D-P8:
as Tasks 9–13 do plano arquivado migraram inteiras e serão **replanejadas**, não copiadas —
certificados ganham módulo próprio na interface.

**Rota direta a `ready_for_planning`, sem regeração de packet — motivo medido, não pressa:** o
próprio item do backlog fixa o contexto obrigatório, e as quatro fontes estão disponíveis sem
varredura nova. (1) A spec `2026-08-05-certificacao-sprint-4-design.md` **segue ativa** — este
bloco é o último consumidor dela (a invariante §4.2 migrou junto). (2) Os **prints do protótipo
Figma** — a única fonte `unavailable` do packet, e gatilho de staleness declarado — entraram na
própria seleção: o João anexou 5 telas ao argumento do comando (Emisión vazia; Emisión com turma
concluída e tabela de alunos com nota/asistencia/estado acadêmico/ação Emitir + botão de lote
"Emitir todos los pendientes"; diálogo "Confirmar emisión"; diálogo "Certificado emitido" com
Descargar PDF; Historial com busca, filtro de estado e estados Vigente/Por vencer/Vencido/Revocado
com ações Ver/Revocar/Reemitir). São instrução vigente de topo de hierarquia; a spec/plano do bloco
fixa o que deles vira contrato. (3) O packet `certificacao-sprint-4.md` (`status: partial`) é
**reutilizado por ponteiro**, como o backlog manda, para não repetir a varredura de Drive/Notion.
(4) O `Libro de Control de Clases` não é espelhado no repo; o packet o registra como
`D-OFFICIAL-MANUAL` (Drive `1VE89_MEiRlY574NqPaWvB7IkdAA0zo0T`), consultável se o desenho precisar.

**Dívidas com prazo que o bloco herda (do próprio backlog):** DTOs de certificação em
`generated.ts` sem consumidor; Manual de Classe saindo em **Letter** (Blade sem `@page`); rodapé/QR
absolutos transbordando de página com `courses.description` longa.

**Toca `frontend/` e Blades de `backend/resources/views` → main tree, sem worktree (P-03).**

### Brainstorming de 2026-08-08 — decisões do João e spec aprovada

**Cinco decisões explícitas do João:** as **4 frentes num bloco** (módulo `/certificados`,
validação pública + D19, resultado acadêmico na turma, Blades herdados); **Reemitir só para
Revocado** — Vencido fica sem reemissão (o botão do protótipo colide com o índice único do D8;
renovação de vencido é capacitação nova); **"Por vencer" = 30 dias**; **lote = endpoint batch no
backend com relatório por item** (cada matrícula na própria transação); e **validação/resultado
sem print** — composição sem referência, checkpoint dele cobre.

**Nove medições moldaram o desenho antes dele existir** (destaques): `issuable` não sustenta a
tela do protótipo (só emissíveis, 3 campos) e vira `emission-panel` com todos os alunos e os DTOs
`Issuable*` mortos no mesmo commit; turma **não tem código** — o "TR-43" do protótipo não existe
no schema; `IssueCertificateData` exige `redator_id` e o protótipo omite o seletor que a D11
manda existir; o "Confirmar emisión" mostra código pré-emissão que a D9 torna impossível; e a
`frontend-fsliced.md` ainda afirma "validação QR fora da SPA", contra a D14 aprovada — a rule é
corrigida no bloco (lição 13).

Design aprovado em 8 seções em 2026-08-08. Spec:
`docs/superpowers/specs/archive/2026-08-08-certificacao-frontend-design.md`.

### Plano escrito em 2026-08-08 — 12 tasks (0–11), `executor: claude` (SDD)

`docs/superpowers/plans/archive/2026-08-08-certificacao-frontend.md`. A escrita do plano achou **quatro
desvios contra a spec aprovada, declarados no §Desvios** (lição 13): D-P1 — o motivo de bloqueio
da turma no painel é **calculado no servidor** (`emission_blocked`), porque as portas 5/6 (cidade,
redator) não são deriváveis do payload que a spec listou, e re-derivar porta no cliente é a classe
de bug que o docblock do `CertificateEligibility` documenta; D-P2 — as portas são **6, não 4** (a
spec base envelheceu); D-P3 — os 3 testes de **ocultação** do `issuable` migram de contrato: turma
não emissível agora **aparece bloqueada**, mudança deliberada; D-P4 — `problemFromBlob` não existe
(a task antiga que o extrairia migrou para cá) — o PDF reusa o padrão do `useTurmaManual` e a
extração só acontece se virar duplicação. Review de bloco declarado **alto risco** (peso legal +
rota pública + `generated.ts`) → duas frentes quando chegar em `ready_for_review`.

### Execução de 2026-08-08 — Tasks 0–10 entregues, Task 11 parada no checkpoint do João

Branch `feature/certificacao-frontend`, a partir de `3d7ee5c`. As **onze primeiras tasks estão
entregues e revisadas** (uma revisão de task por entrega, fix dispatchado para todo Critical e
Important, Minor acumulado para o review final). Placar: backend **492 passed, 1 skipped (1831
assertions)**; frontend **13 arquivos / 47 testes**, `pnpm lint` limpo, `pnpm build` verde. Pint
`passed` nos 23 `.php` vivos do bloco, `typescript:transform` **sem diff** em `generated.ts`, e os
seis greps de lei do Step 4 do gate todos limpos.

**Task 10 adotou o WIP do João em vez de reescrever.** Os cinco arquivos do resultado acadêmico já
estavam na working tree sem commit quando a task abriu; a disciplina do `/executar-bloco` manda o
working tree existente vencer, então o subagente completou o que estava lá. O commit `1023c5b` sai
assinado por ele.

**Dois defeitos de peso legal foram achados por review e vistos falhando antes do fix** (lição 10):
o relatório do lote perdia o **nome** de exatamente quem recebeu o certificado, porque `pendientes`
era derivado da turma viva e a invalidação do painel repintava por baixo do diálogo aberto
(`6c57888`); e `grades` vazio ia como `{}` em vez de `null`, gravando `[]` na coluna e escrevendo
uma mudança de nota que não houve na auditoria da matrícula (`b85b736`).

**O mutante que o plano previu para o lote não mata.** Envolver o loop do
`CertificateController::batch` num `DB::transaction` deixa os nove testes do `BatchIssueTest`
verdes — o teste de número contíguo fala de contiguidade, não de isolamento. O comentário do
controller afirma "não há transação externa" e nada guardava isso. Guarda nova em `be58466`: item
já emitido tem de sobreviver a uma falha inesperada no item seguinte; contra o mutante,
`Entries found: 0`.

**O que o gate provou sem browser:** manual em **A4, 1 página** com os 15 participantes (dívida de
Letter paga); certificado em **2 páginas A4** com `description` de 3.814 caracteres, descrição
clampada com **reticências visíveis** e QR/assinatura/disclaimer todos ancorados na página 1;
validação pública **sem cookie, sem CSRF e sem `Origin`** devolvendo 200 para emitido e para
revogado, com `revoked_at` presente e `revocation_reason` **ausente** do DTO público, e 404 para
uuid inexistente; e o QR do PDF codificando `frontend_url + /validar/{uuid}`, a rota que a Task 9
criou.

**Task 11 não fecha nesta sessão, e o motivo não é escolha:**

1. `migrate:fresh --seed`, pré-requisito do Step 1, foi **negado pelo classificador de permissão**.
   Não foi contornado. O banco de dev segue com o estado acumulado da execução.
2. O Step 1 na tela real e o Step 5 inteiro precisam de browser, e o host WSL **não tem as
   bibliotecas de sistema** dos browsers do Playwright (`libasound.so.2` ausente; firefox e webkit
   reprovam no mesmo check; não há Chrome de sistema). Instalar exige root.
3. O Step 5 sempre foi **não delegável** — é o checkpoint visual do João, escrito assim no plano.

**Duas questões para o checkpoint visual, além do roteiro do plano:** o botão **Revocar** não
aparece para o admin do seed, porque `certification.certificate.revoke` é superadmin-only no
`RolePermissionSeeder` — se a intenção era o admin revogar, é decisão de permissão, não de
frontend; e o ramo **expirado** da página pública mostra só o cabeçalho, sem curso nem aluno, o que
é leitura literal do brief mas pode não ser o que um fiscalizador precisa ver.

Evidência completa, task a task, com os Minor acumulados para o review final:
`.superpowers/sdd/progress.md`.

### Review de sprint — 2026-08-08: duas frentes, 9 achados aprovados e corrigidos

**ALTO RISCO declarado no plano** (documento de peso legal + rota pública + `generated.ts`) →
lente Claude com o gabarito do projeto + Codex read-only sobre `3d7ee5c..bbe1f39`. Da fusão saíram
**9 achados (3 🟡, 6 🟢)** — 6 vistos primeiro pelo Codex, todos verificados no código antes de
entrar — e **3 achados do Codex rejeitados com evidência** (relógio do `certStatus` no render é o
design literal do plano; DST só desloca o badge `por_vencer` ±1 dia na direção conservadora;
`generated.ts` antes dos consumidores era o agendamento do plano com zero consumidor existente).
O accent-bottom deduplicou com o item 3 do ledger — decisão de negócio já registrada, não achado
novo. Órfãos: zero, fora a face morta que virou o Q-3. O João aprovou **exatamente Q-1..Q-9**,
mantendo as rejeições.

**As correções (commits `c02f29e` backend, `3884101` frontend):**

- **Q-1 🟡** `IssuedDialog` lia nome vivo do painel mesmo com o snapshot carregado — 4ª ocorrência
  da classe vivo×congelado. Agora lê `certificate.snapshot.aluno/curso.name` e o canal de dado
  vivo morreu inteiro: props `studentName`/`courseName` e o estado `Viewing` do `EmissionPanel`
  saíram do código.
- **Q-2 🟡** `useIssueBatch` invalidava só em `onSuccess`; o 500 no meio do lote (o caminho que
  `be58466` prova existir) deixava o painel prometendo `sin_emitir` para matrícula já
  certificada. `onSettled`.
- **Q-3 🟡** A face de lista morta (`issuableTurmas` + 6 `constrain*`) saiu do
  `CertificateEligibility`, com o `enrollmentIdsComVigente` que só ela consumia. Os 3 testes de
  invariante migraram para o alvo de produção real: o que o `EmissionPanelQuery` apresenta como
  emissível (bloqueio nulo + `aprobado` + sem vigente — o espelho do `rowCertKind` do front)
  passa nas portas, e o que as portas recusam nunca aparece emissível. As cadeias reprovadas do
  setUp ganharam RUT de aluno próprio: o painel projeta toda turma concluída e
  `EmissionPanelEnrollmentData::$student_rut` é `string` não-nulo.
- **Q-4 🟢** `useHistorial` só dispara `emission-panel` com permissão de `issue` (`enabled`) — o
  usuário só-`view` não colhe mais um 403 no mount da aba.
- **Q-5 🟢** `enrollment_ids.*` ganhou `distinct` + teste novo (id duplicado → 422).
- **Q-6 🟢** Os 3 docblocks que citavam o contrato morto do `issuable` reescritos para o painel
  real (lição 13).
- **Q-7 🟢** `STATUS_SEVERITY` unificado em `lib/certStatus.ts`; chave `fieldRelator` →
  `fieldRedator` nas 3 locales e nos 2 diálogos (vocabulário do backend).
- **Q-8 🟢** `RegisterResultDialog` trava fechar durante o PUT em voo (gate do
  `ConfirmIssueDialog`), matando o `onSuccess` velho que fechava o diálogo reaberto para outra
  matrícula.
- **Q-9 🟢** Fallback do `problemFromBlob` traduzido pelo i18n (`common.unexpectedError` +
  `unexpectedErrorHint`, chave nova nas 3 locales) — era pt-BR fixo herdado do `useTurmas`, agora
  em `shared/` com 2 consumidores e usuário-alvo chileno.

**Placar pós-correção: backend 493 passed, 1 skipped (1833 assertions)** — +1 teste (+2
asserções), o do `distinct`. Frontend 13 arquivos / 47 testes, `pnpm lint` e `pnpm build` verdes.
Pint `passed` nos 7 `.php` tocados. `typescript:transform` **sem diff** em `generated.ts`.

**Decisões do João — 2026-08-08, fecham o review:** a regra proposta para o padrão
vivo×congelado (tela que exibe certificado emitido lê `certificate.snapshot`, nunca projeção
viva — 4ª ocorrência) **não se aplica, por decisão explícita dele** — `frontend-fsliced.md` fica
intocada e a proposta fica registrada aqui como decisão consciente, não como pendência. As 4
decisões de negócio fecharam todas em "ok como está": a elisão da descrição longa fica; o
penhasco dos 68 chars no nome do curso + accent-bottom fica sem guard-rail; `revoke` segue
superadmin-only; e o ramo `expired` da página pública segue só com o cabeçalho. Nada foi
deferido para `backlog.md` nem para `pendencias.md` — não há trabalho pendente nem divergência
documental nascendo aqui. O checkpoint visual do módulo segue como limitação declarada do gate,
herdada pelo fechamento.

**Fechamento do gate — 2026-08-08, decisão do João.** Ele aprovou o bloco com os Steps 1 (tela
real) e 5 (checkpoint visual) **não executados**, pelas três razões acima. Fica registrado sem
maquiagem: o bloco entra em `ready_for_review` com a prova visual pendente, e nenhuma tela deste
módulo foi vista renderizada por ninguém até aqui — a evidência é de API real, PDF inspecionado
página a página, suíte e lint. Quem fizer o review de sprint herda isso como limitação declarada,
não como item silenciosamente cumprido. O review é **alto risco** por decisão do plano (documento
de peso legal + rota pública + `generated.ts`) → duas frentes, lente Claude + Codex read-only.

## Penúltimo item fechado — 2026-08-08 (`profundidade-backend-b4-b7`)

### Gate de fechamento — 2026-08-08

**O item 0 foi refeito, não herdado.** O e2e da Task 9 provou uma árvore que deixou de existir: as
correções Q-1..Q-7 entraram depois dele e mexeram exatamente nos caminhos de listagem. O gate rodou
contra `migrate:fresh --seed` no MySQL, com sessão Sanctum por cookie + CSRF (lição 12; `Origin` e
`Accept` obrigatórios, e o `XSRF-TOKEN` reextraído do cookie jar depois do login, que o rotaciona).

**Os três itens do §Gate da spec:**

1. `PUT /api/turmas/1/alunos/1/resultado` com `grades.final = "6,9"` → **200**, e a resposta devolve
   `"final":"6,9"` — a vírgula chilena sobrevive à escrita. Com `grades.final = []` → **422** RFC
   7807 es-CL, `"La nota final debe ser un número o un texto no vacío."`
2. Emissão `LOT-2026-1000` **201** com o seam conferido em **SQL cru**, não pela projeção do model:
   `snapshot.cliente.name` = `clients.legal_name` = `Enel Distribución`, enquanto `users.name` do
   mesmo cliente é `USUARIO-EMPRESA Enel`. **Os dois textos foram diferenciados à mão antes do teste**
   — o `OperationDemoSeeder` grava `name == legal_name` de propósito, e com eles iguais o e2e passaria
   mesmo se o regresso A-1 tivesse voltado (a mesma armadilha registrada no gate da Task 9).
   `GET /api/certificates/{id}/pdf` → **200 `application/pdf`**, `pdfinfo` 2 páginas, **A4
   (594.96 × 841.92 pts)**, e a página 1 imprime `Enel Distribución`.
3. `GET /api/turmas/3/alunos` → **200**, 15 matrículas, **todas** com o aluno aninhado — o
   `EnrollmentQueryBuilder` em produção.

**Os 4 sítios do Q-1 exercitados na API real, que é o que faltou no gate anterior:**
`GET /api/turmas` **200** (4 turmas, `client_name` = razão social), `GET
/api/turmas/pendientes-configuracion` **200**, `GET /api/certificates/issuable` **200** e `GET
/api/turmas/3/manual` **200 `application/pdf`** (25.880 bytes). **O Q-4 foi provado no mesmo passe:**
`users.rut` posto em **NULL** num cliente que aparece nas duas listagens, e nenhuma delas estourou —
era exatamente o `TypeError` que o `?string` fechou.

**Demais itens:** suíte **477 passed, 1 skipped (1698 assertions)** · `pnpm lint` e `pnpm build`
verdes · Pint `passed` nos 16 `.php` do commit de correção · `typescript:transform` **sem diff** em
`generated.ts` (D-P1 segue valendo) · `git diff main...HEAD` vazio em `frontend/` e em
`backend/database/` (zero schema, como a spec previu) · leis §5 sem violação (zero `Repository`, o
único `abort()` de `app/` é o 404 pré-existente do `PublicCertificateController`).

**Triagem dos 6 Minor acumulados nas Tasks 4–8:** cinco fecharam no review — o `$rotulo` morto (Q-7),
os 5 sítios de `LISTING` (Q-3), o label `'reprovada'` (Q-5), o footgun de ordem do builder (Q-6) e o
desvio do Pint na Task 7, que era desvio documentado e não defeito. **O sexto não foi corrigido e não
virou débito:** "o comentário do teste poderia explicar melhor a ordem turma→student" é cosmético e
não faz doc nem mecanismo divergir da realidade, que é o critério do `pendencias.md`.

**Pendências revisadas:** nenhuma venceu gatilho, nenhuma fechou, nenhuma nasceu. P-04 segue com
reavaliação marcada para **2026-08-15** (§5.1 e §5.2 continuam sem mecanismo — este bloco entregou
catraca de cadeia e de eager-load, que são outra fronteira). P-03 ganha mais um bloco de backend em
main tree sem atrito, mas o gatilho dela é dois blocos de backend em paralelo, que não ocorreu.

**Estado do banco de dev:** ficou com o `migrate:fresh --seed` do gate mais as mutações do e2e
(template do curso 2, resultado da matrícula 1, certificado `LOT-2026-1000`, `users.name` do cliente 3
diferenciado e `users.rut` do cliente 1 nulo). Nada disso é fixture de código; quem precisar do
cenário canônico roda `migrate:fresh --seed` de novo.


**Item 2 do `backlog.md`, selecionado explicitamente pelo João em 2026-08-07** (`/planejar-bloco`
com o item nomeado literalmente no argumento e o estado em `idle`; o comando não promove item
sozinho). Rota direta a `ready_for_planning` **sem packet, por ausência medida de fonte externa**
(mesmo caso do bloco `profundidade-form-crud`): as fontes são o repositório e o relatório local do
review de arquitetura de 2026-08-07 — nada de Drive/Notion/Figma. O João declarou a dispensa no
próprio argumento do comando.

**Passo 0 executado antes da seleção, na mesma sessão:** a skill `improve-codebase-architecture`
não existe nesta máquina (o João a rodou fora), então a re-verificação foi manual, alegação por
alegação, contra o código real. Resultado: B1–B3 confirmados resolvidos (`CertificateEligibility`,
`Data/Snapshot/` com `schema_version`, `App\Shared\Pdf`); **B4–B7 todos ainda válidos** — B4 com 8
sítios medidos da cadeia em 3 domínios, B5 com o lazy load do `result` confirmado, B6 com `grades`
ainda `['nullable','array']` e action pass-through, B7 com setUps de 40–98 linhas em 8 arquivos
(cresceu desde o relatório). Nada novo material no backend. O merge do bloco anterior já estava
feito pelo João (PR #31); `main` local avançou por fast-forward para `9ed46cc`.

**Brainstorming de 2026-08-07 — decisões do João:** B6 fica **declarada pelo admin** (derivar
exigiria inventar regra de corte sem fonte; a leitura futura da nota do docx de evaluación é
deferred com bloco próprio, muda ADR/RN); B4 ganha **catraca da cadeia** (teste-grep, não
reflection — mini-framework rejeitado); B5 cobre **os 4 models medidos** (Enrollment, Quote,
Client, Course — nem só o bug, nem todos os models). Corte e ordem definidos por ele na abertura:
B4 → catraca → B5 → B6 → B7 → gate, um bloco. Design aprovado em 6 seções; spec em
`docs/superpowers/specs/archive/2026-08-07-profundidade-backend-b4-b7-design.md`.

**Backend-only, main tree (P-03), zero schema — ADR/DER não abrem.**

**Plano escrito em 2026-08-07 — 10 tasks (0–9), `executor: claude` (SDD).**
`docs/superpowers/plans/archive/2026-08-07-profundidade-backend-b4-b7.md`. A escrita do plano achou
**quatro desvios contra a spec aprovada, declarados no §Desvios em vez de silenciados** (lição 13):
D-P1 — `ContratanteData` não pode morar em `Commercial/Data` como a spec D2 pedia, porque a Regra A
do `DomainDependencyTest` só expõe `Models/Enums/Services`; vai para `App\Shared\Data`, a D12 mora
em `Client::contratante()` e a dependência Certification→Commercial some por mediação (Operation)
em vez de virar aresta — e `generated.ts` **não muda**. D-P2 — `AcademicResult` vai para
`Operation\Services` (mesma Regra A; precedente `IssuanceContext`), com a aresta
`Certification → Operation\Services\AcademicResult` declarada na matriz. D-P3 — os sítios da cadeia
são 10, não 8: `EnrollStudentAction:31` precisa do **model** (`Turma::contratanteClient()` nasce) e
`manual-turma.blade.php:21` está fora de `app/` (a catraca varre blades; strings de eager-load
ficam fora por serem carga, não projeção). D-P4 — o builder de cenário não tem `->jaEmitido()`:
emissão é ato do teste, não setup.

### Execução iniciada em 2026-08-07 — `/executar-bloco`, `subagent-driven-development`

Branch `refactor/profundidade-backend-b4-b7` a partir de `main` (`1474f6b`). **Task 0** confirmou o
baseline exato do plano: 457 passed, 1 skipped (1655 assertions). **Task 1** (`ContratanteData` +
`Client::contratante()`) entregue e aprovada no review de task, com um achado Importante do próprio
brief: o caminho do teste (`tests/Feature/Commercial/`, grafia inglesa) criava uma segunda pasta
para o domínio Comercial, que já tem 40+ testes em `tests/Feature/Comercial/` (grafia portuguesa).
**Decisão do João:** o teste migra para a pasta existente — `Comercial/`, não `Commercial/`. Fix
aplicado e re-review aprovado. Placar: 458 passed, 1 skipped (1658 assertions). Commits
`d926faf`…`06f869b`.

**Task 2** (seams `Turma::contratanteClient()`/`contratante()`, `Quote::contratante()`) aprovada
sem achados. Placar: 461 passed, 1 skipped (1665 assertions). Commit `55ccb1d`.

**Task 3** (migração dos 8 sítios) expôs um gap real: `Client::contratante()` exige `user->rut`
não-nulo, e ~8 arquivos de teste em `tests/Feature/Operation/` nunca setavam `rut` (só liam
`legal_name`/`client_name`) porque a decisão Q-4 (2026-08-04) deixa o trait compartilhado
`CreatesDomainRecords::makeClientWithUser` sem default de `rut` de propósito. O subagente parou
(`BLOCKED`) em vez de escolher sozinho entre nullable na VO, accessor mais leve ou default no
trait. **Decisão do João: fixtures explícitas** — os ~8 arquivos de teste passam a setar `rut` via
`$userOverrides`, mesmo padrão que Q-4 já estabelece; `ContratanteData`, `Client`, `Turma`, `Quote`
e o trait compartilhado ficam intocados. Fix aplicado, re-review aprovado, placar de volta ao
baseline exato: 461 passed, 1 skipped (1665 assertions). Commits `3f8b671`…`4f89f2f`.

**Task 4** (catraca `ContratanteSeamTest`) aprovada. O regex varre acesso a propriedade
`->budget->client` em `app/Domains/**` (comentários strippados por `token_get_all`, mesma técnica do
`DomainDependencyTest`) e em `resources/views/**` (RAW — Blade não passa pelo tokenizer do PHP puro),
com allowlist dos dois donos do seam. String de eager-load (`'quote.budget.client'`) fica fora de
propósito (D-P3): é carga de query, concern dos builders, não travessia de código. Placar: 462/1/1666.
Commit `efeda0a`.

**Task 5** (`EnrollmentQueryBuilder` + o lazy-load do `result`) aprovada com um desvio de RED
documentado e verificado duas vezes. A abordagem literal do brief (`Model::preventLazyLoading(true)` +
`putJson`) **não conseguia reproduzir o bug**: `Illuminate\Database\Eloquent\Builder::hydrate()` só
liga o flag `preventsLazyLoading` por instância quando `count($items) > 1`, e busca singular
(route-model-binding, `find`, `firstOrFail`) nunca satisfaz isso. O subagente investigou em vez de
chutar, provou no `tinker`, e passou a chamar `EnrollmentController::result()` direto contra um
`Enrollment` hidratado com 2 linhas. Conferido de forma independente por mim contra o fonte real do
vendor, e de novo pelo revisor. Placar: 463/1/1668. Commit `f10e3ee`.

**Task 6** (builders de Quote/Client/Course) aprovada, refactor puro, placar idêntico ao da Task 5.
Commit `90deba0`.

**Task 7** (`AcademicResult` + `PrintableGrade` na escrita + snapshot lendo do VO) aprovada com um
segundo desvio documentado, este imposto pelo Pint: a forma literal do brief (`$resultado =
$enrollment->academicResult();` como variável solta) deixava o `use ...\AcademicResult` sem nenhum
type-hint no arquivo, e o fixer `no_unused_imports` **removeria o import — quebrando em silêncio
justamente a aresta que o `DomainDependencyTest` precisa provar**. Resolvido extraindo um método
privado tipado `resultadoSnapshot(AcademicResult $resultado)`. O revisor reproduziu o conflito num
arquivo de sonda isolado antes de aceitar. Placar: 473/1/1690. Commit `cedb633`.

**Task 8** (`IssuableEnrollmentBuilder` + migração dos 8 setUps de Certification) aprovada, com
contagem antes/depois idêntica em cada um dos 8 arquivos. `->jaEmitido()` **não** entrou no builder
(D-P4 respeitado). Duas colisões de índice único apareceram só em `CertificateEligibilityTest`, que
materializa 7 cadeias no mesmo `setUp`: `budgets.code` (resolvido com `null` no builder, que nunca
expõe o Budget) e `users.rut` (resolvido **no arquivo consumidor**, com um helper local que anula os
RUTs das 6 cadeias reprovadas — sem expandir a interface do builder). O efeito colateral (cada
cenário reprovado deixa de compartilhar client/course/redator com o emitível) foi verificado como são
contra a ordem real de execução das portas do `CertificateEligibility`. Placar: 473/1/1690, idêntico
ao da Task 7. Commit `5787f94`.

### Task 9 — o gate (2026-08-07)

Executado por mim direto, não por subagente: é a prova do DoD do bloco inteiro, e o DoD pede
comportamento provado contra a API real, não mais uma camada de alegação reportada.

**Ferramentas.** Suíte backend **473 passed, 1 skipped (1690 assertions)**. Frontend sem regressão:
`pnpm test` 10 arquivos / 35 testes, `pnpm lint` limpo, `pnpm build` OK. Pint `passed` nos **44**
`.php` tocados do bloco, zero reescrita. `typescript:transform` rodou e `generated.ts` ficou **sem
diff** — a prova do **D-P1**: `ContratanteData` e `AcademicResult` são VOs internos e **não vazaram**
para o front.

**Mecanismos vistos reprovando (lição 10), com sondas frescas.** A catraca foi provada nos **dois**
modos de varredura, em arquivos diferentes dos da Task 4: `EnrollStudentAction.php:22` (PHP) e
`certificate.blade.php:262` (Blade). Reprovou nomeando os dois com a linha exata; sondas removidas,
árvore limpa, verde de novo. A aresta do B6 foi provada removendo a linha
`'Operation\Services\AcademicResult'` da matriz — reprova nomeando `CertificateSnapshotBuilder.php`
— e repondo.

**E2e contra a API real**, `migrate:fresh --seed` no MySQL, sessão Sanctum por cookie + CSRF
(lição 12). Duas armadilhas que valem para o próximo e2e: sem `Origin: http://localhost:5173` o
`statefulApi()` não liga a sessão e o login devolve **500 "Session store not set on request."**; e o
`XSRF-TOKEN` **rotaciona no login** (regeneração de sessão anti session-fixation), então reusar o
token do `/sanctum/csrf-cookie` depois do `POST /api/login` dá **419 "CSRF token mismatch"** — tem
que reextrair do cookie jar.

1. `PUT .../resultado` com `grades.final = "6,9"` → **200**; com `grades.final = []` → **422** RFC
   7807, `"La nota final debe ser un número o un texto no vacío."` (es-CL).
2. `GET /api/certificates/issuable` → turma listada, `client_name` = razão social.
3. `POST /api/enrollments/{id}/certificate` → **201**. **A prova viva do seam foi conferida no MySQL
   com SQL cru**, não pela projeção do model: `snapshot.cliente.name` = `clients.legal_name`
   (`Enel Distribucion Chile S.A.`), enquanto o `users.name` do mesmo cliente é `USUARIO-EMPRESA
   Enel`. **Os dois textos precisaram ser deixados diferentes à mão no fixture** — o
   `OperationDemoSeeder` grava `name == legal_name` de propósito (comentário no próprio seeder), e
   com eles iguais o e2e passaria mesmo se o regresso A-1 tivesse voltado. Nota para o próximo gate
   que tocar esse caminho: **o cenário de demo não distingue as duas colunas; quem for provar o seam
   tem que diferenciá-las antes.**
4. `GET /api/certificates/{id}/pdf` → **200 `application/pdf`**, `pdfinfo` 2 páginas, **A4**
   (594.96 x 841.92 pts). Inspeção visual da página 1: o documento **imprime a razão social**, não o
   `user.name` — o seam chega intacto ao papel com peso legal.
5. `GET /api/turmas/{id}/alunos` → **200**, 15 matrículas, todas com o aluno aninhado — o
   `EnrollmentQueryBuilder` em produção, sem lazy-load. (A rota real é `/alunos`; o brief a chamava
   de `/enrollments`.)

Placar task a task, os desvios e os **6 achados Minor** acumulados nas Tasks 4–8 ficam registrados em
`.superpowers/sdd/progress.md`, para triagem do review final whole-branch. Nenhum Minor foi corrigido
por decisão própria: o review final decide o que entra antes do merge.

### Review de sprint — 2026-08-08, 7 achados aprovados e corrigidos

**ALTO RISCO** (documento de peso legal, matriz de domínios, validação RFC 7807): duas frentes
independentes — lente Claude + `mcp__codex__codex` read-only. Suíte reconferida na abertura do
review, não aceita por relatório: 473 passed, 1 skipped (1690 assertions), idêntico ao gate.

**O Codex viu dois achados que a lente Claude não viu, e nenhum dos dois foi aceito por relatório —
os dois foram provados por MUTAÇÃO aqui, nos dois sentidos** (versão migrada verde, versão do `main`
vermelha sob o mesmo mutante). É o argumento vivo para a segunda lente em bloco de alto risco.

**Q-1 🔴 — o seam do B4 introduziu N+1 em 4 listagens.** `Client::contratante()` lê `user->rut`, e
nenhum dos sítios carregava `client.user`: `TurmaQueryBuilder`, `TurmaController::pending`,
`CertificateEligibility::issuableTurmas` e `ManualPdfService`. Medido no MySQL de dev com
`DB::listen`: 4 turmas custavam **11 queries**, sendo 4 `select * from users` — com `.user` no
eager-load, **7**. Ironia registrada: o bloco cujo B5 existe para matar lazy-load silencioso
**adicionou** quatro, e o gate provou `/alunos` sem nunca medir `/turmas`. Guarda nova:
`tests/Feature/Shared/ContratanteEagerLoadTest.php`, companheiro de runtime da catraca estática —
visto RED nos 3 cenários com a mensagem exata (`lazy load [user] on model [Client]`) antes do fix.

**Q-2 🔴 — a migração do B7 apagou o poder discriminante de dois testes de peso legal.** Mesma
causa raiz, duas ocorrências:
(A) `CertificateEligibilityTest` só exigia `errors()` não-vazio, nunca qual porta recusou. Como o
builder dá **redator próprio** a cada reprovada, a porta 6 passou a recusar todas. Mutante
(porta 1 fora do `assert()`): migrado **4 passed**, `main` **1 failed**. Corrigido com
`MENSAGEM_DA_PORTA` — a porta nomeada tem de ser a que recusou; mutante agora reprova dizendo
"A recusa não veio da porta: turma não concluída".
(B) `PublicCertificateTest` — os defaults do builder ficaram byte-idênticos ao snapshot congelado.
Mutante (rota pública do QR lendo `$certificate->course->name` vivo em vez de
`$snapshot->curso->name`): migrado **5 passed**, `main` **1 failed**. Corrigida a cadeia viva para
voltar a divergir campo a campo; o mutante agora reprova com o diff `-"Seguridad en Alta Tensión"
+"Curso Vivo"`.

**Q-3 🟡 — `LISTING` não era fonte única:** 5 sítios ainda soletravam o array (`Create/UpdateClientAction`,
`Create/UpdateCourseAction`, `CourseRedatorController`) e migraram para `loadListingData()`. O 6º
(`CertificateEligibility`, `student.user`) fechou por `withListingData()` — **chamada de método, não
import**: a Regra A do `DomainDependencyTest` não expõe `QueryBuilders`, e aqui não precisa expor.

**Q-4 🟡 — `ContratanteData::$rut` virou `?string`.** `users.rut` é nullable no schema e as cinco
projeções que leem só o `name` passaram a estourar `TypeError` com RUT ausente — provado no MySQL
em transação com rollback. `SnapshotPartyData::$rut` já era nullable, então nada foi empurrado
para a emissão.

**Q-5/Q-6/Q-7 🟢:** a chave `'matrícula reprovada'` virou `'matrícula não aprovada'` (o desvio grava
`Pendiente`; `Reprobado` segue coberto em outro teste do mesmo arquivo); o builder perdeu o método
órfão `enrollment()` (zero consumidores) e ganhou `assertSemColisaoDePorta()`, que transforma
`->turmaNaoConcluida()->turma(['status' => …])` em `LogicException` alta em vez de override
silencioso — **visto disparando** nos dois casos por sonda temporária, removida depois; e o
`$rotulo` morto saiu do `ContratanteSeamTest`.

**Padrão reincidente virou regra, não só refactor** (3ª ocorrência da mesma classe): três parágrafos
novos em `.claude/rules/backend-ddd.md` §Testes — guarda de snapshot com cadeia viva distinta,
guarda de porta múltipla asserindo qual porta recusou, e seam que lê relação nova atualizando o
eager-load no mesmo commit.

**Placar depois das correções: 477 passed, 1 skipped (1698 assertions)** — +4 testes e +8 asserções
sobre 473/1690, exatamente os testes novos (3 do eager-load + 1 do RUT ausente). Pint `passed` nos
16 `.php` tocados, zero reescrita. `typescript:transform` sem diff em `generated.ts` (D-P1 segue
valendo: `?string` num VO interno não vaza para o front). `frontend/` sem uma linha de diff.

## Antepenúltimo item fechado — 2026-08-07 (`certificacao-sprint-4`)

### Gate de fechamento — 2026-08-07

**O item 0 foi provado contra a API real, não pela suíte** (lição 12; o D-P8 partiu o item em dois e
deixou aqui a cadeia até a API pública). Sessão Sanctum por cookie → `GET /api/certificates/issuable`
(1 turma, 9 matrículas) → `POST /api/enrollments/25/certificate` **201, `LOT-2026-1004`** →
`GET .../pdf` **200 `application/pdf`, 44.570 bytes**, `pdfinfo` diz **A4 (594.96 × 841.92 pts)** →
`POST .../revoke` **200**, e o **MD5 da coluna `snapshot` é idêntico antes e depois**
(`f46b7cb2…`) → `GET /api/publico/certificados/<uuid>` **sem cookie, 200**, com o payload público e
`status: revocado`.

**As correções Q-1 a Q-4 foram provadas na mesma passada, contra o MySQL e o PDF real:** a sonda que
demonstrou o 🔴 (ler o snapshot, salvar outro campo) agora responde **`REESCREVEU? NAO`** com
`layout_config`/`orientation` intactos; o PDF traz **"El trabajador logró aprobar el curso con nota
6,4."** — a nota que o filtro `is_numeric` apagava; e corromper `aluno.name` na coluna faz a rota
pública do QR devolver **500 RFC 7807** em vez de 200 dizendo `emitido` com nome vazio.

**Achado do gate, registrado e NÃO tocado:** o certificado de uma turma cujo curso tem
`description` de **3.689 caracteres** (o seed de demo repete o parágrafo ~20×) sai em **3 páginas**,
com o rodapé/QR/assinatura transbordando para a página 2. É o Q-6 do review da Task 15 — rodapé e QR
absolutos sobre fluxo de tamanho ilimitado —, não regressão deste bloco: o certificado 2, com
descrição normal, continua em **2 páginas e 41.766 bytes**, exatamente como a Task 16 mediu. Herdado
pelo bloco de frontend, junto com o Manual de Classe em Letter.

**Demais itens do gate:** suíte 457 passed, 1 skipped (1655 assertions) · `pnpm lint` e `pnpm build`
verdes · Pint `passed` nos 16 arquivos · `typescript:transform` sem diff · matriz de domínios com as
8 arestas · 7 rotas de certificação no `route:list` · zero `abort(4xx)` fora do 404 de recurso
inexistente · alias `certificate` no morph map.

**Pendências revisadas:** P-15 e P-21 tiveram o gatilho vencido por este bloco e foram reescritas —
a P-21 agora espera **decisão do João sobre o formato do registro** do `simple-qrcode` (ADR próprio
ou nota), mesma decisão pendente do P-20. Nenhuma pendência fechou; nenhuma nasceu.

**Arquivamento assimétrico, de propósito:** o plano foi para `plans/archive/`, a **spec não** — as
Tasks 9–13 migraram inteiras para o bloco de frontend da certificação (D-P8), que é o último
consumidor dela. O item 1 do backlog não saiu: **encolheu** para o frontend que sobrou.

**Item 1 do `backlog.md`, selecionado explicitamente pelo João em 2026-08-05** (`/planejar-bloco`
com o item nomeado literalmente no argumento — "Bloco 7 · Sprint 4 · Certificação" — e o estado em
`idle`; o comando não promove item sozinho). O item já estava na fila; a edição que o **promoveu da
posição 3 para a 1** e reescreveu o corpo dele (contexto obrigatório, decisões a fechar, exigência
de packet) é do João e estava na árvore sem commit — entra neste commit, porque é o artefato que
prova a seleção.

**O id não promete o corte.** `certificacao-sprint-4` nomeia a vertical, não o que sai numa branch:
o item pede emissão, numeração, template oficial, PDF sob demanda, histórico e validação pública por
QR. O corte é decisão do brainstorming; o id é renomeável na revisão da spec, como já ocorreu duas
vezes.

**Rota `context_required`, e desta vez o próprio item a exige.** Diferente do bloco anterior (que
foi direto a `ready_for_planning` por ausência **medida** de fonte externa), aqui o backlog escreve
que os arquivos visuais e documentos de referência **devem** entrar no packet: doc canônica do Drive
sobre Certificação/Curso/Turma, tasks 8.x da Sprint 4 no Notion, prints do protótipo (emissão,
histórico, validação) e os dois documentos oficiais da Lotus — **certificado** e **Manual de
Classe** —, que fixam campos fixos × dinâmicos. Nenhuma dessas fontes é medível no repositório, e as
três decisões abertas dependem delas.

**Ponto de partida medido aqui, para o packet reconciliar e não redescobrir** (lição 13):

1. **As duas tabelas não existem** — zero migration `certificates`/`certificate_sequences`;
   `docs/der-fisico.md:73-74` as descreve como planejadas. O domínio
   `backend/app/Domains/Certification/` **existe e está vazio** (7 pastas, nenhum arquivo).
2. **O contrato público do QR já tem as duas colunas no papel, e é daí que a decisão nasce:** o DER
   dá a `certificates` **`uuid UK` e `qr_code_hash UK` ao mesmo tempo**. `hash × UUID` não é escolha
   entre desenhos rivais — é escolher qual dos dois campos previstos vira o identificador público.
3. **Template de certificado já é feature entregue, e mora em `Catalog`, não em `Certification`:**
   `CourseCertificateTemplate`, `CertificateTemplateData` e `CourseTemplateController` com 3 rotas
   (`POST courses/{course}/templates`, `PUT|DELETE templates/{template}`); o DER dá à tabela
   `version` (int) e `validity_months` (nullable). **Versionamento e vigência já têm coluna** — o
   aberto é o snapshot no ato da emissão e o mapeamento do documento oficial no `layout_config`
   (json).
4. **PDF sob demanda pelo Gotenberg já roda em produção, e o precedente é do próprio Manual de
   Classe:** `ManualPdfService` (RF-TUR-04) renderiza Blade e converte por HTTP, com docblock
   declarando "**mesmo racional do certificado RF-CER-03**" — nada materializado. ADR-12 decide o
   mecanismo; não há o que reabrir.
5. **As 3 permissões já existem** no `PermissionCatalog` (`certification.certificate.view|issue|revoke`,
   a última marcada como peso legal), a navegação já lista `/certificados` gateada por `view` e a
   rota **aponta para `ModulePlaceholder`**. RBAC e entrada de UI não nascem neste bloco; a tela,
   sim.

**Toca `backend/` com migration nova → main tree, sem worktree (P-03).**

### Packet gerado em 2026-08-05 pelo Codex — `status: blocked`

**O packet existe e está salvo** em `docs/superpowers/context-packets/certificacao-sprint-4.md`,
mas **`context_packet` segue `null` de propósito**: packet `blocked` não promove nada, e a
invariante exige packet válido antes de `ready_for_planning`. O arquivo fica como evidência da
varredura — 10 documentos do Drive por ID, 16 tasks do Notion pela base canônica
(`e64b7d57-…`, a homônima obsoleta **não** foi consultada) e 1 fonte `unavailable` — para que a
regeneração pós-decisão não repita o trabalho.

**Contrato conferido, não aceito por relatório:** markers exatos, frontmatter completo com
`plan_*`/`spec_*` em `null` (os ponteiros do estado são nulos), 8 key facts (no teto), o excesso de
artefatos externos justificado no próprio registro, a fonte Figma marcada `unavailable` com a linha
de erro (`INVALID_ARGUMENT: Invalid fileKey argument` — o Drive só tem o site publicado, sem
fileKey/node ID), e nenhum gatilho de staleness citando hash de provenance ou a transição
promotora. **Os 3 blob SHAs foram recalculados aqui com `git hash-object` e batem** — `base_commit`
`e23c913`, `state.md` `4ce96f2`, `progress.md` `1043c4e`.

**A medição local foi confirmada pelo packet** (key fact 8): migrations ausentes, `Certification`
vazio, template versionado em `Catalog`, Gotenberg existente, 3 permissões e `/certificados` ainda
`ModulePlaceholder`.

**O que o packet trouxe e o repositório não sabia:**

1. **A emissão é manual e o gate é só acadêmico** — matrícula aprovada em turma concluída; o
   financeiro não entra, o que confirma a lei §5.7 no caminho mais sensível do produto.
2. **A numeração externa é `LOT-ANO-SEQ`**, incremental e atômica por ano, com um único exemplo
   real (`LOT-2026-016`).
3. **Os campos fixos × dinâmicos dos dois documentos oficiais estão mapeados** — no certificado,
   marca OTEC/RUT/cláusulas/narrativa/temário são fixos ou versionados, e `CodCert`, datas,
   aluno/RUT, empresa/RUT, curso, horas, nota e relator são dinâmicos. **Nenhum dos três exemplares
   oficiais exibe vigência ou placeholder de QR**, o que é fato contra a leitura antiga do Drive.
4. **A divergência do QR é entre fontes externas, não entre Drive e código:** o Drive e a 8.1.9
   prescrevem `qr_code_hash`; a 8.2.1 prescreve `/validar/{uuid}`. A task **8.0.3 existe
   justamente para consolidar um contrato público único** — o packet registra e não decide, como
   deve.
5. **Uma divergência foi resolvida por hierarquia, não apagada:** o Drive antigo manda o download
   usar os **dados atuais**; a instrução vigente no backlog manda **snapshot no ato da emissão**. A
   instrução atual do João vence o snapshot antigo, e isso está na tabela.

**Os 3 fatos que bloqueiam, e por que bloqueiam de verdade:** vigência, padding/overflow da
numeração e representação de múltiplos redatores no certificado. São **regra de negócio em
documento de peso legal** — o §3 do `CLAUDE.md` e a própria SKILL mandam bloquear em vez de supor.
O `hash × UUID` **não** entra como bloqueio de packet: é decisão de desenho do João no
brainstorming, e o packet já entrega os dois lados medidos.

### Bloqueio resolvido pelo João em 2026-08-05 — três decisões de regra de negócio

Respostas explícitas do João, que são fonte canônica de topo da hierarquia (instrução vigente vence
snapshot de Drive). Elas desbloqueiam o packet; o estado volta a `context_required` para a
regeração.

**RN-CER-01 — vigência: o padrão é NÃO ter validade, e o campo existe para a exceção.** Certificado
nasce sem vencimento; `valido_ate` fica nulo por padrão. O campo permanece porque algum certificado
pode ter vigência — o que reconcilia as três leituras contraditórias das fontes: "tempo
indeterminado" é o **padrão**, `valido_ate`/`vigencia_meses` é a **exceção**, e o estado "expirado"
só existe para quem tem data. Isso também explica por que **nenhum dos três certificados oficiais
exibe vigência**: eles são o caso padrão.

**RN-CER-02 — numeração segue e passa de 3 dígitos sem tratamento especial:** depois de
`LOT-ANO-999` vem `LOT-ANO-1000`. Não há teto nem rollover a desenhar — a sequência anual
simplesmente cresce. O João acrescentou que **o código pode carregar referência à turma que o
gerou**; isso muda o formato de `codigo` (coluna `UK`, visível no documento legal) e por isso é
**decisão de desenho do brainstorming**, não fato de packet. Fica registrado que o único exemplo
real medido é `LOT-2026-016`, com 3 dígitos zero-padded.

**RN-CER-03 — um relator por certificado, escolhido pelo admin na emissão.** A operação do cliente é
**1 redator por vez**; o N:N que o Bloco 6b introduziu existe para a **troca durante o curso**, e a
auditoria guarda o histórico da troca. Quando a turma termina com mais de um redator associado e o
sistema está pronto para emitir, **o admin escolhe a assinatura** — o `RELATOR` singular do
documento oficial não é defasagem do documento, é o comportamento correto.

**Observação do João, que é restrição de escopo:** as **assinaturas não serão indexadas ainda** —
como viabilizar ainda será discutido com o cliente. O bloco deixa o caminho **preparado** para
quando as assinaturas dos redatores existirem, sem construir o armazenamento agora (lição 3: não
construir para consumidor hipotético; o que se preserva é o ponto de extensão, não a feature).

**Segue aberto para o brainstorming, e não bloqueia o packet:** o contrato público do QR
(`hash` × `UUID`, task 8.0.3) e o formato final do `codigo` com a referência de turma.

### Packet regerado em 2026-08-05 — `status: partial`, promovido

`docs/superpowers/context-packets/certificacao-sprint-4.md`, refresh do próprio packet anterior:
o registry foi **reutilizado por ID**, sem refazer a varredura ampla, e as três decisões entraram
como fonte `J-DEC` (instrução vigente do João + esta seção do `state.md`). As três linhas
`unresolved` da tabela de divergências fecharam com base na instrução vigente, sem apagar o
enunciado externo que elas contradizem.

**`partial`, não `ready` — e o motivo é uma fonte só:** o Figma segue `unavailable`, com a mesma
evidência admissível de antes (chamada feita, `INVALID_ARGUMENT: Invalid fileKey argument`; o Drive
só guarda o site publicado, sem fileKey/node ID). Pela SKILL, `partial` prossegue e a fonte ausente
vira limitação declarada do brainstorming: **as três telas terão comportamento vindo do Drive/Notion
e composição visual sem referência recuperada** — o mesmo tipo de limitação que os blocos de
2026-08-02/03 aceitaram para a prova visual, e que o checkpoint do João cobre.

**Contrato reconferido:** 8 key facts (no teto), Open questions só com o que ainda pode mudar
implementação e **nenhuma bloqueante**, restrição das assinaturas registrada em Constraints **e**
Deferred (é limite de escopo, não pergunta), e nenhum gatilho de staleness citando hash de
provenance ou a transição promotora. **Provenance recalculada aqui e batendo:** `base_commit`
`492f8f8`, `state.md` `936f35e`, `progress.md` `1043c4e`.

**Dois fatos do packet que mudam o ponto de partida do desenho, além das três RN:** a emissão aceita
**lote**, não só individual (telas 8.2/8.3), e a `8.1.5` pede **PDF → S3 → URL temporária sem
intermediário** — que casa com o transformer de URL assinada entregue no bloco anterior, e não com
um endpoint que faça streaming pela app.

### Brainstorming de 2026-08-05 — o corte, e as quatro medições que o antecederam

**Sétima ocorrência da lição 13 no projeto.** Quatro fatos do repositório contrariam doc, ADR ou
task, e todos mudaram o desenho antes de ele existir:

1. **O gate acadêmico não tem escritor em produção.** `enrollments.approval_status` nasce `pendiente`
   e **nada em `backend/app/` o escreve** — o `EnrollmentData` declara em docblock que "a escrita é
   6d", e o 6d fechou sem entregar. O único escritor é o `OperationDemoSeeder`, que registra a
   exceção no próprio docblock. Emissão gateada por `aprobado` **nunca dispararia em produção**, e o
   DoD deste projeto não aceita prova contra dado de seed.
2. **`spatie/laravel-pdf` ^2.12 e `simplesoftwareio/simple-qrcode` ^4.2 estão instalados com zero
   uso** em `app/`, `config/`, `tests/` e `resources/`. O ADR-12 manda o primeiro; o único PDF de
   produção chama o Gotenberg por `Http::attach` cru. Lição 1, agora com pacote pago em disco.
3. **A entrega do PDF diverge em três fontes:** ADR-12 ("stream direto para S3"), task 8.1.5 ("S3 →
   URL temporária sem intermediário") e o precedente real (`TurmaController::manual`, binário pela
   app).
4. **`course_certificate_templates` já existe desde 2026-07-08 e o `layout_config` não tem um único
   consumidor** — nada renderiza aquele JSON, que é exatamente onde o documento oficial se mapeia.

**Corte escolhido pelo João: fatia vertical fina** — emitir um certificado, baixar o PDF com QR,
validar publicamente e revogar, com as telas mínimas. As alternativas (backend inteiro sem tela, ou
só fundação) adiavam a única prova que importa num módulo cujo valor é o papel escaneado.

**Quatro decisões do João no desenho:** o **escritor mínimo do resultado acadêmico entra** (sem ele o
módulo é inalcançável em produção); o identificador público é **só o `uuid`**, e `qr_code_hash` não
nasce — o argumento do hash é rotacionar URL, e URL impressa em papel não rotaciona; **`codigo` puro**
`LOT-ANO-SEQ`, com a turma vivendo na relação e não dentro de uma coluna `UK` impressa para sempre;
e a **revogação entra**, porque sem ela o valor `revocado` do enum nasceria sem produtor e a tela
pública prometeria um estado inalcançável.

**Três decisões nasceram no desenho e estão na spec:** `certificates` **sem soft delete** e
`enrollment_id` **sem UK** — com UK estrito, certificado revogado por erro nunca poderia ser
reemitido, e soft delete não libera índice (lição 8), então a unicidade vira "um certificado
**vigente** por matrícula" por índice em coluna gerada, provado contra MySQL real (lição 15); a
emissão exige **template do curso** (certificado sem template aprovado é narrativa inventada); e a
**matriz de domínios abre pela primeira vez**, com 6 arestas justificadas uma a uma — o
`DomainDependencyTest` declara `'Certification' => []` de propósito, dizendo em docblock que cada
import exigiria decisão explícita.

**Duas descobertas de fronteira que mudaram onde o código mora:** a emissão **não** cabe na tela da
turma (`TurmaDetailPage` é `operation`, e chamar a API de certificação de lá quebra a lei §5.6), e o
`SessionBootstrap` precisa **descer para dentro do router** — hoje ele envolve o `AppRouter` inteiro,
então quem abre o QR pelo celular espera um `GET /api/me` que vai dar 401 antes de ver a validação.

Spec: `docs/superpowers/specs/2026-08-05-certificacao-sprint-4-design.md` — 21 decisões, 8
invariantes de comportamento e gate com item 0 próprio (o QR escaneado abrindo a validação real,
provado **sem cookie** na ponta pública). Aprovada pelo João em 2026-08-05.

### Plano escrito em 2026-08-05 — 15 tasks, `executor: misto`

`docs/superpowers/plans/archive/2026-08-05-certificacao-sprint-4.md` (arquivado no fechamento de
2026-08-07). Ordem: 0 baseline e branch · 1
escritor do resultado acadêmico · 2 schema + models + matriz de domínios · 3 numeração atômica ·
4 snapshot · 5 emissão com as 4 portas · 6 leitura/`issuable`/revogação · 7 PDF com QR · 8 rota
pública · 9 `/validar/:uuid` · 10 histórico · 11 emissão/revogação/download · 12 resultado na tela
da turma · 13 checkpoint visual do João · 14 gate.

**Atribuição do João: backend → Codex (tasks 1–8), frontend → Claude (9–12).** Tasks 0 e 14 com
Claude, 13 com o João. `paths_autorizados` do Codex fecha em `Certification/**`, os 4 arquivos de
Operation do escritor acadêmico, `AppServiceProvider`, `config/app.php`, a migration, a view, os
testes e `generated.ts` — **nada** em `frontend/src/features/**`, `frontend/src/app/**` ou `docs/`.

**A escrita do plano achou três divergências contra a spec aprovada, todas declaradas no próprio
plano em vez de silenciadas** (§Desvios):

1. **A spec não previu de onde o diálogo de emissão tira os candidatos.** O diálogo mora em
   `features/certification` (D18) e **não pode** importar `features/operation` (lei §5.6); sem
   endpoint próprio a UI quebraria a lei ou re-derivaria as 4 portas no cliente. Entra
   `GET /api/certificates/issuable`. O filtro "sem certificado vigente" roda **do lado de
   Certification** (`pluck('enrollment_id')` + `whereNotIn`), porque uma relação
   `Enrollment->certificate` seria aresta Operation → Certification, que não existe.
2. **São 7 arestas de domínio, não 6.** O §5 da spec manda o gate provar "as 6 arestas declaradas —
   nenhuma a mais", mas a porta 1 (turma concluída) exige `Operation\Enums\TurmaStatus`, que a lista
   da spec omitiu. Com 6 a execução baterá numa contradição; a matriz nasce com 7.
3. **`config/app.php` não tem `frontend_url`** (medido). O QR aponta para
   `<FRONTEND_URL>/validar/{uuid}` e ler `env()` em runtime quebra com config cacheado — vira chave
   de config, não `env()` solto.

**Placar declarado, task a task:** backend 378 → 384 → 387 → 390 → 394 → 402 → 410 → 415 → **419**;
frontend fica em **35** (o projeto só testa unitariamente hooks de `shared/`), e a Task 11 usa esse
número como sinal: extrair `problemFromBlob` para `shared/api` não pode mudar a contagem.

**Três provas que não aceitam sqlite** (lição 15): o índice único na coluna gerada (Task 2), a
sequência sob `lockForUpdate` com duas conexões (Task 3) e a unicidade na emissão (Task 5) rodam
também contra o MySQL do compose.

### Corte alterado em 2026-08-05 pelo João — o frontend vira bloco próprio (D-P8)

Decisão tomada **depois da Task 8 e antes da Task 9**, com o backend inteiro entregue e commitado
(`cfe37a0` … `cb30ba5`). Dois motivos novos, ambos externos ao repositório e nenhum deles conhecido
quando a spec foi aprovada: os **dois documentos oficiais da Lotus** entraram na sessão (o
certificado `Roles y Responsabilidades del Jefe de Faena` e o `Libro de Control de Clases`), e os
**prints do protótipo Figma** vão entrar — a fonte que o packet declarou `unavailable` e que o
brainstorming aceitou como limitação. O João registra também que **certificados tem módulo próprio
na interface**, o que a spec não modelou.

Tasks 9–13 **migram inteiras**, não são canceladas. Consequências declaradas no plano, não
escondidas: `generated.ts` fica com DTOs sem consumidor até o bloco seguinte (dívida com prazo), a
invariante §4.2 migra junto, e o item 0 do gate parte em dois — a cadeia até a API pública sem
cookie continua exigida aqui; só a ponta renderizada no navegador migra.

**Fila que o João desenhou:** (1) revisão em duas frentes do backend — feita, abaixo; (2) aproximar
os Blades dos documentos oficiais, com o Manual de Classe recebendo melhoria além da cópia; (3)
replanejar o frontend com os prints e o módulo próprio.

### Revisão em duas frentes — 2026-08-05, backend do bloco

Pedida pelo João: padronização contra as demais entidades, leis/rules, e conformidade com spec e
plano. Frente Codex (`mcp__codex__codex`, read-only) e frente Claude, independentes.

**Limpo nas duas frentes, medido aqui e não aceito por relatório:** leis §5 sem violação (zero
Repository, zero `abort(422)`, alias `certificate` no morph map, `generated.ts` gerado); rota
pública sem RUT/id/nota/motivo; PDF sem materialização; unicidade do vigente, reemissão pós-revogação
e terminalidade da revogação implementadas; suíte **426 passed + 1 skipped**, matriz com as 7
arestas, Pint verde nos 36 arquivos, `migrate:fresh --seed` no MySQL.

**O gate reprova por duas invariantes sem teste** (§4.5 auditoria com `user_id` — a emissão não tem
teste nenhum e a da revogação só conta linhas; §4.7 PDF não materializado — nenhum teste afirma).

**Achado 🔴 confirmado: o certificado imprime o nome errado da empresa.**
`CertificateSnapshotBuilder` congela `client->user->name`; a D12 pede **razão social**, que é
`clients.legal_name` — comentada `// razón social` na própria migration e usada por
`TurmaData`, `PendingQuoteData`, `StudentData` e pelo `IssuableTurmaData` **deste mesmo bloco**. O
teste não só deixa passar: ele **fixa o valor errado**, com fixture que separa de propósito
`legal_name = 'Empresa Legal SpA'` de `user.name = 'Empresa Cliente'` e assere o segundo.

**Decisão do João: corrigir o 🔴, os 🟡 e as duas lacunas do gate; os 🟢 viram débito.** Feito em
`5158b16`. Além do A-1: **A-2** (`issuable` só encapsulava a porta do template e listava turma que o
POST recusa com 422 — a regra da cidade virou `CertificateTemplateResolver::emissionCityFor`, fonte
única da Action, do `issuable` e do snapshot, que tinha a terceira cópia; a porta do redator virou
`whereHas('redatores')`), **A-3** (três `now()` numa emissão só, com o lock da sequência no meio: a
virada do ano gravava `emitido_em` de 2027 num código `LOT-2026`) e **A-4** (`RevokeCertificateData`,
porque a revogação validava por `$request->validate` enquanto todo o projeto valida em `Data`).

**Débitos registrados, não corrigidos:** `abort(404)` é o único `abort()` de `backend/app/` e o
route-model-binding `{certificate:uuid}` funcionaria; `uuid` gerado na Action e não no `booted()` do
model, como faz `User` — morde quando a emissão em lote entrar; `der-fisico.md:73` ainda descreve
`enrollment_id FK,UK` e `qr_code_hash UK`, os dois que a D3 recusou; e a corrida entre
`RecordEnrollmentResultAction` e `ConcludeTurmaAction`, que o Codex marcou 🔴 e **não é achado deste
bloco** — é a convenção pré-existente, idêntica em `StoreTurmaDocumentAction` e
`DeleteTurmaDocumentAction`. **P-15 e P-21 estão satisfeitas** e fecham no `/fechar-sprint`.

**Gate refeito e passando.** Suíte **432 passed, 1 skipped (1579 assertions)** — +6 sobre 426, um por
teste novo; frontend **35 passed** inalterado; Pint, build e lint verdes; `generated.ts` com só o
`RevokeCertificateData` a mais, no mesmo commit do Data. **Item 0 provado e2e contra a API real com
sessão Sanctum** (lição 12): resultado acadêmico gravado, `issuable` escondendo a turma online sem
cidade e mostrando-a depois do template com `city`, emissão `LOT-2026-1000/1001/1002` com `valido_ate`
do template mais recente, PDF **200 `application/pdf` de 23.831 bytes** começando em `%PDF-1.4`,
rota pública **sem cookie** devolvendo 200 sem RUT/id/nota/motivo, revogação sem motivo em 422 es-CL,
a mesma URL passando a `revocado`, `uuid` inexistente em 404 e reemissão pós-revogação. **A D12 foi
provada contra a API real, não só em teste:** com `legal_name` diferente de `user.name`, o
`LOT-2026-1001` saiu com a razão social, e o snapshot sobreviveu ao rename posterior do cliente.

Detalhe task a task e a íntegra do e2e em `.superpowers/sdd/progress.md`.

### Volta a `executing` em 2026-08-06 — Task 15, o Blade contra o documento oficial (D-P9)

**Não é reabertura por heurística: é o item 2 da fila que o próprio D-P8 escreveu** ("aproximar os
Blades dos documentos oficiais"), e o D-P8 já dizia que isso "vem antes do frontend". O que mudou em
2026-08-06 é que os templates deixaram de ser anexo de prompt e entraram no repositório —
`docs/templates/certificado.pdf`, `manual.pdf` e `manual.docx` —, então o trabalho passou a ser
executável em vez de descrito. O estado sai de `ready_for_review` porque **o review tem de ver o
Blade final**, não um Blade que já se sabe que vai mudar.

**O documento foi lido, não parafraseado.** `Read` não renderiza PDF neste ambiente (poppler-utils
ausente no host e no container `app`), então o `certificado.pdf` foi aberto por extração direta:
texto posicionado dos content streams (`x`, `y`, fonte, corpo) e as duas artes de fundo extraídas
como JPEG e vistas. É daí que sai a tabela campo-a-campo do D-P9 — inclusive os três campos que o
Blade da Task 7 não tinha de onde tirar.

**As três decisões do D-P9, e o motivo de nenhuma criar coluna:** a narrativa é `courses.description`
(coluna que existe desde 2026-07-08 e **não tinha um único consumidor**); o temário é
`course_modules` (`name` + `contents`, cuja própria migration descreve o conteúdo autoral numerado
que a página 2 imprime); e o certificado passa a ser **retrato fixo**, com
`layout_config.orientation` perdendo o único consumidor — ele era parte do "layout genérico" que o
D-P8 nomeia como o defeito, e `city` fica sendo a única chave viva do JSON.

**Restrição do João mantida:** assinaturas continuam fora — o Blade imprime nome sobre linha, que é
texto. A papelaria poligonal do original também não entra; o cabeçalho é montado com
`frontend/src/assets/LogoLight.png`, copiada para `backend/resources/images/` porque a imagem do
container `app` não carrega a árvore do frontend e o Gotenberg só recebe HTML.

**Task 15 entregue em 2026-08-06, `cbb9e09` — e provada no PDF real, não na suíte.** Suíte
**436 passed, 1 skipped (1590 assertions)**, +4 sobre 432, um por teste novo; Pint verde nos 5 `.php`
tocados; frontend não tocado (`git status` sem uma linha em `frontend/`). **E2e com sessão Sanctum**
contra `migrate:fresh --seed` no MySQL: `LOT-2026-1000/1001/1003` emitidos pela API real,
`GET /api/certificates/{id}/pdf` devolvendo `application/pdf` de ~41 KB, e **o PDF baixado foi aberto
e lido** — `pdftotext -layout` para conferir campo a campo e `pdftoppm` para ver as duas páginas.
Estão no documento, nesta ordem: `N° LOT-2026-1001` · `Emisión: 06-08-2026` · a marca ·
`CERTIFICADO DE CAPACITACIÓN` · `En Santiago a 06-08-2026, OTEC LOTUS SpA [77.510.327-2] certifica
que:` · nome · RUT do aluno · razão social · `El trabajador de la empresa RUT: 77.555.333-2,
participó en el curso:` · curso + nome técnico + horas · a narrativa · `El trabajador logró aprobar
el curso con nota 6.4.` e `Asistencia registrada: 92.50%.` (no `LOT-2026-1003`, o único com
resultado lançado) · vigência · `El N° de Registro…` · `Ana Reyes` sobre `Instructor` · QR ·
cláusula de rodapé. **Página 2 com `Temario del Curso`**, os dois módulos e os bullets de
`contents` — inclusive com o marcador `*` escrito à mão sendo removido na renderização. Certificado
sem módulos e sem descrição não imprime a página 2, e isso tem teste nomeado.

**Dois achados da execução, os dois declarados no plano em vez de silenciados:** a 8ª aresta da
matriz (`Catalog\Models\CourseModule`) — bastava não tipar o closure do `map` para o
`DomainDependencyTest` não ver nada, e guardrail com escape usado é pior que guardrail nenhum; e a
frase da narrativa, que no original só fecha se `courses.description` começar por verbo, enquanto o
dado real do projeto é sintagma nominal. A oração fecha antes (`… abordó los siguientes contenidos:`)
e a descrição vira parágrafo próprio.

**Nota de ambiente, não do produto:** `Read` não abre PDF aqui porque falta `poppler-utils`; ele foi
instalado **no container `app` em runtime** (`apk add poppler-utils`) só para a leitura da prova.
Não entrou em `Dockerfile` nem em dependência do projeto — some no próximo rebuild, e nada do código
o usa.

**O que o João deixou registrado como contexto e NÃO é trabalho deste bloco:** o Manual de Classe
(aba de documentos da turma, PDF novo + botão de `.docx` para o redator, páginas 1/2/4 geradas) é
para ser planejado **com o bloco de frontend** — instrução literal dele. Fica fora da Task 15.

### Review da Task 15 — 6 achados aprovados, corrigidos pelo Codex e provados aqui (2026-08-06)

Review em duas frentes (lente Claude + Codex read-only, ALTO RISCO por ser documento de peso legal).
Os seis achados foram **aprovados pelo João**, a correção **delegada ao Codex** e a revisão das
correções feita com Claude. **Todos provados, e o gate reconferido aqui — não aceito por relatório:**
suíte **441 passed, 1 skipped (1604 assertions)**, +5 sobre 436; Pint `passed` nos 5 `.php` tocados;
frontend intocado. RED visto para os testes novos; **Q-5 provado não-vacuoso por mutação**; Q-1, Q-2,
Q-4 e Q-6 provados **no PDF real** pela API com sessão Sanctum.

O que cada um era, e o que a correção fez:

- **Q-1 🔴 — o período da capacitação sumia do certificado quando `courses.description` é null**, e o
  teste fixava esse comportamento. O `$periodo` vivia dentro do `@if ($description)`; agora tem
  ramo próprio (`La actividad fue realizada {periodo}.`) e o `$periodo` vira `null` explícito quando
  falta data, em vez de imprimir frase quebrada.
- **Q-2 🟡 — razão social e RUT da OTEC emissora eram literais no Blade** e não congelavam no
  snapshot, violando a D12 no mesmo campo que o A-1 já tinha corrigido para o cliente. Nasce
  `snapshot.emissor` no `CertificateSnapshotBuilder`, alimentado por `config('app.certificate_issuer')`
  (chave nova, com `env()` — nunca `env()` em runtime), e o Blade lê o snapshot com a config só como
  fallback para os certificados já emitidos.
- **Q-3 🟡 — `description` era lido sem defesa** enquanto `modules` usava `?? []`, na mesma leva.
  Toda leitura de snapshot no Blade passa a `data_get` com default.
- **Q-4 🟡 — `ltrim` com charlist multibyte corrompia o travessão no temário** (provado por sonda):
  `ltrim($line, "*-•\t ")` opera byte a byte e comia pedaço de `•`/`–`. Virou `preg_replace` com
  `/u` e lookahead, que só remove marcador seguido de espaço ou fim de linha.
- **Q-5 🟡 — as asserções de omissão do `CertificatePdfTest` viraram vacuidade** depois da reescrita
  do Blade. Reescritas para falhar de verdade; a não-vacuidade foi provada por mutação.
- **Q-6 🟡 — rodapé e QR eram `position: absolute` sobre fluxo de tamanho ilimitado**: descrição ou
  temário longos passavam por baixo da assinatura. A página vira flex column com
  `.certificate-footer` em `margin-top: auto`.

**Achado NOVO da revisão, fora dos seis, e por isso a decisão do João foi separada:** o Gotenberg
**não recebe tamanho de papel** e devolve **Letter (612×792 pt)**, enquanto o Blade declara
`@page size: A4` e o Q-6 calibra `min-height: 297mm` — documento legal chileno saindo em papel
errado. **Defeito pré-existente da Task 7**, não introduzido pelas correções.

**Decisão do João em 2026-08-06:** commitar as correções dos seis achados, e **tratar o A4 dentro
deste bloco** — não vira débito. O papel errado é a Task 16; o bloco só volta a `ready_for_review`
depois dela, porque o review tem de ver o PDF no papel certo.

Correções commitadas em `cd457bc`, com o gate reconferido antes do commit.

### Task 16 — o papel do certificado (2026-08-06)

**O tamanho já estava declarado; quem não o lia era o Gotenberg.** O Blade tem
`@page { size: A4 portrait; margin: 0 }` desde a Task 15, mas o Chromium só honra o `@page` do CSS
quando recebe `preferCssPageSize`; sem ele imprime no default do Gotenberg, **Letter**. A correção é
uma linha no `CertificatePdfService` — `preferCssPageSize=true` no multipart —, e não duplica o A4
no PHP de propósito: **o tamanho continua declarado uma vez só, no CSS do documento**, que é onde o
`min-height: 297mm` do `.page` já estava calibrado.

**Provado nos dois sentidos.** O teste novo (`test_gotenberg_recebe_o_tamanho_de_papel_declarado_no_css`)
foi visto reprovando contra o serviço antigo com a **regex final** — o primeiro RED tinha regex
errada e não valia como prova. Suíte **442 passed, 1 skipped (1606 assertions)**, +1 sobre 441; Pint
`passed` nos 2 `.php` tocados; frontend intocado.

**Prova no PDF real, não na suíte** (lição 12): `GET /api/certificates/2/pdf` com sessão Sanctum
devolveu **200 `application/pdf`, 41.766 bytes**, e o `pdfinfo` do arquivo baixado diz
**`594.96 x 841.92 pts (A4)`, 2 páginas** — antes era Letter (612×792). As duas páginas foram
**renderizadas e vistas**: rodapé, QR e assinatura assentam no fim da página 1 (Q-6 continua de pé
no papel certo), a página 2 traz o temário, e nenhuma terceira página órfã aparece. O Q-4 também
aparece no papel: `-5 kV nominal` e `–5 kV a 15 kV` chegam íntegros enquanto os marcadores `*`/`•`
somem.

**Achado registrado e NÃO tocado:** `manual-turma.blade.php` não declara `@page` nenhum e o
`ManualPdfService` também não manda tamanho — o Manual de Classe sai em Letter pelo mesmo motivo.
É o layout genérico que o D-P8 já nomeia como defeito, e o João mandou planejar o Manual **com o
bloco de frontend**. Fica como contexto para aquele bloco, não como trabalho deste.

### R-1 a R-5 aplicados e três refatorações de arquitetura (2026-08-07) — `28ac6a3`…`e7626b4`

**Os cinco achados do review das correções, aprovados pelo João, foram corrigidos em `28ac6a3`.**
R-1 🟡 o `data_get(..., [])` do Q-3 não cobria valor `null` — o default do `data_get` só vale para
chave **ausente**, então `curso.modules: null` entrava no `@foreach` e derrubava o PDF em 500
(provado pela API real antes do fix). R-2 🟡 o A4 não tinha guarda; R-3 🟡 a origem em `config` do
emissor não era guardada, porque o teste fixava os mesmos valores do default — os overrides passaram
a usar valores **diferentes** de `config/app.php`; R-4 🟢 a "descrição longa" do teste de rodapé era
decorativa; R-5 🟢 `.env.example` sem `CERTIFICATE_ISSUER_NAME`/`RUT`.

**Depois disso o João trouxe uma revisão paralela de arquitetura** (skill `improve-codebase-
architecture`, executada por ele fora desta sessão) e mandou aplicar **só o backend, e só o que toca
o bloco ativo** — B4–B7 e C1–C7 do relatório ficam fora por escopo, não por discordância. **As três
alegações foram conferidas no código antes de qualquer edição**, e uma sub-alegação foi medida como
**falsa e registrada como falsa**: o relatório dizia que `layout_config.orientation` era "gravado e
nunca lido", e o `grep` não acha uma ocorrência sequer da chave em lugar nenhum do repositório —
ela já não existe desde a Task 15 (D-P9).

- **B3 (`eccf0ee`) — o transporte do Gotenberg estava escrito duas vezes e as duas cópias já haviam
  divergido:** `CertificatePdfService` recebeu `preferCssPageSize` na Task 16 e `ManualPdfService`
  não. Nasce `App\Shared\Pdf` — `HtmlToPdf` (interface), `GotenbergHtmlToPdf` (o único lugar que
  conhece multipart), `PageOptions` e `FakeHtmlToPdf`. O teste do certificado deixou de ser regex
  sobre corpo multipart; **um teste só** (`Tests\Feature\Shared\HtmlToPdfTest`) conhece o formato do
  transporte. O Manual segue em `PageOptions::converterDefault()` **de propósito** — ele não declara
  `@page`, e mudar o papel dele é trabalho do bloco de frontend, não deste.
- **B2 (`a33d793`) — o snapshot congelado era `array` sem contrato**, com dois leitores de política
  oposta (o Blade defendia com `data_get`, os testes indexavam cru) e `Record<string, any>` no
  `generated.ts`. Vira `CertificateSnapshotData` (+6 DTOs aninhados) com `CURRENT_VERSION = 2` e um
  `fromArray` **tolerante que nunca estoura**: certificado emitido em 2026 tem de continuar
  renderizando em 2030, mesmo com chave que o código atual não conhece. O `CertificateSnapshotCast`
  aceita DTO **ou array cru** — é assim que o teste simula o schema versão 1 sem falsificar o
  caminho de produção. `generated.ts` regenerado no mesmo commit; a regra da vigência e a leitura de
  `city` no formato legado (`template.layout_config.city`) continuam funcionando.
- **B1 (`e7626b4`) — as seis portas da emissão estavam escritas duas vezes:** guardas em PHP na
  `IssueCertificateAction`, restrições em Eloquent no `CertificateController::issuable`. É a mesma
  classe de bug que já custou A-2 e D-P8 — **a lista promete um certificado que o POST recusa com
  422**. Nasce `CertificateEligibility`, com cada porta como par adjacente `assert*`/`constrain*` e
  a mensagem escrita uma vez; a Action recebe o `IssuanceContext` já resolvido e não reconsulta
  template nem cidade. `CertificateTemplateResolver::latestForCourse()` deixa de ter query própria e
  deriva de `latestByCourse()`, então "template vigente" também volta a ter uma implementação só.

**A invariante do B1 tem teste nos dois sentidos, e o RED foi visto** (lição 10):
`CertificateEligibilityTest` prova que tudo que `issuableTurmas()` mostra passa em `assert()` e que
uma turma por porta fechada some da lista **e** leva 422 na emissão. Removendo
`constrainRedatorDesignado` da face 2, o teste falha nomeando a porta que divergiu.

**Gate reconferido aqui, não aceito por relatório:** suíte **449 passed, 1 skipped (1634
assertions)**, +7 sobre 442; Pint `passed` nos 6 `.php` do B1; `pnpm build`, `pnpm lint` e **35
passed** no frontend; `typescript:transform` rodado de novo **sem diff** (o `generated.ts` do B2 já
está commitado com ele).

**E2e com sessão Sanctum contra a API real** (lição 12): `GET /api/certificates/issuable` devolveu
a turma 3 com 10 matrículas; `POST /api/enrollments/24/certificate` emitiu **`LOT-2026-1003`** com
`snapshot.schema_version = 2`, `template.city = Santiago` e `emissor` vindo da config; a mesma
matrícula **sumiu da lista** na chamada seguinte (a porta 3 fechando nas duas faces, provada no
banco real); e `GET /api/certificates/4/pdf` devolveu **200 `application/pdf`, 44.292 bytes**, com
`pdfinfo` em **`594.96 x 841.92 pts (A4)`**. As três páginas foram **renderizadas e vistas**: o
documento traz emissor, razão social, narrativa, QR, assinatura sobre `Instructor` e o temário com
`-5 kV nominal` / `–5 kV a 15 kV` íntegros (Q-4 de pé), rodapé no fluxo (Q-6 de pé).

**O que ainda NÃO aconteceu, e por isso o estado é `reviewing` e não `ready_for_closure`:** as três
refatorações são código novo e substancial, e **nenhuma passou por uma lente de review** — só pelo
gate. O próximo passo é repetir o `/revisar-sprint` sobre `28ac6a3..e7626b4`.

### Correções do review — 2026-08-07, Q-1 a Q-7 aplicados

O João aprovou os sete. **Suíte após as correções: 457 passed, 1 skipped, 1655 assertions**; Pint
`passed` nos 16 arquivos; `typescript:transform` sem diff no `generated.ts` (só métodos mudaram, não
a forma dos DTOs). **Cada um dos 8 testes novos foi visto reprovar contra o código antigo**
(`git stash` do arquivo de produção, roda, `stash pop`) — lição 10.

Duas correções mudam comportamento de propósito e ficam registradas aqui:

- **Q-3 — nota não-numérica volta a ser impressa.** `finalGrade()` filtrava por `is_numeric` e
  apagava `"6,4"` do documento em silêncio; `enrollments.grades` é validado só como `array`, então a
  nota chega como o redator lançou, vírgula inclusive. Agora omite apenas o que não dá para
  imprimir — array, objeto, booleano, string vazia (D-P7 preservado). O `AcademicResult` tipado
  segue como B6 no backlog; isto é a defesa até lá.
- **Q-4 — `schema_version` passou a governar a leitura, e snapshot corrompido falha alto.** Só a
  versão 1 cai para `config('app.certificate_issuer')` quando falta `emissor`; da 2 em diante o
  emissor é o congelado, senão a OTEC de HOJE entraria num documento antigo. E `aluno.name`,
  `curso.name` e `emissor.name` em branco viram `CorruptedSnapshotException` (500 pelo handler RFC
  7807) nos dois consumidores legais — PDF e rota pública do QR. Um 200 dizendo `status: emitido`
  com nome vazio é prova falsa; erro visível vira chamado.

Três testes que comparavam `assertEquals($snapshot, $reloaded->snapshot)` passaram a comparar
`toArray()`: sem o cache de casts, cada leitura reconstrói o DTO, e a comparação objeto a objeto
batia no `_dataContext` do spatie — escrituração da biblioteca, não conteúdo do documento.

### Review das três refatorações — 2026-08-07, 7 achados aguardando o João

Duas frentes (lente Claude + `mcp__codex__codex` read-only), ALTO RISCO por documento de peso legal.
Suíte reconferida aqui, não aceita por relatório: **449 passed, 1 skipped, 1634 assertions**.

**O 🔴 foi provado por sonda, não deduzido.** `CertificateSnapshotCast` é um cast de objeto, e o
Eloquent guarda o valor no cache de casts: `Model::save()` chama `mergeAttributesFromCachedCasts()`
antes de qualquer coisa, então **ler `$certificate->snapshot` e salvar o mesmo model reescreve a
coluna** a partir do DTO. Rodado no MySQL de dev dentro de `beginTransaction`/`rollBack` com um
snapshot da versão 1: `template.layout_config` (com `orientation`) **sumiu**, `emissor` **da config
atual** entrou num documento de 2026 — a mesma classe de defeito que o A-1 e o Q-2 já corrigiram —
e `schema_version: 1` foi carimbado numa estrutura versão 2. Nenhum caminho de produção dispara
hoje: `RevokeCertificateAction` recarrega o model com `lockForUpdate` e não lê o snapshot antes do
`update`. O bloco de frontend, que lê certificado em toda tela, é quem encosta nisso.

**A divergência entre os revisores foi mostrada, não resolvida em silêncio:** o Codex marcou a troca
de `template.layout_config` por `template.city` como perda de dado congelado. Conferido no código —
`orientation` não existe em lugar nenhum desde o D-P9 e a `city` nomeada é a decisão do próprio B2,
com teste atualizado de propósito. **Não é achado.** O risco real que sobra é o Q-1: é ele que apaga
o `layout_config` dos snapshots v1 que ainda o carregam.

