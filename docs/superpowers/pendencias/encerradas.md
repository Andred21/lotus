# Pendências encerradas

> Mantidas **1 sprint** para rastro e removidas no `/fechar-sprint` seguinte. O rastro durável de
> tudo que já saiu daqui vive no git e na linha da entrega em
> [`../historico/progress.md`](../historico/progress.md) ou
> [`../historico/progress-archive.md`](../historico/progress-archive.md).

## Em rastro (saem no próximo `/fechar-sprint`)

*(quatro: a **`P-58`**, fechada em **2026-09-04** pelo `frontend-arrumacao-de-testes` (item 27), e
as três que o `backend-envelope-de-erro-e-recusa-de-dominio` (item 26) fechou em **2026-09-03** —
`P-71`, `P-72` e a metade de comportamento da `P-60`. As cinco do `frontend-dividas-de-mecanismo`
(item 25) — `P-69`, `P-68`, `P-70`, `P-30` e `P-42` — **saíram neste fechamento**, o primeiro
posterior ao do bloco que as encerrou; o parágrafo adiante é o rastro delas. As três do item 26
ficam: elas são da `lane-a`, que não fechou bloco desde então, e o rastro de 1 sprint delas se conta
pelo fechamento dela.)*

> **O número `P-73` está queimado, e o `P-74` foi disputado.** O `P-73` pertenceu à advisory do
> `browserslist`. Os fechamentos do item 25 e do item 26 abriram, cada um, uma ficha que o reusou
> por engano; as duas foram renumeradas no mesmo dia — a do item 25 para **`P-74`** e as do item 26
> para **`P-75`** e **`P-76`**, nesta ordem de integração. Número de pendência não se reusa nem se
> renumera para trás: é a mesma regra que o `state.md` escreveu para o rótulo de bloco na colisão
> de 2026-09-02.

### P-58 — a catraca do vite isola o `.env` da RAIZ e não o `frontend/.env`

**Fechada em 2026-09-04**, por mecanismo, no item 27 (Task 7). `tests/compose-dev.test.ts` passou a
afastar os quatro `.env*` das **duas** raízes que o `vite.config.ts` lê — a do repositório
(`loadEnv(mode, RAIZ, 'LOTUS_')`, o offset de portas) e a de `frontend/`
(`loadEnv(mode, __dirname, 'VITE_')`, que decide se `VITE_API_URL` já está definido). O `NOMES_ENV`
antigo virou o produto `DIRETORIOS_ENV × NOMES_ENV`, com a chave do caminho relativa para que
`.env` da raiz e `frontend/.env` não colidam nos mapas de plantados e backups pendentes.

**Provado com o arquivo posto e retirado**, duas vezes: na execução, a versão pré-Task-7
(`git show 32b05097:...`) com `frontend/.env` real no disco deu as **3 falhas** que a ficha
descreve (`expected undefined to be '"http://localhost:8080"'`) e a versão nova, mesmo arquivo no
disco, deu **12/12**; no fechamento, com `VITE_API_URL=http://localhost:8080` plantado de novo,
`pnpm test --project=repo tests/compose-dev.test.ts` deu **12/12** e o arquivo saiu, deixando a
árvore limpa. O gate deixou de depender do disco de quem roda.

### P-71 — cinco recusas que o usuário lê continuam literais fora de `lang/`, em três domínios

**Fechada em 2026-09-03**, no `backend-envelope-de-erro-e-recusa-de-dominio` (item 26), por
mecanismo. Os cinco sítios que a ficha contava passaram a ler `lang/` nos três locales e saíram da
`DEBITO_CONHECIDO` no mesmo commit: `RedatorNaoElegivelException:16,21` e
`TurmaConfiguracaoException:15,20` (pt-BR), e a `CorruptedSnapshotException`, cujo `sprintf` de dois
`%s` virou `certification.snapshot.not_presentable` com os parâmetros `:codigo` e `:campos`.

**Ela pagou seis a mais do que contava.** O Q-7 do review de 2026-09-03 achou o que a própria ficha
tinha nomeado sem hospedar: `CertificateEligibility::refuse()` recusava com seis frases literais em
es-CL, e nenhuma catraca as via — o `withMessages` do helper recebe `[$field => $message]` em
**variáveis**, e a frase mora no chamador, seis linhas acima. As seis saíram para
`certification.eligibility.*` nos três locales, e `MensagemDeCertificadoLocalizadaTest` prova que
são três traduções distintas, não a mesma frase copiada.

