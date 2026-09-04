# Medições — item 26 (`backend-envelope-de-erro-e-recusa-de-dominio`)

> Task 7 do plano `docs/superpowers/plans/2026-09-02-backend-envelope-de-erro-e-recusa-de-dominio.md`.
> Medido contra o container `app` de pé, banco de dev existente (nenhum dado mutado — ver §5).

## 1. Suíte inteira

```
docker compose exec -T app php artisan test
```

**1172 passed / 5 skipped (9056 assertions)**, `Duration: 83.86s`.

O plano registrou a `main` em 1162 passed / 5 skipped. Diferença: **+10**, exatamente a soma dos
testes novos das seis tasks de implementação — Task 1 (+1, `EnvelopeLocalizadoTest`), Task 2 (+3,
`MensagemDeOperacaoLocalizadaTest`), Task 3 (+1, `EventosDeAcessoTest`), Task 4 (+3,
`RecusaDeDominioTest`), Task 5 (+1, `PublicCertificateTest`), Task 6 (+1, `EnvelopeLocalizadoTest`).
Nenhum teste quebrou, nenhum ficou a mais nem a menos do esperado.

## 2. Nenhum teste de endpoint existente foi editado

```
git diff --stat main...HEAD -- backend/tests/Feature
```

```
 .../Certification/CertificateListingTest.php       | 10 ++-
 .../MensagemDeCertificadoLocalizadaTest.php        |  6 +-
 .../Certification/PublicCertificateTest.php        | 30 ++++++++
 .../Operation/MensagemDeOperacaoLocalizadaTest.php | 75 ++++++++++++++++++
 .../Feature/Shared/EnvelopeLocalizadoTest.php      | 88 ++++++++++++++++++++++
 .../tests/Feature/Shared/EventosDeAcessoTest.php   | 28 +++++++
 6 files changed, 234 insertions(+), 3 deletions(-)
```

Exatamente os seis arquivos que o plano autoriza (§ "Esperado" da Task 7 Step 2): as duas asserções
de `CertificateListingTest.php` (§4 da spec), os testes novos de `PublicCertificateTest.php`,
`MensagemDeOperacaoLocalizadaTest.php` e `EventosDeAcessoTest.php`, a chave nova em
`MensagemDeCertificadoLocalizadaTest.php`, e os dois testes novos de `EnvelopeLocalizadoTest.php`
(Tasks 1 e 6). Nenhum outro arquivo de `Feature/` no diff.

## 3. `generated.ts` e Pint

```
docker compose exec -T app php artisan typescript:transform
git diff --stat -- frontend/src/shared/types/generated.ts
```

Diff **vazio** — nenhum DTO mudou, como o plano previa (nenhuma task deste bloco toca `spatie/laravel-data`).

**Pint**, escopo exato dos arquivos que este bloco tocou (nove arquivos de `app/`, os três locales
completos em `lang/`, e os oito arquivos de teste que a §2 lista):

```
{"tool":"pint","result":"passed"}
```

**Nota de medição:** o comando literal do Step 3 do plano (`pint --test app/Shared
app/Domains/Operation/Exceptions app/Domains/Identity/Exceptions app/Domains/Certification/Exceptions
lang tests`) passa `tests` como o diretório INTEIRO, não só os arquivos que este bloco tocou. Rodado
assim, ele reprova em 5 arquivos alheios a este bloco (`RedatorModelTest.php`, `FileModelTest.php`,
`ClientDataValidationTest.php`, `AuthTest.php`, `RbacAuthTest.php` — todos em
`Cadastros`/`Identity`, regra `binary_operator_spaces`). Confirmado por
`git diff --stat main...HEAD` nesses cinco arquivos: **diff vazio** — nenhum deles foi tocado por
nenhuma das seis tasks. É dívida pré-existente da `main`, não introduzida por este bloco. O escopo
acima (Pint nos arquivos que o bloco de fato tocou) é o que a Global Constraint do plano pede
("Pint nos arquivos tocados") e o que decide o DoD.

## 4. Catraca da Task 4 — vista reprovar por sonda, depois passar

Sonda real (Task 4, Step 3): `TurmaConfiguracaoException.php` copiado para o scratchpad, editado
para voltar a `extends HttpException` com `422` literal no corpo.

```
FAILED Tests\Unit\Shared\RecusaDeDominioTest > nenhuma_excecao_de_dominio_estende_http_exception
Exceção de domínio estendendo HttpException:
TurmaConfiguracaoException.php

FAILED Tests\Unit\Shared\RecusaDeDominioTest > nenhuma_excecao_de_dominio_escreve_status_http
Status HTTP escrito dentro do domínio:
TurmaConfiguracaoException.php  422
```

Restaurado por `cp` do scratchpad (nunca `git stash`):

```
git diff backend/app/Domains/Operation/Exceptions/TurmaConfiguracaoException.php
(sem saída — arquivo byte-idêntico ao commitado)
```

