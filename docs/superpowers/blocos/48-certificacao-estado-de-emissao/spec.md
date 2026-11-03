# Bloco 48 — `certificacao-estado-de-emissao` — spec

**Data:** 2026-11-02 · **Branch:** `fix/48-certificacao-estado-de-emissao` · **Classificação:**
architectural · **Contexto:** não (sem packet) · **Ficha:** `backlog.md` §48 · **Fonte:** card 4 e
achado 0.3 do review de 2026-11-02, `P-103`, `P-104`.

## 1. Intenção

Certificado tem peso legal. Hoje a pergunta "esta matrícula tem certificado?" tem respostas
diferentes conforme quem pergunta:

- `CertificateVigenciaResolver::vigentes()` (porta 3, painel de emissão, `ResultLock`) e
  `Certificate::scopeEmitidos()` (contagens do Dashboard) repetem o mesmo `where status = Emitido`,
  cada um se dizendo "fonte única";
- `CertificationMetricsQuery::pendingEnrollmentQuery()` (`:95`) exclui a matrícula com **qualquer**
  certificado, revogado incluído. O painel de emissão reabre o revogado para reemissão e o Dashboard
  diz que não há pendência. **Duas telas do mesmo sistema discordando sobre um documento legal.**

Além disso, a emissão tem uma janela de corrida com a correção de resultado (P-103), e o diálogo de
conclusão da turma diz "irreversível" sobre coisas que não são (P-104).

O bloco dá **um dono** ao estado de emissão da matrícula, fecha a corrida com prova em MySQL e
corrige o texto para dizer exatamente o que o sistema tranca.

## 2. Objetivos

1. **Card 4.** Um módulo de Certification nomeia os três estados de emissão da matrícula e é o único
   lugar que sabe derivá-los, em SQL e em PHP, com teste de paridade.
2. **Achado 0.3.** A matrícula aprovada de turma concluída cujo único certificado está revogado
   **é pendência** no Dashboard, como já é no painel de emissão.
3. **P-103.** A emissão decide a porta 2 e monta o snapshot com a matrícula relida sob lock dentro da
   transação; a correção de resultado trava a mesma linha. Prova em MySQL real.
4. **P-104.** Textos de `operation.conclusion.confirmBody` e `operation.detail.lock.concluida` nos três
   locales, aprovados pelo João (§5).
5. **Documento de turma concluída.** Só o superadmin sobe documento em turma concluída (decisão do
   João, 2026-11-02).
6. **Registro para o 50.** As decisões do João sobre cotação de turma concluída viram a pendência
   `P-112`, apontada para o bloco 50.

## 3. Não-objetivos (Fora)

- Consumir o estado novo nas outras queries do Dashboard — série/ranking (`AnalyticsQuery`, inclusive
  a cópia crua de `:183`) e pipeline (`PipelineQuery:103`). Fica com o **54**, que depende deste.
- Qualquer mudança no Commercial (UF editável, tag de turma, recusa de cotação com turma): é o **50**
  (§4 D9).
- Liberar datas, local ou modalidade da turma concluída: o João decidiu **manter recusado** como hoje.
- Reabrir turma: não existe e não passa a existir.
- Incluir validade (`valido_ate`) no conceito de vigente. O módulo deixa a porta pronta, não a abre.

**Anti-objetivo:** o módulo virar uma terceira "fonte única" ao lado das duas de hoje. Ao fim do bloco
não sobra `where('status', CertificateStatus::Emitido)` em `app/Domains/Certification` nem em
`CertificationMetricsQuery` fora do módulo.

## 4. Decisões

**D1 — Três estados, nomeados (João, ficha).** Por matrícula:

| Estado | Definição |
|---|---|
| vigente | tem certificado com `status = Emitido` |
| revogado‑reemissível | tem certificado, nenhum `Emitido` (todos `Revocado`) |
| nunca emitido | não tem certificado |