**O mecanismo é o que fecha, não a tradução.** `MensagemLiteralTest` ganhou a **terceira porta**:
`nenhum_encaminhador_de_with_messages_carrega_texto_literal` **descobre** o encaminhador pelo corpo
do método (quem repassa para `withMessages`), não pelo nome, e cobra a frase literal no chamador
dele. Helper novo com outro nome já nasce coberto. No mesmo passo, o Q-6 tirou
`CorruptedSnapshotException.php:48` da `DEBITO_CONHECIDO` ensinando o detector a ignorar o
separador de `implode(', ', ...)` — a lista é inventário e só encolhe, ela não hospeda falso
positivo.

**O que NÃO foi pago virou ficha:** a **`P-76`** recolhe os seis sítios restantes que a `P-71`
nomeava e a catraca não alcança — `UserProvisioner::DUPLICADO`, os três `$fail()` de
`ValidationRule` e o `'Sessão encerrada.'` do `logout`. Ficha que fecha não leva o resto junto.

---

### P-72 — o 419 devolve `detail` literal em inglês nos três locales

**Fechada em 2026-09-03**, no mesmo bloco, por mecanismo e **medida contra a API real**, que é como
o defeito foi medido. O `detailFor()` do `ProblemDetails` ganhou o braço próprio para
`TokenMismatchException` e a chave `problem.detail.csrf` nasceu nos três locales. `PUT
/api/turmas/3` com `X-XSRF-TOKEN: invalido`, remedido no fechamento:

```
es-CL  419 | Error en la solicitud | Tu sesión expiró o el formulario perdió validez. Recarga la página e inténtalo de nuevo.
pt-BR  419 | Erro na requisição    | Sua sessão expirou ou o formulário perdeu validade. Recarregue a página e tente de novo.
en     419 | Request error         | Your session expired or the form is no longer valid. Reload the page and try again.
```

Três frases distintas, nenhuma `CSRF token mismatch.`. O `title` já era localizado antes e
continua.

A sonda dessa medição destapou uma divergência de ambiente que **não é deste bloco** e virou a
**`P-75`**: `config('sanctum.stateful')` não traz o `localhost:5173` que o `.env` declara, então o
CSRF disparado do Vite dev server real cai em 401 e não no 419.

---

### P-60 — um certificado do banco de dev tem snapshot sem `aluno.name`, e a validação pública dele devolve 500

**A metade de COMPORTAMENTO fechou em 2026-09-03**, no mesmo bloco, **por decisão escrita** — a
**D4** da spec: o gate `assertPresentable()` **não muda** e a rota pública continua estourando.
`show`, PDF e QR seguem recusando juntos; só o idioma da frase mudou, junto com a `P-71`.

A razão está no docblock da `CorruptedSnapshotException` e não só na spec: documento de peso legal
não atesta o que não sabe. *Degradar* obrigaria `PublicCertificateData` a aceitar nome vazio;
*recusa nomeada em 422* tiraria o caso do teto de 500 sem que o SPA tenha estado próprio para ele —
contrato novo sem consumidor. A mesma decisão é o que mantém a exceção **fora** de
`RecusaDeDominio` (D5): herdar da base a arrastaria para o mapa 422/403, e `RecusaNaoVaiAoLogTest`
guarda a contra-prova — recusa de domínio não vai ao log, snapshot corrompido continua indo.

**A metade do DADO DE DEV continua aberta** e não se fecha aqui: corrigir ou reseedar o
`LOT-2026-1001` é o candidato da **`P-44`**, hospedada no item 13. Linha alheia de bloco fechado se
menciona, não se apaga.

---

**A P-02 e a P-33 saíram no fechamento do `hardening-performance-e-dados` (2026-08-29)**, o
primeiro posterior ao do bloco que as encerrou. As duas fecharam em 2026-08-26 no
`hardening-auditoria-privacidade-e-observabilidade`, por **mecanismo** e não por promessa: a
`RetentionPolicy` (`backend/app/Shared/Retention/RetentionPolicy.php`), os comandos
`lotus:podar-auditoria` e `lotus:podar-logins`, o índice `audits_created_at_index` e o agendamento
em `routes/console.php`/`scheduler` do `docker-compose.prod.yml`. A **P-46** saiu no fechamento do
`frontend-estilizacao-padronizacao-de-componentes`, no mesmo dia e pelo mesmo critério. As três
estão no git e nas linhas de entrega em [`../historico/progress.md`](../historico/progress.md).