```
Tests: 3 passed (6 assertions)
```

## 5. O 419 contra a API real, três locales

Autenticação: `POST /sanctum/csrf-cookie` com `Referer: http://localhost:8080/` (domínio stateful
do runtime — ver nota abaixo), depois `PUT /api/turmas/3` com `X-XSRF-TOKEN: invalido`.

**es-CL:**
```json
{"type":"https:\/\/lotus.cl\/errors\/http","title":"Error en la solicitud","status":419,"detail":"Tu sesión expiró o el formulario perdió validez. Recarga la página e inténtalo de nuevo.","instance":"\/api\/turmas\/3"}
```

**pt-BR:**
```json
{"type":"https:\/\/lotus.cl\/errors\/http","title":"Erro na requisição","status":419,"detail":"Sua sessão expirou ou o formulário perdeu validade. Recarregue a página e tente de novo.","instance":"\/api\/turmas\/3"}
```

**en:**
```json
{"type":"https:\/\/lotus.cl\/errors\/http","title":"Request error","status":419,"detail":"Your session expired or the form is no longer valid. Reload the page and try again.","instance":"\/api\/turmas\/3"}
```

Três frases distintas, nenhuma `CSRF token mismatch.` — o defeito da `P-72` medido fechado.

**Nota de medição, fora do escopo deste bloco:** `config('sanctum.stateful')` no runtime deste
ambiente resolve para `['localhost:5174', 'localhost:8080']` — **sem `localhost:5173`**, apesar de
`backend/.env` declarar `SANCTUM_STATEFUL_DOMAINS=localhost:5173,localhost:5174,localhost:8080`. A
primeira tentativa da sonda, com `Referer: http://localhost:5173/` (a porta padrão do Vite dev
server no `CLAUDE.md`), caiu no braço de `auth:sanctum` (401) em vez do CSRF (419), porque
`EnsureFrontendRequestsAreStateful::fromFrontend()` não reconheceu a origem — confirmado por
`Str::is()` contra a lista real via tinker. Repetido com `Referer: http://localhost:8080/`
(presente na lista), o 419 apareceu como esperado. Isto não é um defeito deste bloco — a medição
não toca `config/sanctum.php` nem `.env` — mas é uma divergência de ambiente que vale registrar:
alguém testando o CSRF a partir do Vite real (`localhost:5173`) hoje cairia no mesmo 401 em vez do
419 esperado.

> **Emenda de 2026-09-03 (review, Q-4):** esta nota virou ficha — **`P-75`** em
> `pendencias/abertas.md`, com linha no índice. Divergência medida que fica só em audit datado
> ninguém relê; o que a `auditar-docs` e o próximo bloco leem é a ficha.

## 6. A recusa 422 e a 403 contra a API real

Sessão autenticada como `admin@lotus.cl` (seed de dev, `local`/`demo`, role `superadmin`) via
`POST /api/login`.

**422 — `POST /api/quotes/2/turma`** (cotação id 2, status `rejected`, sem turma; payload válido
para passar a validação do DTO — `modalidade`/`start_date`/`end_date` — e alcançar o gate de
domínio), locale `es-CL`:

```json
{"type":"https:\/\/lotus.cl\/errors\/http","title":"Error en la solicitud","status":422,"detail":"La cotización debe estar aprobada para configurar la clase.","instance":"\/api\/quotes\/2\/turma"}
```

`detail` bate exato com `operation.turma.quote_not_approved` em `es_CL`.

**403 — `POST /api/profile/documents`** como o mesmo admin (sem perfil de redator), locale `es-CL`:

```json
{"type":"https:\/\/lotus.cl\/errors\/forbidden","title":"Acceso denegado","status":403,"detail":"Solo los redactores envían documentación profesional.","instance":"\/api\/profile\/documents"}
```

`detail` bate exato com `identity.errors.redator_only_action` em `es_CL`.

> **Emenda de 2026-09-03 (review, Q-5):** a frase acima foi medida antes de o es_CL alinhar
> `redactor` → `relator`. O valor da chave hoje é `Solo los relatores envían documentación
> profesional.` A medição continua válida no que ela provava — o `detail` sai da chave, e não de
> literal —, e o texto citado é o de 2026-09-02.

## 7. Banco de dev — nada para devolver

A tentativa de 422 rodou dentro da transação de `CreateTurmaAction::execute()`: a exceção de
domínio dispara **antes** do `Turma::create()`, então a transação nunca chega a gravar — confirmado
por tinker (`Quote::find(2)->turma()->exists()` → `false` depois da chamada). A tentativa de 403
nunca alcança escrita nenhuma (a recusa nasce antes de qualquer ação). O login grava uma linha de
`login_logs` (efeito colateral normal e esperado de qualquer login real, não deste bloco). Nenhum
dado de dev precisou ser revertido.