"Vigente" continua sendo só `Emitido` — mesma regra de hoje; não muda comportamento de porta,
painel nem `ResultLock`.

**D2 — Forma do módulo (minha).** Em `Domains/Certification`: um enum dos três estados e um serviço
dono do critério que oferece:

- **predicado SQL** sobre `certificates` ("o certificado é vigente") — o único `where status = Emitido`;
- **escopo SQL** sobre a query de `Enrollment` por estado (ex.: "não vigente", "revogado‑reemissível",
  "nunca emitido"), por `whereExists`/`whereNotExists` sobre `certificates`, sem `JOIN` que duplique
  linhas;
- **classificação PHP** de matrículas dadas por id (uma consulta para o lote, sem N+1), devolvendo o
  estado de cada uma.

`CertificateVigenciaResolver` mantém a API pública (`byEnrollment`, `lockedAmong`,
`isLockedForUpdate`, `existeVigenteForUpdate`) e o `implements ResultLock`, mas o `vigentes()` dele
passa a vir do predicado do módulo. `Certificate::scopeEmitidos()` também delega ao predicado (o
escopo continua existindo: `AnalyticsQuery` e `RedatorScopeQuery` o usam e ficam para o 54).
Nomes de classe/método e se o enum e o serviço ficam juntos ou separados ficam com o builder (§7).

**D3 — Paridade SQL × PHP (ficha, molde ADR-22).** Teste que monta matrículas nos três estados mais
os casos de borda (dois revogados; revogado + emitido; matrícula arquivada com certificado; matrícula
reprovada com revogado) e exige que, para cada estado, o conjunto de ids do escopo SQL seja igual ao
conjunto que a classificação PHP põe naquele estado. Molde: `CertificateDisplayStatusParityTest`,
`TurmaStatusParityTest`.

Matrícula arquivada (minha): o estado de emissão é derivado **só dos certificados**; arquivamento é
filtro de quem pergunta. O escopo SQL sobre `Enrollment` herda o default do `SoftDeletes` (arquivada
fora), e a classificação PHP por id classifica qualquer id recebido pelos certificados dele. O teste
fixa os dois: a arquivada com certificado não aparece em nenhum escopo, e classificada por id dá o
estado dos certificados. Dependência Dashboard → Certification já existe (`CertificationMetricsQuery`
importa `Certificate`).

**D4 — Pendência do Dashboard (João, achado 0.3).** `CertificationMetricsQuery::pendingEnrollmentQuery()`
= aprovada + turma concluída + **estado ≠ vigente**, pelo escopo do módulo. O teste
`test_conta_aprovados_sem_qualquer_certificado_e_nao_reabre_revogado` **inverte**: a matrícula
revogada conta (`certificadosAEmitir()` = 2 no cenário dele) e a turma aparece em `pendencias()`. O
`alertas()` (`:59`) passa a usar o predicado do módulo em vez do `where` cru (minha: está no mesmo
arquivo e é a mesma cópia; o comportamento não muda).

**D5 — P-103: lock na matrícula, nos dois lados (pendência, decisão registrada).**

- `IssueCertificateAction`: a primeira coisa dentro da transação é reler a matrícula pelo id com
  `lockForUpdate`; as cinco portas e o `CertificateSnapshotBuilder` recebem **a matrícula relida**,
  nunca o `$enrollment` vindo de fora. As relações que as portas e o snapshot leem são carregadas na
  relida.
- `RecordEnrollmentResultAction`: dentro da transação, antes de ler o `ResultLock`, relê a matrícula
  pelo id com `lockForUpdate` e aplica o `fill()->save()` **na instância relida** (minha: travar sem
  reler deixaria a escrita sobre o objeto de fora).
- Ordem de lock igual nos dois: **matrícula, depois certificado** — sem inversão, sem deadlock.
- O docblock de `RecordEnrollmentResultAction` que descreve a janela é reescrito para dizer que ela
  fechou e como.