---

**A P-03 e a P-15 saíram nos dois fechamentos de 2026-08-25** — a fatia 2 do
`frontend-revisao-ui-por-modulo` e o `hardening-api-arquivos-e-abuso` —, os primeiros posteriores
aos dos blocos que as encerraram. As duas foram **remedidas antes de sair**, não removidas na fé, e
cada fechamento mediu de um lado:

- **P-03, na worktree:** o container `app` de `../fix-frontend` recebe do compose
  `APP_URL=http://localhost:8082`, `FRONTEND_URL=http://localhost:5175`,
  `SANCTUM_STATEFUL_DOMAINS=localhost:5175,localhost:8082` e `SESSION_COOKIE=lotus_session_8082` —
  medido com `docker compose exec -T app printenv` —, com o `backend/.env` da árvore ainda no offset
  antigo: a injeção vence, que é o mecanismo que a ficha declarou pago, e o login pelo navegador em
  `:5175` contra a API em `:8082` funciona com o arquivo como está.
- **P-03, no main tree:** o offset vive em `.env.example` e nas seis variáveis `LOTUS_DEV_*` do
  `docker-compose.yml`; a stack do fechamento do item 4 subiu no offset zero (`:8080`/`:3307`).
- **P-15:** o certificado do aluno está exposto no detalhe por `StudentTurmaData::$certificate`
  (`backend/app/Domains/Identity/Data/StudentTurmaData.php:36`), e o ramo recusado por escrito
  (coluna `CERTIFICADOS` na listagem de alunos) continua declarado na §9 da spec do
  `certificacao-historico-do-aluno` — que é o que impede a pendência de reabrir por silêncio.

**Saíram no fechamento do `frontend-revisao-ui-por-modulo` (2026-08-24), o primeiro posterior aos
dos blocos que as encerraram:** a **P-47** (os 7 redatores do seed sem a role `redator`, fechada em
2026-08-23 pela migration de backfill `2026_08_22_000003_backfill_redator_role` e **remedida aqui**
contra o MySQL de dev: os 7 do seed e os 2 usuários de gate e2e carregam a role) e a **P-50** (a
suíte unida acima do `memory_limit` de 128M, fechada em 2026-08-22 e também remedida aqui — o
`docker compose exec -T app php artisan test` do `CLAUDE.md` §6 terminou, 906 passed / 5 skipped).

**A P-41 saiu neste fechamento (`tabelas-coluna-de-acoes-e-largura`, 2026-08-24), o primeiro
posterior ao do bloco que a encerrou** — e foi **remedida antes de sair**, não removida na fé: o
`min-w-0` do bloco de texto está em `frontend/src/shared/ui/IdentityCell/IdentityCell.tsx:74`. A
metade não paga do gatilho continua declarada onde ela vive: `IdentityCell.test.tsx` conta
`span.truncate` e não mede `scrollWidth > clientWidth` — trabalho do `frontend-hardening-final`,
**pago em 2026-08-27**: o teste guarda o par `truncate` + `min-w-0` (`e560df27`) e a medida real de
`scrollWidth > clientWidth`, que jsdom não faz, ficou no navegador (DoD 5 do audit do bloco, com
sonda negativa).

## Rastro anterior, já removido

**A P-69, a P-68, a P-70, a P-30 e a P-42 saíram no fechamento do `frontend-arrumacao-de-testes`
(2026-09-04)**, o primeiro posterior ao do `frontend-dividas-de-mecanismo` (item 25), que as
encerrou em 2026-09-03 — e nenhuma saiu na fé: a **P-69** fechou no `setupFiles` com `cleanup()`
global mais as catracas `CLEANUP_A_MAO` e a guarda estática do `desmonte-global.test.ts`; a
**P-70**, na allowlist `DETALHE_LOCALIZADO` de 403/404/429 do `screenDetail`; a **P-30**, no
`warning` alinhado ao amarelo do `AppTag`, com régua de contraste própria (a borda que ela abriu
vive na **P-74**); a **P-68** e a **P-42**, por decisão escrita — a razão da assimetria de
`max-lines` ao lado da régua e a emenda datada ao D1 da spec arquivada da célula de identidade, as
duas sem tocar código. O rastro durável está nos commits e nas linhas de entrega em
[`../historico/progress.md`](../historico/progress.md).