## 8. Resumo — DoD da spec §7

| Critério | Resultado |
|---|---|
| `P-71` (cinco sítios em `lang/`) | Fechada — Tasks 2 e 5 |
| `P-72` (419 localizado) | Fechada — Task 6, medida contra API real acima (§5) |
| `P-60` (veredito: segue 500) | Fechada por decisão escrita (D4) + teste (Task 5) |
| `DEBITO_CONHECIDO` cinco linhas menor | Confirmado nos diffs das Tasks 2, 4 e 5 |
| `LocaleParityTest` e `MensagemLiteralTest` verdes | Confirmado em cada task e na suíte inteira |
| Três catracas da §6 da spec vistas reprovar por sonda | Task 3 (comportamental, PASS→FAIL→PASS) e Task 4 (estática, §4 acima) |
| `php artisan test` inteiro verde, sem edição em teste de endpoint | §1 e §2 acima |
| Pint nos arquivos tocados; `generated.ts` diff vazio | §3 acima |

---

## 9. Remedição no `/fechar-sprint` de 2026-09-03

As §5 e §6 foram medidas em **2026-09-02**, antes do review. Duas correções mudaram comportamento
depois disso — o **Q-1** (recusa de domínio parou de ir ao log) e o **Q-5** (`redactor` → `relator`
em es_CL) —, então o critério de aceite foi **medido de novo** contra a API real no fechamento.
Sessão autenticada como `admin@lotus.cl` via `POST /api/login`, `Referer: http://localhost:8080/`.

**419, os três locales** (`PUT /api/turmas/3`, `X-XSRF-TOKEN: invalido`):

```
es-CL  419 | Error en la solicitud | Tu sesión expiró o el formulario perdió validez. Recarga la página e inténtalo de nuevo.
pt-BR  419 | Erro na requisição    | Sua sessão expirou ou o formulário perdeu validade. Recarregue a página e tente de novo.
en     419 | Request error         | Your session expired or the form is no longer valid. Reload the page and try again.
```

**403 com o texto do Q-5** (`POST /api/profile/documents`, `Accept-Language: es-CL`):

```json
{"type":"https://lotus.cl/errors/forbidden","title":"Acceso denegado","status":403,"detail":"Solo los relatores envían documentación profesional.","instance":"/api/profile/documents"}
```

**422 de recusa de domínio** (`POST /api/quotes/2/turma`, cotação `rejected`, payload completo —
`local_aplicacao` é obrigatório para `presencial`, senão a validação do DTO responde antes do gate):

```json
{"type":"https://lotus.cl/errors/http","title":"Error en la solicitud","status":422,"detail":"La cotización debe estar aprobada para configurar la clase.","instance":"/api/quotes/2/turma"}
```

**A prova do Q-1, que é a que não existia:** `storage/logs/laravel.log` foi zerado antes das duas
chamadas acima. Depois delas:

```
grep -c "local.ERROR" storage/logs/laravel.log  →  0
wc -l < storage/logs/laravel.log                →  0
```

**Zero linhas** — nem `error`, nem stack trace, nem sinal duplicado no 403. Antes do
`dontReport(RecusaDeDominio::class)` cada uma dessas duas chamadas gravava um `error` com trace.

## 10. O `pint lang/` acidental, revertido no fechamento

O **Q-3** do review nomeou o acidente e escreveu a rule (`.claude/rules/backend-lang.md`), mas a
reformatação seguia na branch. Medida e revertida aqui:

```
git diff --stat  main...HEAD -- backend/lang/   →  27 arquivos, 1383 inserções, 1353 remoções
git diff -w --stat main...HEAD -- backend/lang/ →   9 arquivos,   30 inserções
```

Os **18** arquivos com diff `-w` vazio (`actions`, `auth`, `http-statuses`, `pagination`,
`passwords`, `validation` × três locales) voltaram ao conteúdo da `main` com `git checkout main --`.
Depois da reversão o bloco toca **10 arquivos de `lang/`, 58 linhas** — todas semânticas. Suíte
reconferida depois da reversão: `LocaleParity`, `MensagemLiteral`, `RecusaDeDominio`,
`EnvelopeLocalizado`, `RecusaNaoVaiAoLog`, `MensagemDeCertificadoLocalizada`,
`MensagemDeOperacaoLocalizada` e `ValidationMessages` — **24 passed**.

## 11. Gate do fechamento

| Item | Resultado |
|---|---|
| Suíte backend | **1175 passed / 5 skipped** (a `main` mede 1162 / 5) |
| `pnpm lint` | 0 achados |
| `pnpm build` | verde (`tsc -b && vite build`) |
| Pint nos arquivos do bloco | `{"tool":"pint","result":"passed"}` |
| `generated.ts` | diff **vazio** depois de `typescript:transform` |
| Critério de aceite contra a API real | §9 acima |