- `BatchIssueCertificatesAction` não muda: cada item já é uma `IssueCertificateAction` com transação
  própria.

**D6 — Prova da corrida em MySQL (ficha).** Teste de concorrência com `ProbesMysqlConcurrency`
(pulado fora do MySQL, molde `CertificateNumberTest`/`PrimaryConcurrencyTest`): um processo filho
segura o lock da matrícula numa correção de resultado que muda `approval_status`/nota; outro emite.
A sonda confirma que a emissão está **esperando o lock em `enrollments`**; liberada a correção, a
emissão vê o resultado novo — ou recusa na porta 2 (correção para reprovado), ou grava no snapshot a
nota/presença corrigida. O teste reprova contra o código de hoje (a emissão não espera em
`enrollments`). Roda na suíte MySQL do container; o comando exato fica no plano.

**D7 — Texto P-104 (João, 2026-11-02, aprovado literal).** §5.

**D8 — Documento de turma concluída (João, 2026-11-02).** Subir **e remover** documento em turma
concluída passa a ser permitido **só ao superadmin**. Turma em andamento não muda (quem tem
`operation.turma.submit_docs`). Forma (minha): permissão nova exclusiva do superadmin, no mesmo
molde de `commercial.quote.approve` (excluída da lista do admin no `RolePermissionSeeder`), checada
na `StoreTurmaDocumentAction` e na `DeleteTurmaDocumentAction` no lugar do
`assertAcademicallyWritable()` quando a turma está concluída; as duas Actions passam a receber o ator.
Upload e remoção já são auditados pela trilha de `files`; nada muda nisso. O middleware `permission:operation.turma.submit_docs`
do `TurmaDocumentController` não muda: o admin, que não tem `submit_docs`, segue com **403** em
qualquer turma; o redator chega à Action e recebe 422 na concluída; o superadmin tem as duas. Permissão nova leva migration de dados (molde
`2026_10_29_000002_add_certification_settings_permission`), rótulo `perm.*` nos três locales
(catraca `PermissionI18nParityTest`) e o front habilita upload e remoção na aba de documentos da turma
concluída só para quem a tem (`useTurmaDocsSection`). O redator continua sem subir após a conclusão.

**D9 — Pendência `P-112` para o bloco 50 (João, 2026-11-02, literal).** Entra em
`pendencias/abertas.md` e no índice:

- cotação **aprovada** ligada a turma: só o **valor UF** fica editável (restringe o "demais campos
  editáveis" do achado 0.2 da ficha 50);
- cotação/orçamento ganham uma **tag com o status da turma**, prefixo "Turma:" nos três idiomas —
  *A configurar* (sem turma ainda), *En curso*, *Concluida*; cotação **recusada** não tem a tag;
- confirmado pelo levantamento deste bloco: hoje o superadmin recusa uma cotação aprovada com turma
  concluída (`RejectQuoteAction`, sem guarda) e depois edita curso, número de alunos e UF, ou apaga a
  cotação; já há teste fixando esse caminho (`QuoteApprovalTest.php:77-85`). Isso é o card 5 do 50.

## 5. Texto aprovado (P-104)

`operation.conclusion.confirmBody`:

- **es‑CL:** "Concluir la turma es definitivo: no podrá reabrirse, y los alumnos, el relator, las
  fechas y el lugar quedan fijos. Después solo se podrán corregir la nota, la asistencia y el estado
  de los alumnos aún sin certificado vigente. ¿Confirmas la conclusión de la turma?"
- **pt‑BR:** "Concluir a turma é definitivo: ela não poderá ser reaberta, e alunos, redator, datas e
  local ficam fixos. Depois, só se corrigem nota, presença e status de alunos ainda sem certificado vigente.
  Confirma a conclusão da turma?"
- **en:** "Concluding the class is final: it cannot be reopened, and its students, instructor, dates
  and location become fixed. Afterwards, only the grade, attendance and status of students without an active
  certificate can be corrected. Confirm the completion of this class?"

`operation.detail.lock.concluida`:

- **es‑CL:** "La turma está concluida: alumnos, relator, fechas y lugar ya no cambian. Solo se pueden
  corregir la nota, la asistencia y el estado de alumnos aún sin certificado vigente."
- **pt‑BR:** "A turma está concluída: alunos, redator, datas e local não mudam mais. Só a nota, a
  presença e o status de alunos ainda sem certificado vigente podem ser corrigidos."
- **en:** "The class is concluded: students, instructor, dates and location no longer change. Only the
  grade, attendance and status of students without an active certificate can still be corrected."

O upload do superadmin não entra no texto (decisão do João): aparece pelo botão habilitado na aba de
documentos.

## 6. Restrições

- Leis do `CLAUDE.md` §5: DDD-lite sem Repository; auditoria só na aplicação; `generated.ts` só por
  `typescript:transform`; erros pelo handler RFC 7807 (`ValidationException`, nunca `abort`); front
  sem PrimeReact direto nem import entre features.
- Mensagem ao usuário sai de `lang/` com paridade nos três locales (`MensagemLiteralTest`,
  `LocaleParityTest`); o front tem `locales/parity.test.ts` e `copy.test.ts`.
- Teste de regressão só vale depois de visto reprovar contra o código antigo — **sem `git stash`**:
  prova com cópia do arquivo no scratchpad (memória do projeto).
- Lista que passa a ler relação nova atualiza o eager-load no mesmo commit; a classificação PHP é uma
  consulta por lote.
- Comportamento de porta 3, painel de emissão e `ResultLock` **não muda** (só a fonte do critério).

## 7. Deixado ao builder

- Nomes do enum, do serviço e dos métodos; se o enum carrega o método de derivação ou se o serviço
  faz tudo; a forma exata do escopo (`whereExists` vs `whereIn` com subquery).
- Nome da permissão nova e da chave `perm.*`.
- Onde o front lê a permissão nova e como esconde/mostra o upload na turma concluída, dentro do
  molde atual de `useTurmaDocsSection`.
- O desenho do processo filho do teste de concorrência e qual campo a correção muda.
- Qualquer `docs/` que cite a regra velha (ex.: `estrutura-monolito.md`, docblocks) — atualizar no
  commit que muda a regra.

## 8. Critérios de aceite (DoD)

1. Nenhum `where('status', CertificateStatus::Emitido)` (ou `'emitido'`) em `app/Domains/Certification`
   nem em `CertificationMetricsQuery` fora do módulo; grep na revisão.
2. Paridade SQL × PHP verde para os três estados e as bordas de D3.
3. Teste do 0.3 invertido e verde: matrícula com só certificado revogado conta em
   `certificadosAEmitir()` e põe a turma em `pendencias()`; nunca emitida segue contando; vigente não.
4. Testes existentes de porta 3, painel e `ResultLock` seguem verdes sem edição de asserção.
5. Teste de concorrência da P-103 verde em MySQL, visto reprovar contra o código antigo; pulado (não
   verde falso) em sqlite.
6. Textos de §5 literais nos três locales; `parity.test.ts`, `copy.test.ts` e `pnpm build` verdes.
7. Superadmin sobe documento em turma concluída (201); redator recebe 422
   `operation.turma.concluded_locked`; admin segue 403 (sem `submit_docs`, como hoje); a remoção segue a mesma matriz (superadmin 204/200,
   redator 422, admin 403); turma em andamento inalterada. Na tela, upload e remoção da turma
   concluída aparecem só para o superadmin.
8. `P-112` registrada em `pendencias/abertas.md` e no índice; `P-103` e `P-104` saem para
   `encerradas.md` no fechamento.
9. Suíte backend inteira e `pnpm lint`/`pnpm test` verdes.

## Verificação externa

Nenhuma. O bloco cobre código, testes e textos do repositório; a prova em MySQL roda no stack local da
lane. `efeito_externo: nao`.