**A P-73 e a P-67 saíram no fechamento do `frontend-dividas-de-mecanismo` (2026-09-03)**, o primeiro
posterior aos dos blocos que as encerraram. A **P-73** fechou em 2026-09-02 na PR #93, por bump só
de lockfile (`browserslist` 4.28.4 → 4.28.8), com `pnpm audit` de volta a **0** e o `package.json`
intacto. A **P-67** fechou em 2026-09-01 no `frontend-decisoes-de-ui-pendentes`, por mecanismo — a
escala de raio saiu da rule para catraca. **O ID `P-73` está queimado:** a ficha que este bloco abriu
nasceu numerada `P-73` por engano e foi renumerada para `P-74` no próprio fechamento, pelo mesmo
precedente de sempre — ID publicado não se reusa. O rastro durável das duas está nos commits e nas
linhas de entrega em [`../historico/progress.md`](../historico/progress.md).

**A P-61 e a P-63 saíram no fechamento do `frontend-decisoes-de-ui-pendentes` (2026-09-01)**, o
primeiro posterior aos dos dois blocos que as encerraram em 2026-08-30. A **P-61** fechou no
`hardening-i18n-e-erros-api` por mecanismo — os sete `title` do `ProblemDetails::fromException` e o
`detail` mascarado do 500 saíram do código para `lang/<locale>/problem.php` nos três locales, com o
`LocaleParityTest` recusando chave que exista em um só, e a borda que ela não cobria (o 419) vive
nomeada na [P-72](./abertas.md). A **P-63** fechou no `frontend-triagem-dos-audits-do-item-18`,
também por mecanismo — a legenda do `AppLineChart` ganhou conteúdo próprio
(`shared/ui/AppLineChart/legend.tsx`, `<ul role="list">`) e o mini-reset deixou de tirar semântica
de lista renderizada por biblioteca, medido na run 5 (`audits/2026-08-29-item19-run5.md`): zero `ul`
sem `role` no Dashboard. O rastro durável das duas está nos commits e nas linhas de entrega em
[`../historico/progress.md`](../historico/progress.md).


**Saíram no fechamento do `hardening-acesso-ownership-e-integridade` (2026-08-23), o primeiro
posterior ao do BD-15, que é a condição que as seis linhas pediam:** a **P-18** (página de
fechamento do Notion com `Sprint` divergente), a **P-20** (`openspout/openspout` sem ADR hospedeiro,
que virou o ADR-20), a **P-21** (`simple-qrcode` sem nota no ADR-12, que virou a nota de
2026-08-22), a **P-23** (a coluna `Contexto` do `progress.md`, declarada e não restaurada), a
**P-39** (o plano do BD-6 sobre o RBAC de `GET /api/courses`, que virou a lição 18) e a **P-43**
(`der-fisico.md` chamando `certificates` de "planejada", fechada pelas duas lanes em paralelo, e
cuja lacuna remanescente virou a [P-52](./abertas.md#p-52)).

A **P-40** (o ramo "catálogo genuinamente vazio" do BD-6 medido em `d20bebc`, não remedido contra
HEAD) foi encerrada em 2026-08-22, no `bd12-load-state-e-listas`, e saiu no fechamento do
`feedbacks-resolver-escopo` e no do `BD-15-docs-guardrails-e-sincronizacao` (2026-08-22) — os
primeiros **posteriores** ao do BD-12, que é o que a linha do índice pedia. A **P-29** (corrida de
unicidade entre transações subindo 500) e a **P-35** (o ADR-17 defendido em duas profundidades)
foram encerradas em 2026-08-20, no `bd14-contrato-de-entrada`, e saíram no fechamento do
`bd12-load-state-e-listas` (2026-08-22) — o primeiro **posterior** ao do BD-14, que é o que a linha
do índice pedia. A **P-36** (catraca `COR_HARDCODED` cega para `style={{ }}`) e a **P-37**
(`FormField` sem `htmlFor`) foram encerradas em 2026-08-18 e saíram no fechamento do
`bd13-listagens-e-abas`. A **P-45** (o `TestCase` lendo `FRONTEND_URL` cru) saiu no fechamento do
`arquivados-roots-restantes` (2026-08-19). O rastro durável de todas está nos commits (`8ffdefa`,
`efd5bfe`, `0672019`, `2ad35d7` e `6fd0ad8`) e nas linhas de entrega em
[`../historico/progress.md`](../historico/progress.md).
